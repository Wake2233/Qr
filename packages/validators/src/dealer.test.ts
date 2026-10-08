import { describe, expect, it } from 'vitest';

import { dealerApplicationSchema } from './dealer';

const application = {
  display_name: 'Garden State Auto',
  phone_e164: '(908) 555-0142',
  whatsapp_e164: '+1 908 555 0142',
  email: 'Sales@GardenState.example',
  address_line1: '300 NJ-31',
  city: 'Flemington',
  state: 'NJ',
  postal_code: '08822',
  license_number: 'NJ-DLR-12345',
};

describe('dealerApplicationSchema', () => {
  it('normalizes phones, email and optional fields', () => {
    expect(
      dealerApplicationSchema.parse({ ...application, website: 'gardenstate.example' }),
    ).toMatchObject({
      phone_e164: '+19085550142',
      whatsapp_e164: '+19085550142',
      email: 'sales@gardenstate.example',
      website: 'https://gardenstate.example',
      legal_name: null,
      description: null,
    });
  });

  it('treats an empty website as none', () => {
    expect(dealerApplicationSchema.parse({ ...application, website: '' }).website).toBeNull();
  });

  it('rejects non-http websites and missing licence numbers', () => {
    expect(
      dealerApplicationSchema.safeParse({ ...application, website: 'ftp://x.example' }).success,
    ).toBe(false);
    expect(dealerApplicationSchema.safeParse({ ...application, license_number: '' }).success).toBe(
      false,
    );
  });
});
