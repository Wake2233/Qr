/**
 * Auto-finance math. Money is integer cents and APR is basis points (650 = 6.50%).
 * Results are rounded to the nearest cent, so they match lender quotes within ±1 cent.
 */
import { Constants, type Enums } from '@cp/types';

export type CreditTier = Enums<'credit_tier'>;
export type AprByTier = Record<CreditTier, number>;

export const CREDIT_TIERS = Constants.public.Enums.credit_tier;

/** Loan terms offered by the calculators, in months. */
export const TERM_OPTIONS = [24, 36, 48, 60, 72, 84] as const;

/** Fallback when `site_settings.apr_by_tier` is missing a tier. */
export const DEFAULT_APR_BY_TIER: AprByTier = {
  excellent: 650,
  good: 900,
  fair: 1350,
  rebuilding: 1900,
};

function assertCents(name: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be non-negative integer cents, received ${value}`);
  }
}

function assertLoanTerms(aprBps: number, termMonths: number) {
  if (!Number.isInteger(aprBps) || aprBps < 0) {
    throw new RangeError(`aprBps must be a non-negative integer, received ${aprBps}`);
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError(`termMonths must be a positive integer, received ${termMonths}`);
  }
}

const monthlyRate = (aprBps: number) => aprBps / 10_000 / 12;

/** Present-value annuity factor: principal = payment × factor. */
function annuityFactor(aprBps: number, termMonths: number) {
  const r = monthlyRate(aprBps);
  return r === 0 ? termMonths : (1 - (1 + r) ** -termMonths) / r;
}

export interface LoanTerms {
  principalCents: number;
  aprBps: number;
  termMonths: number;
}

/** Fixed monthly payment for a fully amortizing loan. */
export function monthlyPaymentCents({ principalCents, aprBps, termMonths }: LoanTerms): number {
  assertCents('principalCents', principalCents);
  assertLoanTerms(aprBps, termMonths);
  if (principalCents === 0) return 0;
  return Math.round(principalCents / annuityFactor(aprBps, termMonths));
}

/** Total interest paid over the loan, using the rounded monthly payment. */
export function totalInterestCents(terms: LoanTerms): number {
  return Math.max(0, monthlyPaymentCents(terms) * terms.termMonths - terms.principalCents);
}

export interface PurchaseCosts {
  priceCents: number;
  downPaymentCents?: number;
  tradeInCents?: number;
  /** Sales tax in basis points (NJ 6.625% = 663). Applied after the trade-in credit. */
  taxRateBps?: number;
  /** Doc, registration and title fees. */
  feesCents?: number;
}

/** Amount to finance: price + tax + fees − down payment − trade-in (never negative). */
export function amountFinancedCents({
  priceCents,
  downPaymentCents = 0,
  tradeInCents = 0,
  taxRateBps = 0,
  feesCents = 0,
}: PurchaseCosts): number {
  for (const [name, value] of Object.entries({
    priceCents,
    downPaymentCents,
    tradeInCents,
    taxRateBps,
    feesCents,
  })) {
    assertCents(name, value);
  }
  const taxCents = Math.round((Math.max(priceCents - tradeInCents, 0) * taxRateBps) / 10_000);
  return Math.max(0, priceCents + taxCents + feesCents - downPaymentCents - tradeInCents);
}

export interface PaymentEstimate {
  amountFinancedCents: number;
  monthlyPaymentCents: number;
  totalInterestCents: number;
  totalCostCents: number;
}

/** One-call estimate for the VDP calculator and the financing hub. */
export function estimatePayment(
  costs: PurchaseCosts & { aprBps: number; termMonths: number },
): PaymentEstimate {
  const principalCents = amountFinancedCents(costs);
  const terms = { principalCents, aprBps: costs.aprBps, termMonths: costs.termMonths };
  const payment = monthlyPaymentCents(terms);
  const interest = totalInterestCents(terms);
  return {
    amountFinancedCents: principalCents,
    monthlyPaymentCents: payment,
    totalInterestCents: interest,
    totalCostCents: principalCents + interest + (costs.downPaymentCents ?? 0),
  };
}

export interface BudgetInput {
  monthlyBudgetCents: number;
  aprBps: number;
  termMonths: number;
  downPaymentCents?: number;
  tradeInCents?: number;
  taxRateBps?: number;
  feesCents?: number;
}

/**
 * Affordability: the highest vehicle price whose payment fits the monthly budget.
 * Inverts `amountFinancedCents`, rounding down so the result never exceeds the budget.
 */
export function maxVehiclePriceCents({
  monthlyBudgetCents,
  aprBps,
  termMonths,
  downPaymentCents = 0,
  tradeInCents = 0,
  taxRateBps = 0,
  feesCents = 0,
}: BudgetInput): number {
  assertCents('monthlyBudgetCents', monthlyBudgetCents);
  assertLoanTerms(aprBps, termMonths);
  const principal = Math.floor(monthlyBudgetCents * annuityFactor(aprBps, termMonths));
  const t = taxRateBps / 10_000;
  const price = Math.floor(
    (principal + downPaymentCents + tradeInCents * (1 + t) - feesCents) / (1 + t),
  );
  return Math.max(0, price);
}

/** APR for a credit tier, falling back to platform defaults for missing tiers. */
export function aprForTier(tier: CreditTier, table: Partial<AprByTier> = {}): number {
  return table[tier] ?? DEFAULT_APR_BY_TIER[tier];
}

/** Starting assumptions for the VDP payment estimate (the buyer can change all of them). */
export const ESTIMATE_DEFAULTS = {
  termMonths: 72,
  creditTier: 'good',
  downPaymentPct: 10,
} as const satisfies { termMonths: number; creditTier: CreditTier; downPaymentPct: number };

/** Suggested down payment: a percentage of the price, rounded down to whole $100s. */
export function suggestedDownPaymentCents(
  priceCents: number,
  pct: number = ESTIMATE_DEFAULTS.downPaymentPct,
): number {
  assertCents('priceCents', priceCents);
  return Math.floor((priceCents * pct) / 100 / 10_000) * 10_000;
}
