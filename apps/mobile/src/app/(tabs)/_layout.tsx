import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useT } from '@/i18n';
import { useAppTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { native } = useAppTheme();
  const t = useT();

  return (
    <NativeTabs
      backgroundColor={native.background}
      tintColor={native.primary}
      labelStyle={{ selected: { color: native.primary } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t.tabs.discover}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>{t.tabs.search}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>{t.tabs.saved}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t.tabs.account}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
