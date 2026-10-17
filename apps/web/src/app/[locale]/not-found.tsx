import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <p className="text-primary text-sm font-medium tracking-widest uppercase">404</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/inventory">{t('browse')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t('home')}</Link>
        </Button>
      </div>
    </main>
  );
}
