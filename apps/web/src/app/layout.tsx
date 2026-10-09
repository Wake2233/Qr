import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';

import { AppProviders } from '@/components/providers/app-providers';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { env } from '@/lib/env';
import { getSiteInfo } from '@/lib/site';

import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const sora = Sora({ variable: '--font-sora', subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteInfo();
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: settings.brand_name, template: `%s · ${settings.brand_name}` },
    description:
      'Browse quality new and pre-owned vehicles with exact prices and full specs. Message us on WhatsApp or call.',
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders>{children}</AppProviders>
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
