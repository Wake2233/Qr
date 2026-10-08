import { describe, expect, it } from 'vitest';

import { DB_ERROR_MESSAGES, parseDbError } from './errors';

describe('parseDbError', () => {
  it('extracts MISSING_FIELDS columns from a PostgrestError-like object', () => {
    expect(parseDbError({ message: 'MISSING_FIELDS: price_cents,mileage', code: 'P0001' })).toEqual(
      {
        code: 'MISSING_FIELDS',
        message: DB_ERROR_MESSAGES.MISSING_FIELDS,
        fields: ['price_cents', 'mileage'],
      },
    );
  });

  it('maps known codes from strings and Errors', () => {
    expect(parseDbError('DEALER_NOT_APPROVED: dealer must be approved').code).toBe(
      'DEALER_NOT_APPROVED',
    );
    expect(parseDbError(new Error('MISSING_IMAGES: at least one photo')).fields).toEqual([]);
  });

  it('falls back to UNKNOWN without leaking raw messages', () => {
    for (const input of [new Error('duplicate key value'), 'SOMETHING_ELSE: x', null, 42]) {
      expect(parseDbError(input)).toEqual({
        code: 'UNKNOWN',
        message: 'Something went wrong. Please try again.',
        fields: [],
      });
    }
  });
});
