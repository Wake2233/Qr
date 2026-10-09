import { isAdmin as isAdminRole } from '@cp/core';
import { useQuery } from '@tanstack/react-query';

import type { EditorDealer } from '@/components/console/vehicle-editor';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

/** Dealers the user may list under: their memberships, or every dealer for admins. */
export function useEditorDealers(): {
  dealers: EditorDealer[];
  isAdmin: boolean;
  loading: boolean;
} {
  const { context } = useSession();
  const admin = context ? isAdminRole({ role: context.profile.role }) : false;
  const all = useQuery({
    queryKey: ['console', 'dealer-options'],
    enabled: admin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealers')
        .select('id, display_name, status, is_house')
        .order('is_house', { ascending: false })
        .order('display_name');
      if (error) throw error;
      return data.map((d) => ({ id: d.id, name: d.display_name, status: d.status }));
    },
  });
  const own = (context?.memberships ?? []).map((m) => ({
    id: m.dealerId,
    name: m.dealer.display_name,
    status: m.dealer.status,
  }));
  return {
    dealers: admin ? (all.data ?? own) : own,
    isAdmin: admin,
    loading: admin && all.isPending,
  };
}
