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

/** Formats basis points as a percentage, e.g. `650` → `"6.50%"`. */
export function formatApr(bps: number): string {
  if (!Number.isInteger(bps)) {
    throw new TypeError(`formatApr expects integer basis points, received ${bps}`);
  }
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Formats an E.164 number for display. North American numbers get the familiar
 * `+1 (347) 370-0570` shape; anything else is returned unchanged.
 */
export function formatPhone(e164: string): string {
  const nanp = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return nanp ? `+1 (${nanp[1]}) ${nanp[2]}-${nanp[3]}` : e164;
}
