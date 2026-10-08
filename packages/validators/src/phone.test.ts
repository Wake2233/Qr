import { describe, expect, it } from 'vitest';

import { phoneE164, phoneE164Schema } from './phone';

describe('phoneE164', () => {
  it.each(['(347) 370-0570', '347.370.0570', '+1 347 370 0570', ' 3473700570 '])(
    'normalizes %s',
    (input) => {
      expect(phoneE164.parse(input)).toBe('+13473700570');
    },
  );

  it.each(['', '123', '+1 555 0100', 'call me'])('rejects %s', (input) => {
    expect(phoneE164.safeParse(input).success).toBe(false);
  });

  it('supports other default countries', () => {
    expect(phoneE164Schema('GE').parse('599 12 34 56')).toBe('+995599123456');
  });
});
