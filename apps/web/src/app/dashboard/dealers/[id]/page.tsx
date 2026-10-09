import { dealerDocumentUrls, getConsoleDealer } from '@cp/api';
import { formatPhone } from '@cp/core';
import { uuidSchema } from '@cp/validators';
import { FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { ModerationButtons } from '@/components/dashboard/dealers/moderation-buttons';
import { PageHeader } from '@/components/dashboard/page-header';
import { DealerStatusBadge } from '@/components/dashboard/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/console';

export const metadata: Metadata = { title: 'Dealer review' };

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export default function DealerReviewPage({ params }: PageProps<'/dashboard/dealers/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      <DealerReview params={params} />
    </Suspense>
  );
}

async function DealerReview({
  params,
}: {
  params: PageProps<'/dashboard/dealers/[id]'>['params'];
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const { supabase } = await requireAdmin();
  const dealer = await getConsoleDealer(supabase, id);
  if (!dealer) notFound();
  const documents = await dealerDocumentUrls(supabase, dealer.private?.documents ?? []);
  const { count: listings } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={dealer.display_name}
        description={
          <Link href="/dashboard/dealers" className="underline underline-offset-4">
            Back to dealers
          </Link>
        }
        actions={
          <ModerationButtons
            dealerId={dealer.id}
            dealerName={dealer.display_name}
            status={dealer.status}
            isHouse={dealer.is_house}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Business" className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Item label="Status">
              <DealerStatusBadge status={dealer.status} />
            </Item>
            <Item label="Legal name">{dealer.legal_name ?? '—'}</Item>
            <Item label="Phone">{dealer.phone_e164 ? formatPhone(dealer.phone_e164) : '—'}</Item>
            <Item label="WhatsApp">
              {dealer.whatsapp_e164 ? formatPhone(dealer.whatsapp_e164) : '—'}
            </Item>
            <Item label="Email">{dealer.email ?? '—'}</Item>
            <Item label="Website">
              {dealer.website ? (
                <a
                  href={dealer.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline"
                >
                  {dealer.website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                '—'
              )}
            </Item>
            <Item label="Address">
              {[dealer.address_line1, dealer.city, dealer.state, dealer.postal_code]
                .filter(Boolean)
                .join(', ') || '—'}
            </Item>
            <Item label="License number">{dealer.private?.license_number ?? '—'}</Item>
            <Item label="Applied">{dateFormat.format(new Date(dealer.created_at))}</Item>
            <Item label="Approved">
              {dealer.approved_at ? dateFormat.format(new Date(dealer.approved_at)) : '—'}
            </Item>
            <Item label="Listings">
              <Link href={`/dashboard/inventory?dealer=${dealer.id}`} className="underline">
                {listings ?? 0} in inventory
              </Link>
            </Item>
            {dealer.rejection_reason ? (
              <Item label="Last reason given">{dealer.rejection_reason}</Item>
            ) : null}
          </dl>
          {dealer.description ? (
            <p className="text-muted-foreground mt-4 text-sm whitespace-pre-line">
              {dealer.description}
            </p>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card title="Documents">
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.path}>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:bg-muted flex items-center gap-2 rounded-md p-2 text-sm"
                      >
                        <FileText className="text-muted-foreground size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {doc.name} (unavailable)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground mt-3 text-xs">Links expire after 10 minutes.</p>
          </Card>

          <Card title="Team">
            <ul className="space-y-3">
              {dealer.team.map((member) => (
                <li key={member.user_id} className="text-sm">
                  <p className="font-medium">{member.full_name ?? member.email}</p>
                  <p className="text-muted-foreground">
                    {member.email} · <span className="capitalize">{member.role}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`bg-card space-y-4 rounded-xl border p-5 sm:p-6 ${className ?? ''}`}>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
