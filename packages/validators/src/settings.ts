import { z } from 'zod';

import { phoneE164 } from './phone';
import { requiredText } from './shared';

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
  require_listing_review: z.boolean(),
});

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
