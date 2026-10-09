import { extractVin } from './vin';

describe('extractVin', () => {
  it('accepts a clean VIN and normalizes case', () => {
    expect(extractVin('1hgcv1f34la123456')).toBe('1HGCV1F34LA123456');
  });

  it('strips the "I" import prefix some Code 39 labels carry', () => {
    expect(extractVin('I1HGCV1F34LA123456')).toBe('1HGCV1F34LA123456');
  });

  it('ignores separators and trailing data', () => {
    expect(extractVin('1HGCV1F34LA123456-EXTRA')).toBe('1HGCV1F34LA123456');
    expect(extractVin(' 1HG CV1F34 LA123456 ')).toBe('1HGCV1F34LA123456');
  });

  it('rejects payloads without a valid VIN', () => {
    expect(extractVin('hello world')).toBeNull();
    expect(extractVin('1HGCV1F34LA12345O')).toBeNull(); // O is never used in VINs
  });
});
