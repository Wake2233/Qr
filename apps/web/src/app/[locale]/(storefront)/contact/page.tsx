import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@cp/core';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { localizedAlternates } from '@/lib/i18n';
import { getSiteInfo } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('Contact')]);
  return { title: t('metaTitle'), alternates: localizedAlternates(locale, '/contact') };
}

export default async function ContactPage() {
  const [{ settings, house }, t] = await Promise.all([getSiteInfo(), getTranslations('Contact')]);
  const phone = settings.default_phone_e164;
  const whatsapp = settings.default_whatsapp_e164;

  return (
    <section className="grid gap-12 py-16 md:grid-cols-2">
      <div className="space-y-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-lg">{t('lead')}</p>
        <div className="flex flex-wrap gap-3">
          {whatsapp ? (
            <Button
              asChild
              size="lg"
              className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            >
              <a href={buildWhatsAppUrl(whatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> {t('whatsappUs')}
              </a>
            </Button>
          ) : null}
          {phone ? (
            <Button asChild size="lg" variant="outline">
              <a href={buildTelUrl(phone)}>
                <Phone /> {t('call', { phone: formatPhone(phone) })}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="bg-card space-y-6 rounded-2xl border p-6">
        {house?.address_line1 ? (
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4" aria-hidden /> {t('visit')}
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
      </div>
    </section>
  );
}
