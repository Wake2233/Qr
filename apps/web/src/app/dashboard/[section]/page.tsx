import { consoleNavItems, type ConsoleSection } from '@cp/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ComingSoon } from '@/components/coming-soon';
import { Skeleton } from '@/components/ui/skeleton';
import { consoleRoutes } from '@/lib/nav';
import { getSession } from '@/lib/session';

/**
 * Placeholder for console sections built in later phases. Real routes (e.g.
 * dashboard/inventory/page.tsx) take precedence over this dynamic segment as they land.
 */
const SECTIONS = Object.keys(consoleRoutes).filter((s) => s !== 'overview') as ConsoleSection[];
const isSection = (value: string): value is ConsoleSection =>
  (SECTIONS as string[]).includes(value);

const LABELS = Object.fromEntries(
  consoleNavItems({ role: 'admin', memberships: ['owner'] }).map((i) => [i.id, i.label]),
);

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<'/dashboard/[section]'>): Promise<Metadata> {
  const { section } = await params;
  return { title: LABELS[section] ?? 'Console' };
}

export default async function ConsoleSectionPage({ params }: PageProps<'/dashboard/[section]'>) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-xl" />}>
      <SectionPlaceholder section={section} />
    </Suspense>
  );
}

async function SectionPlaceholder({ section }: { section: ConsoleSection }) {
  const ctx = await getSession();
  if (!ctx) return null;
  const item = consoleNavItems({
    role: ctx.profile.role,
    memberships: ctx.memberships.map((m) => m.role),
  }).find((i) => i.id === section);
  // Hidden sections (e.g. admin pages for dealers) 404 rather than hint they exist.
  if (!item) notFound();

  return (
    <ComingSoon
      title={item.label}
      description="This part of the console is being built. Overview and sign-in work today."
      phase={consoleRoutes[section].phase}
      backHref="/dashboard"
      backLabel="Back to overview"
    />
  );
}
