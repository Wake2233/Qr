import type { Metadata } from 'next';

import { SavedVehicles } from '@/components/account/saved-vehicles';

export const metadata: Metadata = {
  title: 'Saved vehicles',
  robots: { index: false },
};

export default function FavoritesPage() {
  return (
    <div className="space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Saved vehicles</h1>
        <p className="text-muted-foreground">Tap the heart on any listing to keep it here.</p>
      </header>
      <SavedVehicles />
    </div>
  );
}
