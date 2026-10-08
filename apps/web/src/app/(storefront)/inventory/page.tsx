import type { Metadata } from 'next';

import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Inventory' };

export default function InventoryPage() {
  return (
    <ComingSoon
      title="Inventory"
      description="Search every listing with live filters, exact prices and full specs."
      phase={5}
    />
  );
}
