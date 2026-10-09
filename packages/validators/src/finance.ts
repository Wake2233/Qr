import { Constants } from '@cp/types';
import { z } from 'zod';

import { emailSchema } from './auth';
import { phoneE164 } from './phone';
import { cents, positiveCents, requiredText, uuid } from './shared';

const E = Constants.public.Enums;

/** Version of the consent copy shown to applicants; stored with each application. */
export const FINANCE_CONSENT_VERSION = '2026-10-01';

export const EMPLOYMENT_STATUSES = [
  'employed',
  'self_employed',
  'retired',
  'student',
  'other',
] as const;

/** Step 1 — vehicle and amount. */
export const financeVehicleStepSchema = z.object({
  vehicle_id: uuid.nullish(),
  requested_amount_cents: positiveCents,
  down_payment_cents: cents.default(0),
  trade_in_value_cents: cents.default(0),
  term_months: z.number().int().min(12).max(96),
});

/** Step 2 — contact details. */
export const financeContactStepSchema = z.object({
  first_name: requiredText(1, 80, 'Enter your first name'),
  last_name: requiredText(1, 80, 'Enter your last name'),
  email: emailSchema,
  phone_e164: phoneE164,
  postal_code: z
    .string()
    .trim()
    .regex(
      /^\d{5}(-\d{4})?$|^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      'Enter a valid ZIP or postal code',
    ),
});

/** Step 3 — income, housing and self-reported credit. No SSN or date of birth, ever. */
export const financeIncomeStepSchema = z.object({
  employment_status: z.enum(EMPLOYMENT_STATUSES),
  monthly_income_cents: cents,
  housing_payment_cents: cents,
  credit_tier: z.enum(E.credit_tier),
});

/** Step 4 — consent to a simulated pre-qualification (not a credit decision). */
export const financeConsentStepSchema = z.object({
  consent: z.literal(true, 'Please confirm to continue'),
  consent_text_version: z.literal(FINANCE_CONSENT_VERSION),
});

/** Full input for the `submit_finance_application` RPC. */
export const financeApplicationSchema = financeVehicleStepSchema
  .extend(financeContactStepSchema.shape)
  .extend(financeIncomeStepSchema.shape)
  .extend(financeConsentStepSchema.shape)
  .strict();

export type FinanceApplicationInput = z.input<typeof financeApplicationSchema>;
export type FinanceApplication = z.output<typeof financeApplicationSchema>;
