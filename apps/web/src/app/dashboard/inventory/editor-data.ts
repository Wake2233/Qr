import 'server-only';

import { listFeatures, listMakes, listModels } from '@cp/api';

import type { EditorCatalog, EditorDealer } from '@/components/dashboard/inventory/vehicle-editor';
import type { ConsoleContext } from '@/lib/console';

/** Catalog + the dealers this user may list under (admins: every dealer). */
export async function loadEditorData({
  supabase,
  isAdmin,
  ctx,
}: ConsoleContext): Promise<{ catalog: EditorCatalog; dealers: EditorDealer[] }> {
  const [makes, models, features, dealers] = await Promise.all([
    listMakes(supabase),
    listModels(supabase),
    listFeatures(supabase),
    isAdmin
      ? supabase
          .from('dealers')
          .select('id, display_name, status, is_house')
          .order('is_house', { ascending: false })
          .order('display_name')
          .then(({ data, error }) => {
            if (error) throw error;
            return data.map((d) => ({ id: d.id, name: d.display_name, status: d.status }));
          })
      : Promise.resolve(
          ctx.memberships.map((m) => ({
            id: m.dealerId,
            name: m.dealer.display_name,
            status: m.dealer.status,
          })),
        ),
  ]);
  return { catalog: { makes, models, features }, dealers };
}
