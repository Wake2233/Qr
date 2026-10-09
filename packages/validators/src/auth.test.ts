import { describe, expect, it } from 'vitest';

import { safeRedirectSchema, signInRequestSchema, verifyCodeSchema } from './auth';

describe('signInRequestSchema', () => {
  it('normalizes email', () => {
    expect(signInRequestSchema.parse({ email: '  Buyer@Example.COM ' })).toEqual({
      email: 'buyer@example.com',
    });
  });

  it('rejects invalid email', () => {
    expect(signInRequestSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('verifyCodeSchema', () => {
  it('accepts a 6-digit code', () => {
    expect(verifyCodeSchema.parse({ email: 'a@b.co', code: ' 123456 ' }).code).toBe('123456');
  });

  it.each(['12345', '1234567', 'abcdef'])('rejects %s', (code) => {
    expect(verifyCodeSchema.safeParse({ email: 'a@b.co', code }).success).toBe(false);
  });
});

describe('safeRedirectSchema', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/inventory?make=bmw', '/inventory?make=bmw'],
    [undefined, '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeRedirectSchema.parse(input)).toBe(expected);
  });
});
