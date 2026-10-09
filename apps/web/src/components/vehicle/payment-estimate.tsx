'use client';

import {
  aprForTier,
  centsToDollarInput,
  CREDIT_TIERS,
  creditTierLabels,
  ESTIMATE_DEFAULTS,
  estimatePayment,
  formatApr,
  formatPrice,
  parseDollarsToCents,
  suggestedDownPaymentCents,
  TERM_OPTIONS,
  type AprByTier,
  type CreditTier,
} from '@cp/core';
import Link from 'next/link';
import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentEstimateProps {
  priceCents: number;
  aprByTier: Partial<AprByTier>;
}

/**
 * Inline monthly-payment estimate for the VDP. Simulated: uses the admin's APR-by-tier
 * table, excludes taxes and fees, and is not a credit decision.
 */
export function PaymentEstimate({ priceCents, aprByTier }: PaymentEstimateProps) {
  const id = useId();
  const [downInput, setDownInput] = useState(() =>
    centsToDollarInput(suggestedDownPaymentCents(priceCents)),
  );
  const [termMonths, setTermMonths] = useState<number>(ESTIMATE_DEFAULTS.termMonths);
  const [tier, setTier] = useState<CreditTier>(ESTIMATE_DEFAULTS.creditTier);

  const parsedDown = parseDollarsToCents(downInput);
  const downPaymentCents = Math.min(Math.max(parsedDown ?? 0, 0), priceCents);
  const aprBps = aprForTier(tier, aprByTier);
  const estimate = estimatePayment({ priceCents, downPaymentCents, aprBps, termMonths });

  return (
    <section aria-labelledby={`${id}-title`} className="bg-card space-y-4 rounded-2xl border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="font-semibold">
          Estimate your payment
        </h2>
        <p className="text-right" aria-live="polite">
          <span className="font-display text-2xl font-semibold tabular-nums">
            {formatPrice(estimate.monthlyPaymentCents)}
          </span>
          <span className="text-muted-foreground text-sm">/mo</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-down`}>Down payment</Label>
          <div className="relative">
            <span
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
              aria-hidden
            >
              $
            </span>
            <Input
              id={`${id}-down`}
              inputMode="numeric"
              value={downInput}
              onChange={(event) => setDownInput(event.target.value)}
              aria-invalid={parsedDown === null && downInput.trim() !== ''}
              className="pl-6 tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-term`}>Term</Label>
          <Select value={String(termMonths)} onValueChange={(v) => setTermMonths(Number(v))}>
            <SelectTrigger id={`${id}-term`} className="w-full">
              <SelectValue>{termMonths} months</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((months) => (
                <SelectItem key={months} value={String(months)}>
                  {months} months
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-tier`}>Credit</Label>
          <Select value={tier} onValueChange={(v) => setTier(v as CreditTier)}>
            <SelectTrigger id={`${id}-tier`} className="w-full">
              <SelectValue>{creditTierLabels[tier]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CREDIT_TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {creditTierLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt>Est. APR</dt>
        <dd className="text-foreground text-right tabular-nums">{formatApr(aprBps)}</dd>
        <dt>Amount financed</dt>
        <dd className="text-foreground text-right tabular-nums">
          {formatPrice(estimate.amountFinancedCents)}
        </dd>
        <dt>Total interest</dt>
        <dd className="text-foreground text-right tabular-nums">
          {formatPrice(estimate.totalInterestCents)}
        </dd>
      </dl>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Simulated estimate for illustration only — not a credit decision or a loan offer. Excludes
        taxes, title and fees. Your actual rate depends on lender approval.{' '}
        <Link href="/financing" className="text-primary underline underline-offset-2">
          Get pre-qualified
        </Link>
      </p>
    </section>
  );
}
