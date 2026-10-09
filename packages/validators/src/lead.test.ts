import { describe, expect, it } from 'vitest';

import { leadSubmitSchema } from './lead';

const contact = { name: 'Blake Buyer', phone_e164: '(347) 370-0570' };

describe('leadSubmitSchema', () => {
  it('accepts an inquiry and normalizes contact fields', () => {
    expect(leadSubmitSchema.parse({ type: 'inquiry', ...contact, email: '' })).toMatchObject({
      type: 'inquiry',
      phone_e164: '+13473700570',
      email: null,
      preferred_contact: 'whatsapp',
      source: 'web',
      payload: {},
    });
  });

  it('requires a phone or an email', () => {
    const result = leadSubmitSchema.safeParse({
      type: 'inquiry',
      name: 'A',
      preferred_contact: 'email',
    });
    expect(result.success).toBe(false);
  });

  it('requires an email when email is preferred', () => {
    const result = leadSubmitSchema.safeParse({
      type: 'inquiry',
      ...contact,
      preferred_contact: 'email',
    });
    expect(result.error?.issues[0]?.path).toEqual(['email']);
  });

  it('requires a phone for WhatsApp/call', () => {
    const result = leadSubmitSchema.safeParse({
      type: 'inquiry',
      name: 'A',
      email: 'a@b.co',
      preferred_contact: 'call',
    });
    expect(result.error?.issues[0]?.path).toEqual(['phone_e164']);
  });

  it('validates the test-drive time and trade-in vehicle', () => {
    expect(
      leadSubmitSchema.safeParse({
        type: 'test_drive',
        ...contact,
        payload: { preferred_at: '2026-10-12T15:00:00' },
      }).success,
    ).toBe(true);
    expect(
      leadSubmitSchema.safeParse({
        type: 'test_drive',
        ...contact,
        payload: { preferred_at: 'soon' },
      }).success,
    ).toBe(false);
    expect(
      leadSubmitSchema.parse({
        type: 'trade_in',
        ...contact,
        payload: {
          year: 2015,
          make: 'Honda',
          model: 'Civic',
          mileage: 98_000,
          condition: 'good',
          vin: '',
        },
      }).payload,
    ).toMatchObject({ vin: null });
  });

  it('rejects a filled honeypot', () => {
    expect(
      leadSubmitSchema.safeParse({ type: 'inquiry', ...contact, website: 'http://spam' }).success,
    ).toBe(false);
  });
});
