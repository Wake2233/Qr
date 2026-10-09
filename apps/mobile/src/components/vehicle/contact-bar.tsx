import { formatPrice } from '@cp/core';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { cn } from '@/lib/cn';
import { contactAbout } from '@/lib/contact';

interface ContactBarProps {
  vehicleId: string;
  priceCents: number | null;
  whatsappE164: string | null;
  phoneE164: string | null;
  text: string;
}

/** Sticky VDP conversion bar: WhatsApp (app, else wa.me) + Call, with haptics. */
export function ContactBar({
  vehicleId,
  priceCents,
  whatsappE164,
  phoneE164,
  text,
}: ContactBarProps) {
  if (!whatsappE164 && !phoneE164) return null;
  const open = (channel: 'whatsapp' | 'call', phone: string) => {
    contactAbout(vehicleId, channel, phone, text).catch(() =>
      toast.error(channel === 'whatsapp' ? 'Couldn’t open WhatsApp.' : 'Couldn’t start the call.'),
    );
  };
  return (
    // SafeAreaView sets padding from the insets, so spacing goes on the inner view.
    <SafeAreaView
      edges={['bottom']}
      className="absolute inset-x-0 bottom-0 border-t border-border bg-background"
    >
      <View className="flex-row items-center gap-3 px-4 py-3">
        {priceCents !== null ? (
          <Text className="font-display-bold text-lg text-foreground">
            {formatPrice(priceCents)}
          </Text>
        ) : null}
        {whatsappE164 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contact via WhatsApp"
            onPress={() => open('whatsapp', whatsappE164)}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-whatsapp active:opacity-85"
          >
            <Icon name="whatsapp" size={18} tone="onWhatsapp" />
            <Text className="font-sans-semibold text-base text-whatsapp-foreground">WhatsApp</Text>
          </Pressable>
        ) : null}
        {phoneE164 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call us"
            onPress={() => open('call', phoneE164)}
            className={cn(
              'h-12 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 active:opacity-85',
              !whatsappE164 && 'flex-1',
            )}
          >
            <Icon name="call" size={18} />
            <Text className="font-sans-semibold text-base">Call</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
