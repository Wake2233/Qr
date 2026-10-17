import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SavedVehicles } from '@/components/account/saved-vehicles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Saved');
  return { title: t('title'), robots: { index: false } };
}

export default async function FavoritesPage() {
  const t = await getTranslations('Saved');
  return (
    <div className="space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </header>
      <SavedVehicles />
    </div>
  );
}
