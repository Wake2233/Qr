import type { Metadata } from 'next';

import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Compare vehicles' };

export default function ComparevehiclesPage() {
  return (
    <ComingSoon
      title="Compare vehicles"
      description="Line up to four vehicles side by side with the differences highlighted."
      phase={5}
    />
  );
}
