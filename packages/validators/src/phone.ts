import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { z } from 'zod';

/**
 * Accepts what people type ("(347) 370-0570", "+1 347 370 0570") and normalizes to E.164
 * (`+13473700570`), matching the `phone_e164` domain in the database.
 * Numbers without a country code are read as US numbers by default.
 */
export function phoneE164Schema(defaultCountry: CountryCode = 'US') {
  return z
    .string()
    .trim()
    .min(1, 'Enter a phone number')
    .transform((value, ctx) => {
      const phone = parsePhoneNumberFromString(value, defaultCountry);
      if (!phone?.isValid()) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' });
        return z.NEVER;
      }
      return phone.number;
    });
}

export const phoneE164 = phoneE164Schema();
