import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useAppTheme } from '@/lib/theme';

/** SF Symbols on iOS, Material Symbols on Android and web. */
const ICONS = {
  heart: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  heartFill: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  compare: { ios: 'arrow.left.arrow.right', android: 'compare_arrows', web: 'compare_arrows' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  whatsapp: { ios: 'message.fill', android: 'chat', web: 'chat' },
  call: { ios: 'phone.fill', android: 'call', web: 'call' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  filters: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  sort: { ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  dash: { ios: 'minus', android: 'remove', web: 'remove' },
  priceDrop: { ios: 'arrow.down.right', android: 'trending_down', web: 'trending_down' },
  car: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
  store: { ios: 'storefront', android: 'storefront', web: 'storefront' },
  expand: {
    ios: 'arrow.up.left.and.arrow.down.right',
    android: 'fullscreen',
    web: 'fullscreen',
  },
} as const satisfies Record<string, SymbolViewProps['name']>;

export type IconName = keyof typeof ICONS;
type Tone = 'foreground' | 'muted' | 'primary' | 'onPrimary' | 'onWhatsapp' | 'rose' | 'white';

export function Icon({
  name,
  size = 20,
  tone = 'foreground',
}: {
  name: IconName;
  size?: number;
  tone?: Tone;
}) {
  const { native } = useAppTheme();
  const color = {
    foreground: native.foreground,
    muted: native.muted,
    primary: native.primary,
    onPrimary: native.primaryForeground,
    onWhatsapp: native.whatsappForeground,
    rose: '#f43f5e',
    white: '#ffffff',
  }[tone];
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
