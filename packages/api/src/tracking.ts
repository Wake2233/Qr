import type { Enums } from '@cp/types';

import type { AppSupabaseClient } from './client';

const ignore = () => undefined;

/**
 * Logs a WhatsApp/Call tap. Fire-and-forget by design: call it, then open the link
 * immediately — never await it (CLAUDE.md rule 6).
 */
export function trackContactClick(
  client: AppSupabaseClient,
  vehicleId: string,
  channel: Enums<'contact_channel'>,
  platform: Enums<'client_platform'>,
): void {
  void client
    .rpc('track_contact_click', {
      p_vehicle_id: vehicleId,
      p_channel: channel,
      p_platform: platform,
    })
    .then(ignore, ignore);
}

/** Counts a VDP view (aggregated per day, no PII). Fire-and-forget. */
export function recordVehicleView(client: AppSupabaseClient, vehicleId: string): void {
  void client.rpc('record_vehicle_view', { p_vehicle_id: vehicleId }).then(ignore, ignore);
}
