import { describe, expect, it } from 'vitest';

import { vinSchema } from './vin';

describe('vinSchema', () => {
  it('accepts and uppercases a valid VIN', () => {
    expect(vinSchema.parse(' 5uxcr6c05l9b12345 ')).toBe('5UXCR6C05L9B12345');
  });

  it.each(['5UXCR6C05L9B1234', '5UXCR6C05L9B123456', 'IUXCR6C05L9B12345', 'OUXCR6C05L9B1234Q'])(
    'rejects %s',
    (vin) => {
      expect(vinSchema.safeParse(vin).success).toBe(false);
    },
  );
});
