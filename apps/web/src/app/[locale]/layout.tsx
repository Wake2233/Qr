import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Georgian, Sora } from 'next/font/google';
import { notFound } from 'next/navigation';

import { AppProviders } from '@/components/providers/app-providers';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { getSiteInfo } from '@/lib/site';

import '../globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const sora = Sora({ variable: '--font-sora', subsets: ['latin'] });
// Inter and Sora have no Georgian letters; the browser fetches this only for Georgian text.
const georgian = Noto_Sans_Georgian({
  variable: '--font-georgian',
  subsets: ['georgian'],
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [{ settings }, t] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: 'Meta' }),
  ]);
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: settings.brand_name, template: `%s · ${settings.brand_name}` },
    description: t('description'),
  };
}

export const viewport: Viewport = {
  themeColor: '#fafaf9',
};

export default async function RootLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${sora.variable} ${georgian.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <AppProviders>{children}</AppProviders>
          </NextIntlClientProvider>
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
