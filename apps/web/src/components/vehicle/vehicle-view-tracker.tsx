'use client';

import { recordVehicleView } from '@cp/api';
import { useEffect } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed';

/** Counts the view (fire-and-forget, no PII) and remembers it for "recently viewed". */
export function VehicleViewTracker({ vehicleId }: { vehicleId: string }) {
  const { supabase } = useAuth();
  const push = useRecentlyViewedStore((s) => s.push);
  useEffect(() => {
    recordVehicleView(supabase, vehicleId);
    push(vehicleId);
  }, [supabase, vehicleId, push]);
  return null;
}
