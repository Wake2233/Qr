import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';

import { ThemeProvider } from '@/components/theme/theme-provider';

import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const sora = Sora({ variable: '--font-sora', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Car Platform', template: '%s · Car Platform' },
  description: 'Browse quality pre-owned and new vehicles from trusted dealers.',
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
