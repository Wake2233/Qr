import type { Metadata } from 'next';

import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Financing' };

export default function FinancingPage() {
  return (
    <ComingSoon
      title="Financing"
      description="Payment and budget calculators plus a simulated pre-qualification across our lender network."
      phase={6}
    />
  );
}
