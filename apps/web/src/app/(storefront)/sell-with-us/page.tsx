import type { Metadata } from 'next';

import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Sell with us' };

export default function SellwithusPage() {
  return (
    <ComingSoon
      title="Sell with us"
      description="Apply to list your dealership's inventory on the marketplace."
      phase={4}
    />
  );
}
