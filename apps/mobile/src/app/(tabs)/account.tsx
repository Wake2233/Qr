import { localeNames, LOCALES } from '@cp/core';
import { Link } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { useT } from '@/i18n';
import { useSession } from '@/providers/session-provider';
import { usePreferencesStore } from '@/stores/preferences';

const LANGUAGES = LOCALES.map((value) => ({ value, label: localeNames[value] }));

export default function AccountScreen() {
  const { loading, context, signOut } = useSession();
  const t = useT();
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const locale = usePreferencesStore((s) => s.locale);
  const setLocale = usePreferencesStore((s) => s.setLocale);
  const themes = [
    { value: 'light', label: t.account.light },
    { value: 'dark', label: t.account.dark },
  ] as const;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-1 gap-6 px-4 pt-6">
        <Text className="text-3xl font-bold text-foreground">{t.account.title}</Text>
        {loading ? (
          <ActivityIndicator />
        ) : context ? (
          <View className="gap-4">
            <View className="gap-1 rounded-lg border border-border bg-card p-4">
              <Text className="text-base font-semibold text-foreground">
                {context.profile.full_name ?? t.account.signedIn}
              </Text>
              <Text className="text-sm text-muted-foreground">{context.email}</Text>
            </View>
            {context.canAccessConsole ? (
              <Link href="/manage" asChild>
                <Button title={t.account.openConsole} />
              </Link>
            ) : (
              <Link href="/sell-with-us" asChild>
                <Button title={t.account.sellWithUs} variant="outline" />
              </Link>
            )}
            <Button title={t.account.signOut} variant="outline" onPress={() => void signOut()} />
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-base text-muted-foreground">{t.account.signedOutBody}</Text>
            <Link href="/sign-in" asChild>
              <Button title={t.common.signIn} />
            </Link>
          </View>
        )}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">{t.account.language}</Text>
          <Segmented
            label={t.account.language}
            options={LANGUAGES}
            value={locale}
            onChange={setLocale}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">{t.account.appearance}</Text>
          <Segmented
            label={t.account.appearance}
            options={themes}
            value={theme}
            onChange={setTheme}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
