import { describe, expect, it } from 'vitest';

import {
  dealerApplicationSchema,
  dealerModerationSchema,
  dealerProfileSchema,
  teamMemberInviteSchema,
} from './dealer';

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

describe('dealerProfileSchema', () => {
  it('accepts business hours and drops the license number', () => {
    const parsed = dealerProfileSchema.parse({
      ...application,
      business_hours: { mon: '09:00-18:00', sun: null },
    });
    expect(parsed.business_hours).toEqual({ mon: '09:00-18:00', sun: null });
    expect(parsed).not.toHaveProperty('license_number');
  });
});

describe('teamMemberInviteSchema', () => {
  const dealer_id = '00000000-0000-4000-8000-000000000001';

  it('normalizes the email and defaults the role to staff', () => {
    expect(teamMemberInviteSchema.parse({ dealer_id, email: ' Pat@Example.com ' })).toEqual({
      dealer_id,
      email: 'pat@example.com',
      role: 'staff',
    });
  });

  it('rejects unknown roles', () => {
    expect(
      teamMemberInviteSchema.safeParse({ dealer_id, email: 'a@b.co', role: 'boss' }).success,
    ).toBe(false);
  });
});

describe('dealerModerationSchema', () => {
  const dealer_id = '00000000-0000-4000-8000-000000000001';

  it('approves without a reason', () => {
    expect(dealerModerationSchema.parse({ action: 'approve', dealer_id })).toEqual({
      action: 'approve',
      dealer_id,
    });
  });

  it('requires a reason to reject or suspend', () => {
    expect(dealerModerationSchema.safeParse({ action: 'reject', dealer_id }).success).toBe(false);
    expect(
      dealerModerationSchema.parse({ action: 'suspend', dealer_id, reason: ' Expired license ' }),
    ).toMatchObject({ reason: 'Expired license' });
  });
});
