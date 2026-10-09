import { buildTelUrl, formatPhone } from '@cp/core';
import { Heart, Phone } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { AccountButton } from '@/components/auth/account-button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { getSiteInfo } from '@/lib/site';

import { BrandMark } from './brand-mark';
import { CompareLink } from './compare-link';
import { MainNav, MainNavLinks } from './main-nav';
import { MobileNav } from './mobile-nav';

export async function SiteHeader() {
  const { settings } = await getSiteInfo();
  const phone = settings.default_phone_e164;

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <BrandMark name={settings.brand_name} />
        <Suspense fallback={<MainNavLinks pathname={null} className="ml-4 hidden md:flex" />}>
          <MainNav className="ml-4 hidden md:flex" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          {phone ? (
            <Button asChild variant="ghost" className="hidden lg:inline-flex">
              <a href={buildTelUrl(phone)}>
                <Phone /> {formatPhone(phone)}
              </a>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="icon">
            <Link href="/account/favorites" aria-label="Saved vehicles">
              <Heart className="size-5" />
            </Link>
          </Button>
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
