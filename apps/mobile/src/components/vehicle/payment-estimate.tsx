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
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { useAppTheme } from '@/lib/theme';

/** Simulated monthly estimate (admin APR table; excludes taxes/fees; not a credit decision). */
export function PaymentEstimate({
  priceCents,
  aprByTier,
}: {
  priceCents: number;
  aprByTier: Partial<AprByTier>;
}) {
  const { native } = useAppTheme();
  const [down, setDown] = useState(() => centsToDollarInput(suggestedDownPaymentCents(priceCents)));
  const [termMonths, setTermMonths] = useState<number>(ESTIMATE_DEFAULTS.termMonths);
  const [tier, setTier] = useState<CreditTier>(ESTIMATE_DEFAULTS.creditTier);
  const downPaymentCents = Math.min(Math.max(parseDollarsToCents(down) ?? 0, 0), priceCents);
  const aprBps = aprForTier(tier, aprByTier);
  const estimate = estimatePayment({ priceCents, downPaymentCents, aprBps, termMonths });

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-baseline justify-between">
        <Text variant="heading" accessibilityRole="header">
          Estimate your payment
        </Text>
        <Text className="font-display-bold text-2xl" accessibilityLiveRegion="polite">
          {formatPrice(estimate.monthlyPaymentCents)}
          <Text variant="caption">/mo</Text>
        </Text>
      </View>
      <View className="gap-1.5">
        <Text variant="label">Down payment</Text>
        <View className="h-12 flex-row items-center rounded-xl border border-border px-3">
          <Text variant="muted">$</Text>
          <TextInput
            value={down}
            onChangeText={setDown}
            keyboardType="number-pad"
            accessibilityLabel="Down payment in dollars"
            className="flex-1 pl-1 font-sans text-base text-foreground"
            placeholderTextColor={native.muted}
          />
        </View>
      </View>
      <View className="gap-1.5">
        <Text variant="label">Term</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {TERM_OPTIONS.map((months) => (
            <Chip
              key={months}
              label={`${months} mo`}
              selected={termMonths === months}
              onPress={() => setTermMonths(months)}
              accessibilityLabel={`${months} months`}
            />
          ))}
        </ScrollView>
      </View>
      <View className="gap-1.5">
        <Text variant="label">Credit</Text>
        <View className="flex-row flex-wrap gap-2">
          {CREDIT_TIERS.map((t) => (
            <Chip key={t} label={creditTierLabels[t]} selected={tier === t} onPress={() => setTier(t)} />
          ))}
        </View>
      </View>
      <View className="gap-1">
        <Row label="Est. APR" value={formatApr(aprBps)} />
        <Row label="Amount financed" value={formatPrice(estimate.amountFinancedCents)} />
        <Row label="Total interest" value={formatPrice(estimate.totalInterestCents)} />
      </View>
      <Text variant="caption" className="text-xs leading-5">
        Simulated estimate for illustration only — not a credit decision or a loan offer. Excludes
        taxes, title and fees. Your actual rate depends on lender approval.
      </Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text variant="caption">{label}</Text>
      <Text className="font-sans-medium text-sm">{value}</Text>
    </View>
  );
}
