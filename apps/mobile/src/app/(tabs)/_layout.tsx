import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAppTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { native } = useAppTheme();

  return (
    <NativeTabs
      backgroundColor={native.background}
      tintColor={native.primary}
      labelStyle={{ selected: { color: native.primary } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="finance">
        <NativeTabs.Trigger.Label>Finance</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dollarsign.circle" md="payments" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
