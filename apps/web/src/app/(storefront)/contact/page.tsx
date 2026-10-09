import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@cp/core';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';

import { BusinessHours } from '@/components/site/business-hours';
import { Button } from '@/components/ui/button';
import { getSiteInfo } from '@/lib/site';

export const metadata: Metadata = { title: 'Contact' };

export default async function ContactPage() {
  const { settings, house } = await getSiteInfo();
  const phone = settings.default_phone_e164;
  const whatsapp = settings.default_whatsapp_e164;

  return (
    <section className="grid gap-12 py-16 md:grid-cols-2">
      <div className="space-y-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Talk to us</h1>
        <p className="text-muted-foreground text-lg">
          The fastest way to reach us is WhatsApp. Prefer to talk? Give us a call during business
          hours.
        </p>
        <div className="flex flex-wrap gap-3">
          {whatsapp ? (
            <Button
              asChild
              size="lg"
              className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            >
              <a href={buildWhatsAppUrl(whatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> WhatsApp us
              </a>
            </Button>
          ) : null}
          {phone ? (
            <Button asChild size="lg" variant="outline">
              <a href={buildTelUrl(phone)}>
                <Phone /> Call {formatPhone(phone)}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="bg-card space-y-6 rounded-2xl border p-6">
        {house?.address_line1 ? (
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4" aria-hidden /> Visit
            </h2>
            <address className="text-muted-foreground not-italic">
              {house.display_name}
              <br />
              {house.address_line1}
              <br />
              {[house.city, [house.state, house.postal_code].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(', ')}
            </address>
          </div>
        ) : null}
        <div className="space-y-2">
          <h2 className="font-semibold">Hours</h2>
          <BusinessHours hours={settings.business_hours} />
        </div>
      </div>
    </section>
  );
}
