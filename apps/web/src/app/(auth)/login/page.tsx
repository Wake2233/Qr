import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/login-form';
import { BrandMark } from '@/components/site/brand-mark';
import { Skeleton } from '@/components/ui/skeleton';
import { getSiteInfo } from '@/lib/site';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { settings } = await getSiteInfo();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-2">
        <BrandMark name={settings.brand_name} />
        <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">
          Save cars, track inquiries, or manage your dealership.
        </p>
      </div>
      {/* searchParams is a request-time read: keep the heading in the static shell. */}
      <Suspense fallback={<Skeleton className="h-36 w-full" />}>
        <LoginFormFromParams searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginFormFromParams({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const error = params.error === 'link' ? 'That sign-in link is invalid or expired.' : undefined;
  return <LoginForm next={next} initialError={error} />;
}
