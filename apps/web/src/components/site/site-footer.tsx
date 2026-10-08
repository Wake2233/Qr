import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@cp/core';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import Link from 'next/link';

import { storefrontNav } from '@/lib/nav';
import { getSiteInfo } from '@/lib/site';

import { BrandMark } from './brand-mark';
import { BusinessHours } from './business-hours';

export async function SiteFooter() {
  const { settings, house } = await getSiteInfo();
  const phone = settings.default_phone_e164;
  const whatsapp = settings.default_whatsapp_e164;
  const address = house?.address_line1
    ? [
        house.address_line1,
        [house.city, [house.state, house.postal_code].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <footer className="bg-card mt-24 border-t">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <BrandMark name={settings.brand_name} />
          <ul className="text-muted-foreground space-y-2 text-sm">
            {address ? (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <a
                  className="hover:text-foreground"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {address}
                </a>
              </li>
            ) : null}
            {phone ? (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                <a className="hover:text-foreground" href={buildTelUrl(phone)}>
                  {formatPhone(phone)}
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li className="flex gap-2">
                <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <a
                  className="hover:text-foreground"
                  href={buildWhatsAppUrl(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp {formatPhone(whatsapp)}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="text-muted-foreground space-y-2 text-sm">
            {storefrontNav.map((item) => (
              <li key={item.href}>
                <Link className="hover:text-foreground" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Hours</h2>
          <BusinessHours hours={settings.business_hours} />
        </div>
      </div>
      <div className="text-muted-foreground mx-auto max-w-[1440px] border-t px-4 py-6 text-xs sm:px-6">
        <p>
          © {settings.brand_name}. Prices exclude tax, title and registration. Financing offers are
          simulated pre-qualification estimates, not credit decisions.
        </p>
      </div>
    </footer>
  );
}
