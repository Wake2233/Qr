import { cn } from './cn';

describe('cn', () => {
  it('lets later font family, size and color classes win', () => {
    expect(
      cn('font-sans text-base text-foreground', 'font-display-bold text-4xl text-primary'),
    ).toBe('font-display-bold text-4xl text-primary');
  });

  it('keeps non-conflicting classes and drops falsy values', () => {
    expect(cn('font-sans text-base', false, undefined, 'uppercase tracking-wide')).toBe(
      'font-sans text-base uppercase tracking-wide',
    );
  });
});
