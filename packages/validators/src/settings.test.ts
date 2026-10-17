import { describe, expect, it } from 'vitest';

import { siteSettingsSchema } from './settings';

const settings = {
  brand_name: 'DG Auto',
  default_whatsapp_e164: '+13473700570',
  default_phone_e164: '(347) 370-0570',
  whatsapp_template: "Hi! I'm interested in the {title} (Stock #{stock}) listed at {price}. {url}",
  require_listing_review: false,
};

describe('siteSettingsSchema', () => {
  it('accepts the seeded settings', () => {
    expect(siteSettingsSchema.parse(settings).default_phone_e164).toBe('+13473700570');
  });

  it('requires {title} and only known placeholders in the template', () => {
    expect(siteSettingsSchema.safeParse({ ...settings, whatsapp_template: 'Hello' }).success).toBe(
      false,
    );
    expect(
      siteSettingsSchema.safeParse({ ...settings, whatsapp_template: '{title} {color}' }).success,
    ).toBe(false);
  });
});
