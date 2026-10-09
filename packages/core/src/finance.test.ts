import { describe, expect, it } from 'vitest';

import {
  amountFinancedCents,
  aprForTier,
  DEFAULT_APR_BY_TIER,
  ESTIMATE_DEFAULTS,
  estimatePayment,
  maxVehiclePriceCents,
  monthlyPaymentCents,
  suggestedDownPaymentCents,
  TERM_OPTIONS,
  totalInterestCents,
} from './finance';

describe('monthlyPaymentCents', () => {
  // Reference values computed independently with 40-digit Decimal arithmetic.
  it.each([
    [3_000_000, 650, 60, 58_698],
    [2_500_000, 499, 72, 40_251],
    [4_000_000, 900, 48, 99_540],
    [1_500_000, 1900, 36, 54_984],
    [1_000_000, 0, 50, 20_000],
  ])('%i cents at %i bps over %i months → %i', (principalCents, aprBps, termMonths, expected) => {
    expect(
      Math.abs(monthlyPaymentCents({ principalCents, aprBps, termMonths }) - expected),
    ).toBeLessThanOrEqual(1);
  });

  it('is zero for a zero principal', () => {
    expect(monthlyPaymentCents({ principalCents: 0, aprBps: 650, termMonths: 60 })).toBe(0);
  });

  it.each([
    { principalCents: -1, aprBps: 650, termMonths: 60 },
    { principalCents: 10.5, aprBps: 650, termMonths: 60 },
    { principalCents: 100, aprBps: -5, termMonths: 60 },
    { principalCents: 100, aprBps: 6.5, termMonths: 60 },
    { principalCents: 100, aprBps: 650, termMonths: 0 },
  ])('rejects invalid input %o', (terms) => {
    expect(() => monthlyPaymentCents(terms)).toThrow(RangeError);
  });
});

describe('totalInterestCents', () => {
  it('is payment × term minus principal', () => {
    const terms = { principalCents: 3_000_000, aprBps: 650, termMonths: 60 };
    expect(totalInterestCents(terms)).toBe(monthlyPaymentCents(terms) * 60 - 3_000_000);
  });

  it('is zero at 0% APR', () => {
    expect(totalInterestCents({ principalCents: 1_200_000, aprBps: 0, termMonths: 24 })).toBe(0);
  });
});

describe('amountFinancedCents', () => {
  it('applies tax after the trade-in credit, then fees, down payment and trade-in', () => {
    // price 30,000 − trade 5,000 = 25,000 taxable × 6.625% = 1,656.25 tax
    expect(
      amountFinancedCents({
        priceCents: 3_000_000,
        tradeInCents: 500_000,
        downPaymentCents: 300_000,
        taxRateBps: 663, // 6.63%
        feesCents: 50_000,
      }),
    ).toBe(3_000_000 + 165_750 + 50_000 - 300_000 - 500_000);
  });

  it('never goes negative', () => {
    expect(amountFinancedCents({ priceCents: 1_000_000, downPaymentCents: 2_000_000 })).toBe(0);
  });

  it('rejects fractional cents', () => {
    expect(() => amountFinancedCents({ priceCents: 1.5 })).toThrow(RangeError);
  });
});

describe('estimatePayment', () => {
  it('combines financed amount, payment and totals', () => {
    const estimate = estimatePayment({
      priceCents: 3_300_000,
      downPaymentCents: 300_000,
      aprBps: 650,
      termMonths: 60,
    });
    expect(estimate.amountFinancedCents).toBe(3_000_000);
    expect(estimate.monthlyPaymentCents).toBe(58_698);
    expect(estimate.totalCostCents).toBe(3_000_000 + estimate.totalInterestCents + 300_000);
  });
});

describe('maxVehiclePriceCents', () => {
  it('inverts the payment formula', () => {
    const price = maxVehiclePriceCents({ monthlyBudgetCents: 58_698, aprBps: 650, termMonths: 60 });
    expect(Math.abs(price - 3_000_000)).toBeLessThanOrEqual(100);
    expect(
      monthlyPaymentCents({ principalCents: price, aprBps: 650, termMonths: 60 }),
    ).toBeLessThanOrEqual(58_698);
  });

  it('accounts for down payment, trade-in, tax and fees without exceeding the budget', () => {
    const input = {
      monthlyBudgetCents: 50_000,
      aprBps: 900,
      termMonths: 72,
      downPaymentCents: 200_000,
      tradeInCents: 400_000,
      taxRateBps: 663,
      feesCents: 60_000,
    };
    const price = maxVehiclePriceCents(input);
    const financed = amountFinancedCents({ priceCents: price, ...input });
    expect(
      monthlyPaymentCents({ principalCents: financed, aprBps: 900, termMonths: 72 }),
    ).toBeLessThanOrEqual(50_000);
    const oneDollarMore = amountFinancedCents({ priceCents: price + 200, ...input });
    expect(
      monthlyPaymentCents({ principalCents: oneDollarMore, aprBps: 900, termMonths: 72 }),
    ).toBeGreaterThanOrEqual(50_000);
  });

  it('handles 0% APR and never returns a negative price', () => {
    expect(maxVehiclePriceCents({ monthlyBudgetCents: 50_000, aprBps: 0, termMonths: 24 })).toBe(
      1_200_000,
    );
    expect(
      maxVehiclePriceCents({
        monthlyBudgetCents: 0,
        aprBps: 650,
        termMonths: 60,
        feesCents: 10_000,
      }),
    ).toBe(0);
  });
});

describe('aprForTier', () => {
  it('prefers the site table and falls back to defaults', () => {
    expect(aprForTier('good', { good: 799 })).toBe(799);
    expect(aprForTier('fair', { good: 799 })).toBe(DEFAULT_APR_BY_TIER.fair);
    expect(aprForTier('excellent')).toBe(650);
  });
});

describe('suggestedDownPaymentCents', () => {
  it('takes 10% by default, rounded down to whole $100s', () => {
    expect(suggestedDownPaymentCents(4_599_000)).toBe(450_000);
    expect(suggestedDownPaymentCents(999_900, 20)).toBe(190_000);
    expect(suggestedDownPaymentCents(0)).toBe(0);
  });

  it('rejects non-cent prices', () => {
    expect(() => suggestedDownPaymentCents(10.5)).toThrow(RangeError);
  });

  it('defaults to a term the calculator offers', () => {
    expect(TERM_OPTIONS).toContain(ESTIMATE_DEFAULTS.termMonths);
  });
});
