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

describe('parseDbError SQLSTATE mapping', () => {
  it('maps unique violations to the offending field', () => {
    expect(
      parseDbError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "vehicles_vin_live_idx"',
      }),
    ).toEqual({
      code: 'DUPLICATE',
      message: 'Another live listing already uses this VIN.',
      fields: ['vin'],
    });
    expect(
      parseDbError({ code: '23505', message: 'violates "vehicles_dealer_id_stock_number_key"' })
        .fields,
    ).toEqual(['stock_number']);
    expect(parseDbError({ code: '23505', message: 'makes_slug_key' }).fields).toEqual(['slug']);
    expect(parseDbError({ code: '23505', message: 'something_else_key' })).toEqual({
      code: 'DUPLICATE',
      message: DB_ERROR_MESSAGES.DUPLICATE,
      fields: [],
    });
  });

  it('maps foreign-key violations to IN_USE', () => {
    expect(parseDbError({ code: '23503', message: 'still referenced' }).code).toBe('IN_USE');
  });

  it('maps the console error codes', () => {
    for (const code of ['TOO_MANY_IMAGES', 'INVALID_PATH', 'USER_NOT_FOUND', 'ALREADY_MEMBER']) {
      expect(parseDbError({ code: 'P0001', message: `${code}: detail` }).code).toBe(code);
    }
  });
});
