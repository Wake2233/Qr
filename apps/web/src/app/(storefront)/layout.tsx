import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

export default function StorefrontLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
