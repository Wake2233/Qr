import { CREDIT_TIERS } from '@cp/core';
import { z } from 'zod';

import { phoneE164 } from './phone';
import { requiredText } from './shared';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const HOURS = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

/** `{"mon":"09:00-19:00", …, "sun": null}` — null means closed. */
export const businessHoursSchema = z.partialRecord(
  z.enum(WEEKDAYS),
  z
    .string()
    .regex(HOURS, 'Use HH:MM-HH:MM')
    .refine((range) => range.slice(0, 5) < range.slice(6), 'Closing time must be after opening')
    .nullable(),
);
export type BusinessHours = z.infer<typeof businessHoursSchema>;

/** APR per credit tier in basis points (650 = 6.50%). */
export const aprByTierSchema = z.partialRecord(
  z.enum(CREDIT_TIERS),
  z.number().int().min(0).max(4000),
);

const TEMPLATE_KEYS = /\{(title|price|stock|vin|url)\}/g;

/** Admin site-settings form (the single `site_settings` row). */
export const siteSettingsSchema = z.object({
  brand_name: requiredText(1, 80, 'Enter the brand name'),
  default_whatsapp_e164: phoneE164,
  default_phone_e164: phoneE164,
  whatsapp_template: requiredText(1, 1000, 'Enter a message template')
    .refine((t) => t.includes('{title}'), 'Include {title} so dealers know which car')
    .refine(
      (t) => (t.match(/\{[^}]*\}/g) ?? []).every((token) => token.match(TEMPLATE_KEYS)),
      'Use only {title}, {price}, {stock}, {vin} and {url}',
    ),
  business_hours: businessHoursSchema,
  apr_by_tier: aprByTierSchema,
  lender_network_size: z.number().int().min(0).max(100_000),
  require_listing_review: z.boolean(),
});

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
