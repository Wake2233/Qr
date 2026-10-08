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

/**
 * Parses a dollar amount typed into a form ("45,990", "$45,990.50") into integer cents.
 * Returns null for empty or invalid input; never rounds beyond the cent.
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[\s$,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Integer cents → the plain dollar string a form input shows ("45990" or "45990.50"). */
export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  return fraction ? `${whole}.${String(fraction).padStart(2, '0')}` : String(whole);
}
