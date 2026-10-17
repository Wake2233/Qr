'use client';

import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@cp/core';
import { Menu, MessageCircle, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link, usePathname } from '@/i18n/navigation';
import { isActivePath, storefrontNav } from '@/lib/nav';
import { cn } from '@/lib/utils';

import { LanguageOptions } from './language-switch';

interface MobileNavProps {
  brandName: string;
  phoneE164: string | null;
  whatsappE164: string | null;
}

export function MobileNav({ brandName, phoneE164, whatsappE164 }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Header');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('openMenu')}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,85vw)] gap-0">
        <SheetHeader>
          <SheetTitle className="font-display">{brandName}</SheetTitle>
        </SheetHeader>
        <MobileNavLinks onNavigate={() => setOpen(false)} />
        <div className="text-muted-foreground flex items-center justify-between border-t px-5 py-2 text-base font-medium">
          {t('appearance')}
          <ThemeToggle />
        </div>
        <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-5 py-3 text-base font-medium">
          {t('language')}
          <LanguageOptions />
        </div>
        <div className="mt-auto flex flex-col gap-2 p-4">
          {whatsappE164 ? (
            <Button
              asChild
              size="lg"
              className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            >
              <a href={buildWhatsAppUrl(whatsappE164)} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> {t('whatsappUs')}
              </a>
            </Button>
          ) : null}
          {phoneE164 ? (
            <Button asChild size="lg" variant="outline">
              <a href={buildTelUrl(phoneE164)}>
                <Phone /> {formatPhone(phoneE164)}
              </a>
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Mounted only while the sheet is open, so reading the pathname never blocks prerendering. */
function MobileNavLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const t = useTranslations('Nav');
  return (
    <nav aria-label={t('mobile')} className="flex flex-col px-2">
      {storefrontNav.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'hover:bg-accent rounded-md px-3 py-3 text-base font-medium',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
