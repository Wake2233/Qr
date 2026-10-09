import { BadgeCheck, Car, MessageCircle, Smartphone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { DealerStatusBadge } from '@/components/dashboard/status-badge';
import { DealerApplicationForm } from '@/components/dealer/dealer-application-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Sell with us',
  description: 'Apply to list your dealership’s inventory on the marketplace.',
};

const PERKS = [
  {
    icon: MessageCircle,
    title: 'Leads straight to WhatsApp',
    body: 'Buyers message or call your number from every listing. No middleman, no checkout.',
  },
  {
    icon: Smartphone,
    title: 'Manage from anywhere',
    body: 'Add cars, scan VINs and upload photos from the web console or the mobile app.',
  },
  {
    icon: Car,
    title: 'Listings that sell',
    body: 'Big photos, every spec, price-drop badges and payment estimates on each car.',
  },
] as const;

const STEPS = [
  'Apply with your business details',
  'We verify your dealership',
  'Publish your inventory',
];

export default function SellWithUsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              For dealers
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Put your inventory in front of more car buyers
            </h1>
            <p className="text-muted-foreground text-lg">
              Join the marketplace as a partner dealer. Your cars, your prices, your customers.
            </p>
          </div>
          <ul className="space-y-5">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground text-sm">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <ol className="space-y-2 border-l pl-5">
            {STEPS.map((step, i) => (
              <li key={step} className="text-sm">
                <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-2xl" />}>
          <ApplicationPanel />
        </Suspense>
      </div>
    </div>
  );
}

async function ApplicationPanel() {
  const ctx = await getSession();
  if (!ctx) {
    return (
      <div className="bg-card flex flex-col items-start gap-4 rounded-2xl border p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">Apply in five minutes</h2>
        <p className="text-muted-foreground">
          Sign in with your email first. We use it to send your approval and lead notifications.
        </p>
        <Button asChild size="lg">
          <Link href="/login?next=/sell-with-us">Sign in to apply</Link>
        </Button>
      </div>
    );
  }

  const owned = ctx.memberships.filter((m) => m.role === 'owner');
  const pending = owned.find((m) => m.dealer.status === 'pending');
  const approved = ctx.memberships.find((m) => m.dealer.status === 'approved');

  if (pending || approved) {
    const membership = pending ?? approved;
    return (
      <div className="bg-card flex flex-col items-start gap-4 rounded-2xl border p-6 sm:p-8">
        <BadgeCheck className="text-primary size-10" />
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-semibold">{membership?.dealer.display_name}</h2>
          {membership ? <DealerStatusBadge status={membership.dealer.status} /> : null}
        </div>
        <p className="text-muted-foreground">
          {pending
            ? 'Your application is being reviewed. You can prepare draft listings now; they go live once you are approved.'
            : 'Your dealership is approved. Manage inventory from the console.'}
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard/inventory">Open the console</Link>
        </Button>
      </div>
    );
  }

  // Previously rejected applicants see the reason and may apply again.
  const rejected = owned.find((m) => m.dealer.status === 'rejected');
  let reason: string | null = null;
  if (rejected) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dealers')
      .select('rejection_reason')
      .eq('id', rejected.dealerId)
      .maybeSingle();
    reason = data?.rejection_reason ?? null;
  }

  return (
    <div className="space-y-4">
      {rejected ? (
        <div className="border-destructive/40 bg-destructive/5 rounded-xl border p-4 text-sm">
          <p className="font-medium">Your previous application was not approved.</p>
          {reason ? <p className="text-muted-foreground mt-1">Reason: {reason}</p> : null}
        </div>
      ) : null}
      <DealerApplicationForm email={ctx.email} />
    </div>
  );
}
