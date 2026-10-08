import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const error = params.error === 'link' ? 'That sign-in link is invalid or expired.' : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-2">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Car Platform
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">
          Save cars, track inquiries, or manage your dealership.
        </p>
      </div>
      <LoginForm next={next} initialError={error} />
    </main>
  );
}
