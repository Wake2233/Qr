'use client';

import { listingStatusActions } from '@cp/core';
import type { Enums } from '@cp/types';
import { ChevronDown } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { changeVehicleStatus } from '@/app/dashboard/inventory/actions';
import { ListingStatusBadge } from '@/components/dashboard/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StatusMenuProps {
  vehicleId: string;
  status: Enums<'listing_status'>;
  dealerApproved: boolean;
  isAdmin: boolean;
  /** Called when publishing fails on missing fields/photos, e.g. to open the editor. */
  onPublishBlocked?: () => void;
}

export function StatusMenu({
  vehicleId,
  status,
  dealerApproved,
  isAdmin,
  onPublishBlocked,
}: StatusMenuProps) {
  const [pending, startTransition] = useTransition();
  const actions = listingStatusActions(status, { isAdmin });

  const run = (to: Enums<'listing_status'>, label: string) =>
    startTransition(async () => {
      const result = await changeVehicleStatus(vehicleId, to);
      if (result.ok) {
        toast.success(
          result.data.status === 'pending_review'
            ? 'Submitted for review. An admin will publish it shortly.'
            : `${label}: done`,
        );
        return;
      }
      toast.error(result.error);
      // Missing fields/photos: the fix is in the editor.
      if (result.fieldErrors) onPublishBlocked?.();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="focus-visible:ring-ring inline-flex min-h-8 items-center gap-1 rounded-full focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        aria-label="Change status"
      >
        <ListingStatusBadge status={status} />
        <ChevronDown className="text-muted-foreground size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => {
          const blocked = action.publishes && !dealerApproved;
          return (
            <DropdownMenuItem
              key={action.to}
              disabled={blocked}
              onSelect={() => run(action.to, action.label)}
            >
              {action.label}
              {blocked ? (
                <span className="text-muted-foreground ml-auto text-xs">Dealer not approved</span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
