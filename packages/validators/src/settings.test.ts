import { describe, expect, it } from 'vitest';

import { businessHoursSchema, siteSettingsSchema } from './settings';

const settings = {
  brand_name: 'DG Auto',
  default_whatsapp_e164: '+13473700570',
  default_phone_e164: '(347) 370-0570',
  whatsapp_template: "Hi! I'm interested in the {title} (Stock #{stock}) listed at {price}. {url}",
  business_hours: { mon: '09:00-19:00', sun: null },
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

describe('businessHoursSchema', () => {
  it('accepts ranges and closed days', () => {
    expect(businessHoursSchema.safeParse({ sat: '10:00-17:00', sun: null }).success).toBe(true);
  });

  it.each([{ mon: '9-5' }, { mon: '19:00-09:00' }, { funday: '09:00-10:00' }])(
    'rejects %o',
    (hours) => {
      expect(businessHoursSchema.safeParse(hours).success).toBe(false);
    },
  );
});
