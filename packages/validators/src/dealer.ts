import { Constants } from '@cp/types';
import { z } from 'zod';

import { emailSchema } from './auth';
import { phoneE164 } from './phone';
import { businessHoursSchema } from './settings';
import { optionalText, requiredText, uuid } from './shared';

const website = z
  .string()
  .trim()
  .max(300)
  .transform((value) =>
    value && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? `https://${value}` : value,
  )
  .pipe(z.union([z.url({ protocol: /^https?$/ }), z.literal('')]))
  .transform((value) => value || null);

/** Input for the `apply_as_dealer` RPC ("Sell with us"). */
export const dealerApplicationSchema = z.object({
  display_name: requiredText(2, 120, 'Enter your dealership name'),
  legal_name: optionalText(200),
  phone_e164: phoneE164,
  whatsapp_e164: phoneE164,
  email: emailSchema,
  website: website.nullish().transform((value) => value ?? null),
  address_line1: requiredText(1, 200, 'Enter the street address'),
  city: requiredText(1, 100, 'Enter the city'),
  state: requiredText(2, 50, 'Enter the state'),
  postal_code: requiredText(3, 20, 'Enter the ZIP code'),
  description: optionalText(4000),
  license_number: requiredText(1, 100, 'Enter your dealer license number'),
});

export type DealerApplicationInput = z.input<typeof dealerApplicationSchema>;
export type DealerApplication = z.output<typeof dealerApplicationSchema>;

/** Dealer profile edits by owners/managers (status and approval columns are not updatable). */
export const dealerProfileSchema = dealerApplicationSchema
  .omit({ license_number: true })
  .extend({ business_hours: businessHoursSchema.default({}) });

export type DealerProfileInput = z.input<typeof dealerProfileSchema>;
export type DealerProfile = z.output<typeof dealerProfileSchema>;

/** Add an existing account to a dealer's team (`add_dealer_member`). */
export const teamMemberInviteSchema = z.object({
  dealer_id: uuid,
  email: emailSchema,
  role: z.enum(Constants.public.Enums.dealer_member_role).default('staff'),
});

export type TeamMemberInviteInput = z.input<typeof teamMemberInviteSchema>;

/** Admin moderation: reject/suspend need a reason the dealer will see. */
export const dealerModerationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), dealer_id: uuid }),
  z.object({
    action: z.enum(['reject', 'suspend']),
    dealer_id: uuid,
    reason: requiredText(3, 1000, 'Tell the dealer why'),
  }),
]);

export type DealerModeration = z.output<typeof dealerModerationSchema>;
