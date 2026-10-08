import { describe, expect, it } from 'vitest';

import {
  FINANCE_CONSENT_VERSION,
  financeApplicationSchema,
  financeContactStepSchema,
} from './finance';

const application = {
  requested_amount_cents: 3_000_000,
  term_months: 60,
  first_name: 'Blake',
  last_name: 'Buyer',
  email: 'Blake@Example.com',
  phone_e164: '347-370-0570',
  postal_code: '08822',
  employment_status: 'employed',
  monthly_income_cents: 650_000,
  housing_payment_cents: 180_000,
  credit_tier: 'good',
  consent: true,
  consent_text_version: FINANCE_CONSENT_VERSION,
} as const;

describe('financeApplicationSchema', () => {
  it('accepts a complete application and applies defaults', () => {
    expect(financeApplicationSchema.parse(application)).toMatchObject({
      email: 'blake@example.com',
      phone_e164: '+13473700570',
      down_payment_cents: 0,
      trade_in_value_cents: 0,
    });
  });

  it('requires explicit consent with the current copy version', () => {
    expect(financeApplicationSchema.safeParse({ ...application, consent: false }).success).toBe(
      false,
    );
    expect(
      financeApplicationSchema.safeParse({ ...application, consent_text_version: '2020-01-01' })
        .success,
    ).toBe(false);
  });

  it('never accepts SSN or date of birth', () => {
    expect(financeApplicationSchema.safeParse({ ...application, ssn: '123-45-6789' }).success).toBe(
      false,
    );
    expect(financeApplicationSchema.safeParse({ ...application, dob: '1990-01-01' }).success).toBe(
      false,
    );
  });

  it('rejects out-of-range terms and fractional cents', () => {
    expect(financeApplicationSchema.safeParse({ ...application, term_months: 120 }).success).toBe(
      false,
    );
    expect(
      financeApplicationSchema.safeParse({ ...application, monthly_income_cents: 10.5 }).success,
    ).toBe(false);
  });
});

describe('financeContactStepSchema', () => {
  it.each(['08822', '08822-1234', 'K1A 0B1'])('accepts postal code %s', (postal_code) => {
    expect(financeContactStepSchema.safeParse({ ...application, postal_code }).success).toBe(true);
  });

  it('rejects an invalid postal code', () => {
    expect(financeContactStepSchema.safeParse({ ...application, postal_code: '1' }).success).toBe(
      false,
    );
  });
});
