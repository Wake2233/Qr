import { Constants } from '@cp/types';
import { z } from 'zod';

import { emailSchema } from './auth';
import { phoneE164 } from './phone';
import { optionalText, requiredText, uuid } from './shared';
import { vinSchema } from './vin';

const E = Constants.public.Enums;

const contactBase = z.object({
  vehicle_id: uuid.nullish(),
  name: requiredText(1, 120, 'Enter your name'),
  email: z
    .union([emailSchema, z.literal('')])
    .nullish()
    .transform((value) => value || null),
  phone_e164: z
    .union([phoneE164, z.literal('')])
    .nullish()
    .transform((value) => value || null),
  message: optionalText(4000),
  preferred_contact: z.enum(['whatsapp', 'call', 'email']).default('whatsapp'),
  source: z.enum(E.client_platform).default('web'),
  /** Honeypot: real people never see or fill this field. */
  website: z.string().max(0, 'Leave this field empty').optional(),
});

const testDrivePayload = z.object({
  /** ISO date-time the buyer prefers, e.g. "2026-10-12T15:00". */
  preferred_at: z.iso.datetime({ local: true, offset: true }),
});

const tradeInPayload = z.object({
  year: z.number().int().min(1950).max(2100),
  make: requiredText(1, 60, 'Enter the make'),
  model: requiredText(1, 80, 'Enter the model'),
  mileage: z.number().int().min(0).max(2_000_000),
  vin: z
    .union([vinSchema, z.literal('')])
    .nullish()
    .transform((value) => value || null),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
});

/** Input for the `submit_lead` RPC, one variant per lead type. */
export const leadSubmitSchema = z
  .discriminatedUnion('type', [
    contactBase.extend({ type: z.literal('inquiry'), payload: z.object({}).default({}) }),
    contactBase.extend({ type: z.literal('test_drive'), payload: testDrivePayload }),
    contactBase.extend({ type: z.literal('trade_in'), payload: tradeInPayload }),
  ])
  .refine((lead) => lead.email !== null || lead.phone_e164 !== null, {
    path: ['phone_e164'],
    message: 'Add a phone number or email so we can reach you',
  })
  .refine((lead) => lead.preferred_contact !== 'email' || lead.email !== null, {
    path: ['email'],
    message: 'Add an email address to be contacted by email',
  })
  .refine((lead) => lead.preferred_contact === 'email' || lead.phone_e164 !== null, {
    path: ['phone_e164'],
    message: 'Add a phone number for WhatsApp or a call',
  });

export type LeadSubmitInput = z.input<typeof leadSubmitSchema>;
export type LeadSubmit = z.output<typeof leadSubmitSchema>;
