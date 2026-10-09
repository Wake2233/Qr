'use client';

import type { ConsoleVehicle } from '@cp/api';
import { formatMileage } from '@cp/core';
import {
  Archive,
  ExternalLink,
  ImageOff,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { bulkVehicleAction } from '@/app/dashboard/inventory/actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PriceCell } from './price-cell';
import { StatusMenu } from './status-menu';

interface InventoryTableProps {
  rows: ConsoleVehicle[];
  isAdmin: boolean;
  showDealer: boolean;
}

const LIVE = new Set(['active', 'reserved', 'sold']);

export function InventoryTable({ rows, isAdmin, showDealer }: InventoryTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const visibleSelected = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const allSelected = rows.length > 0 && visibleSelected.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const bulk = (action: 'archive' | 'feature' | 'unfeature') =>
    startTransition(async () => {
      const result = await bulkVehicleAction({ ids: visibleSelected, action });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.count} listing${result.data.count === 1 ? '' : 's'} updated`);
      setSelected(new Set());
    });

  return (
    <div className="space-y-3">
      {isAdmin && visibleSelected.length > 0 ? (
        <div
          className="bg-muted/60 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
          role="region"
          aria-label="Bulk actions"
        >
          <span className="text-sm font-medium">{visibleSelected.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk('feature')}>
              <Star /> Feature
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => bulk('unfeature')}
            >
              <StarOff /> Unfeature
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk('archive')}>
              <Archive /> Archive
            </Button>
          </div>
        </div>
      ) : null}

      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin ? (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={allSelected ? true : visibleSelected.length ? 'indeterminate' : false}
                    onCheckedChange={(on) =>
                      setSelected(on === true ? new Set(rows.map((r) => r.id)) : new Set())
                    }
                  />
                </TableHead>
              ) : null}
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="hidden text-right md:table-cell">Mileage</TableHead>
              {showDealer ? <TableHead className="hidden lg:table-cell">Dealer</TableHead> : null}
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const editHref = `/dashboard/inventory/${row.id}`;
              return (
                <TableRow key={row.id} data-state={selected.has(row.id) ? 'selected' : undefined}>
                  {isAdmin ? (
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${row.title}`}
                        checked={selected.has(row.id)}
                        onCheckedChange={(on) => toggle(row.id, on === true)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Link href={editHref} className="group flex items-center gap-3">
                      <div className="bg-muted relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-md">
                        {row.cover_url ? (
                          <Image
                            src={row.cover_url}
                            alt={row.cover_alt ?? row.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <ImageOff className="text-muted-foreground absolute inset-0 m-auto size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium group-hover:underline">
                          <span className="truncate">{row.title}</span>
                          {row.is_featured ? (
                            <Star
                              className="fill-warning text-warning size-3.5 shrink-0"
                              aria-label="Featured"
                            />
                          ) : null}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {[row.stock_number && `Stock #${row.stock_number}`, row.vin]
                            .filter(Boolean)
                            .join(' · ') || 'No stock # or VIN'}
                          {' · '}
                          {row.image_count ?? 0} photo{row.image_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusMenu
                      vehicleId={row.id}
                      status={row.status}
                      dealerApproved={row.dealer_status === 'approved'}
                      isAdmin={isAdmin}
                      onPublishBlocked={() => router.push(editHref)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <PriceCell vehicleId={row.id} priceCents={row.price_cents} />
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right tabular-nums md:table-cell">
                    {row.mileage != null ? formatMileage(row.mileage) : '—'}
                  </TableCell>
                  {showDealer ? (
                    <TableCell className="hidden lg:table-cell">{row.dealer_name}</TableCell>
                  ) : null}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`More actions for ${row.title}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={editHref}>
                            <Pencil /> Edit listing
                          </Link>
                        </DropdownMenuItem>
                        {LIVE.has(row.status) && row.dealer_status === 'approved' ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/${row.slug}`} target="_blank">
                              <ExternalLink /> View on site
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
