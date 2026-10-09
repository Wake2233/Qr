'use client';

import { centsToDollarInput, formatPrice, parseDollarsToCents } from '@cp/core';
import { Pencil } from 'lucide-react';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { changeVehiclePrice } from '@/app/dashboard/inventory/actions';
import { Input } from '@/components/ui/input';

/** Click-to-edit price. Enter saves, Escape cancels; the price-history trigger logs the change. */
export function PriceCell({
  vehicleId,
  priceCents,
}: {
  vehicleId: string;
  priceCents: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [optimistic, setOptimistic] = useOptimistic(priceCents);
  const [pending, startTransition] = useTransition();
  const cancelled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Select the current price so typing replaces it (autoFocus alone leaves the caret at the end).
  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const start = () => {
    cancelled.current = false;
    setValue(centsToDollarInput(optimistic));
    setEditing(true);
  };

  const save = () => {
    setEditing(false);
    if (cancelled.current) return;
    const cents = parseDollarsToCents(value);
    if (cents === null || cents <= 0) {
      if (value.trim()) toast.error('Enter a price above $0, like 45990');
      return;
    }
    if (cents === optimistic) return;
    startTransition(async () => {
      setOptimistic(cents);
      const result = await changeVehiclePrice(vehicleId, cents);
      if (result.ok) toast.success(`Price updated to ${formatPrice(cents)}`);
      else toast.error(result.error);
    });
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        inputMode="decimal"
        aria-label="Price in dollars"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            cancelled.current = true;
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-28 text-right tabular-nums"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      className="group hover:bg-muted focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 tabular-nums focus-visible:ring-2 focus-visible:outline-none"
      aria-label={`Edit price${optimistic ? ` (${formatPrice(optimistic)})` : ''}`}
    >
      <span className={optimistic ? 'font-medium' : 'text-muted-foreground'}>
        {optimistic ? formatPrice(optimistic) : 'Add price'}
      </span>
      <Pencil className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
