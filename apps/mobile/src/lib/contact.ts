import { trackContactClick } from '@cp/api';
import { buildTelUrl, buildWhatsAppAppUrl, buildWhatsAppUrl } from '@cp/core';
import type { Enums } from '@cp/types';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export const clientPlatform: Enums<'client_platform'> =
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

/**
 * Opens WhatsApp with the prefilled message: the app (`whatsapp://`) when installed,
 * otherwise wa.me (which also hands off to the app on Android). On web `canOpenURL` is
 * always true, so it goes straight to wa.me. iOS needs `whatsapp` in
 * LSApplicationQueriesSchemes (app.json) for the check to work.
 */
export async function openWhatsApp(phoneE164: string, text: string): Promise<'app' | 'web'> {
  if (Platform.OS !== 'web') {
    const appUrl = buildWhatsAppAppUrl(phoneE164, text);
    try {
      if (await Linking.canOpenURL(appUrl)) {
        await Linking.openURL(appUrl);
        return 'app';
      }
    } catch {
      // Android may refuse to answer canOpenURL; the web link still works.
    }
  }
  await Linking.openURL(buildWhatsAppUrl(phoneE164, text));
  return 'web';
}

export async function callPhone(phoneE164: string): Promise<void> {
  await Linking.openURL(buildTelUrl(phoneE164));
}

/**
 * CTA handler: haptic, log the tap fire-and-forget (never awaited, CLAUDE.md rule 6),
 * then open WhatsApp or the dialer.
 */
export function contactAbout(
  vehicleId: string,
  channel: Enums<'contact_channel'>,
  phoneE164: string,
  text: string,
): Promise<unknown> {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  trackContactClick(supabase, vehicleId, channel, clientPlatform);
  return channel === 'whatsapp' ? openWhatsApp(phoneE164, text) : callPhone(phoneE164);
}
