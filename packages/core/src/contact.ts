/**
 * Conversion links. There is no checkout: every vehicle converts through WhatsApp or a call.
 * Callers log clicks with the `track_contact_click` RPC fire-and-forget (never awaited).
 */
import { formatPrice } from './format';

const E164 = /^\+[1-9]\d{6,14}$/;

function digitsOf(phoneE164: string): string {
  if (!E164.test(phoneE164)) {
    throw new RangeError(`Expected an E.164 phone number, received "${phoneE164}"`);
  }
  return phoneE164.slice(1);
}

/** `https://wa.me/<digits>?text=…`; works on desktop, mobile web and as the native fallback. */
export function buildWhatsAppUrl(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${digitsOf(phoneE164)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** `whatsapp://send?…` deep link for the native app (check `Linking.canOpenURL` first). */
export function buildWhatsAppAppUrl(phoneE164: string, text?: string): string {
  const params = [`phone=${digitsOf(phoneE164)}`];
  if (text) params.push(`text=${encodeURIComponent(text)}`);
  return `whatsapp://send?${params.join('&')}`;
}

/** `tel:` link for the Call button. */
export function buildTelUrl(phoneE164: string): string {
  return `tel:+${digitsOf(phoneE164)}`;
}

export const DEFAULT_WHATSAPP_TEMPLATE =
  "Hi! I'm interested in the {title} (Stock #{stock}) listed at {price}. {url}";

export interface InquiryVehicle {
  title: string;
  priceCents: number | null;
  stockNumber?: string | null;
  vin?: string | null;
}

/**
 * Fills the `site_settings.whatsapp_template` placeholders: {title} {price} {stock} {vin} {url}.
 * A placeholder with no value is dropped together with the parentheses around it, so
 * "(Stock #{stock})" disappears cleanly when a listing has no stock number.
 */
export function renderWhatsAppTemplate(
  template: string,
  values: Partial<Record<'title' | 'price' | 'stock' | 'vin' | 'url', string | null>>,
): string {
  let text = template;
  for (const [key, value] of Object.entries(values)) {
    const token = `{${key}}`;
    if (value) {
      text = text.split(token).join(value);
    } else {
      text = text.replace(new RegExp(`\\s*\\([^(){}]*\\{${key}\\}[^(){}]*\\)`, 'g'), '');
      text = text.split(token).join('');
    }
  }
  return text
    .replace(/\{(title|price|stock|vin|url)\}/g, '')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** The prefilled WhatsApp message for a vehicle. */
export function buildVehicleInquiryText({
  vehicle,
  url,
  template = DEFAULT_WHATSAPP_TEMPLATE,
}: {
  vehicle: InquiryVehicle;
  url?: string;
  template?: string;
}): string {
  return renderWhatsAppTemplate(template, {
    title: vehicle.title,
    price: vehicle.priceCents === null ? null : formatPrice(vehicle.priceCents),
    stock: vehicle.stockNumber ?? null,
    vin: vehicle.vin ?? null,
    url: url ?? null,
  });
}

export interface ContactNumbers {
  whatsappE164: string | null;
  phoneE164: string | null;
}

/** A dealer's own numbers win; otherwise the site defaults from `site_settings` apply. */
export function resolveContactNumbers(
  dealer: { whatsapp_e164: string | null; phone_e164: string | null } | null,
  settings: { default_whatsapp_e164: string | null; default_phone_e164: string | null },
): ContactNumbers {
  return {
    whatsappE164: dealer?.whatsapp_e164 ?? settings.default_whatsapp_e164,
    phoneE164: dealer?.phone_e164 ?? settings.default_phone_e164,
  };
}
