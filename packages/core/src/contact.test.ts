import { describe, expect, it } from 'vitest';

import {
  buildTelUrl,
  buildVehicleInquiryText,
  buildWhatsAppAppUrl,
  buildWhatsAppUrl,
  renderWhatsAppTemplate,
  resolveContactNumbers,
} from './contact';

const vehicle = {
  title: '2021 BMW X5 xDrive40i',
  priceCents: 4_599_000,
  stockNumber: 'A123',
  vin: '5UXCR6C05L9B12345',
};

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me link with encoded text', () => {
    expect(buildWhatsAppUrl('+13473700570', 'Hi & hello')).toBe(
      'https://wa.me/13473700570?text=Hi%20%26%20hello',
    );
  });

  it('omits text when absent', () => {
    expect(buildWhatsAppUrl('+13473700570')).toBe('https://wa.me/13473700570');
  });

  it('rejects non-E.164 numbers', () => {
    expect(() => buildWhatsAppUrl('347-370-0570')).toThrow(RangeError);
  });
});

describe('buildWhatsAppAppUrl', () => {
  it('builds the native deep link', () => {
    expect(buildWhatsAppAppUrl('+13473700570', 'Hi')).toBe(
      'whatsapp://send?phone=13473700570&text=Hi',
    );
    expect(buildWhatsAppAppUrl('+13473700570')).toBe('whatsapp://send?phone=13473700570');
  });
});

describe('buildTelUrl', () => {
  it('builds a tel: link', () => {
    expect(buildTelUrl('+13473700570')).toBe('tel:+13473700570');
  });
});

describe('buildVehicleInquiryText', () => {
  it('fills the default template with exact price and stock number', () => {
    expect(buildVehicleInquiryText({ vehicle, url: 'https://example.com/inventory/x5' })).toBe(
      "Hi! I'm interested in the 2021 BMW X5 xDrive40i (Stock #A123) listed at $45,990. https://example.com/inventory/x5",
    );
  });

  it('drops the stock group and URL when missing', () => {
    expect(buildVehicleInquiryText({ vehicle: { ...vehicle, stockNumber: null } })).toBe(
      "Hi! I'm interested in the 2021 BMW X5 xDrive40i listed at $45,990.",
    );
  });

  it('supports custom templates with a VIN', () => {
    expect(
      buildVehicleInquiryText({ vehicle, template: 'Is {title} ({vin}) still available?' }),
    ).toBe('Is 2021 BMW X5 xDrive40i (5UXCR6C05L9B12345) still available?');
  });
});

describe('renderWhatsAppTemplate', () => {
  it('removes unknown-valued placeholders and tidies spacing', () => {
    expect(renderWhatsAppTemplate('About {title} {url} .', { title: 'X5' })).toBe('About X5.');
  });

  it('handles a missing price', () => {
    expect(renderWhatsAppTemplate('{title} at {price}', { title: 'X5', price: null })).toBe(
      'X5 at',
    );
  });
});

describe('resolveContactNumbers', () => {
  const settings = { default_whatsapp_e164: '+13473700570', default_phone_e164: '+13473700571' };

  it('prefers the dealer numbers', () => {
    expect(
      resolveContactNumbers(
        { whatsapp_e164: '+12015550100', phone_e164: '+12015550101' },
        settings,
      ),
    ).toEqual({ whatsappE164: '+12015550100', phoneE164: '+12015550101' });
  });

  it('falls back to site defaults per number', () => {
    expect(
      resolveContactNumbers({ whatsapp_e164: null, phone_e164: '+12015550101' }, settings),
    ).toEqual({
      whatsappE164: '+13473700570',
      phoneE164: '+12015550101',
    });
    expect(resolveContactNumbers(null, settings)).toEqual({
      whatsappE164: '+13473700570',
      phoneE164: '+13473700571',
    });
  });
});
