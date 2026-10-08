import { buildTelUrl, formatPhone } from '@cp/core';
import { Phone } from 'lucide-react';

import { AccountButton } from '@/components/auth/account-button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { getSiteInfo } from '@/lib/site';

import { BrandMark } from './brand-mark';
import { CompareLink } from './compare-link';
import { MainNav } from './main-nav';
import { MobileNav } from './mobile-nav';

export async function SiteHeader() {
  const { settings } = await getSiteInfo();
  const phone = settings.default_phone_e164;

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <BrandMark name={settings.brand_name} />
        <MainNav className="ml-4 hidden md:flex" />
        <div className="ml-auto flex items-center gap-1">
          {phone ? (
            <Button asChild variant="ghost" className="hidden lg:inline-flex">
              <a href={buildTelUrl(phone)}>
                <Phone /> {formatPhone(phone)}
              </a>
            </Button>
          ) : null}
          <CompareLink />
          <ThemeToggle />
          <AccountButton />
          <MobileNav
            brandName={settings.brand_name}
            phoneE164={phone}
            whatsappE164={settings.default_whatsapp_e164}
          />
        </div>
      </div>
    </header>
  );
}
