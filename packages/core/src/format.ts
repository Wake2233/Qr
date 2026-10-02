export interface FormatPriceOptions {
  currency?: string;
  locale?: string;
}

/** Formats integer cents as a whole-unit price, e.g. `4599000` → `"$45,990"`. */
export function formatPrice(
  cents: number,
  { currency = 'USD', locale = 'en-US' }: FormatPriceOptions = {},
): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`formatPrice expects integer cents, received ${cents}`);
  }
  const hasFraction = cents % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}

/** Formats an odometer reading, e.g. `42180` → `"42,180 mi"`. */
export function formatMileage(miles: number, locale = 'en-US'): string {
  return `${new Intl.NumberFormat(locale).format(Math.round(miles))} mi`;
}
