'use client';

import { MAX_COMPARE } from '@cp/core';
import { GitCompareArrows } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/lib/stores/compare';
import { cn } from '@/lib/utils';

interface CompareToggleProps {
  vehicleId: string;
  title: string;
  variant?: 'overlay' | 'outline';
  className?: string;
}

/** Adds/removes a vehicle from the compare tray (≤4, persisted). */
export function CompareToggle({
  vehicleId,
  title,
  variant = 'overlay',
  className,
}: CompareToggleProps) {
  const selected = useCompareStore((s) => s.ids.includes(vehicleId));
  const add = useCompareStore((s) => s.add);
  const remove = useCompareStore((s) => s.remove);

  const onClick = () => {
    if (selected) return remove(vehicleId);
    if (add(vehicleId) === 'full') {
      toast.error(`You can compare up to ${MAX_COMPARE} vehicles. Remove one first.`);
    }
  };

  return (
    <Button
      type="button"
      size={variant === 'overlay' ? 'icon' : 'default'}
      variant={variant === 'overlay' ? 'secondary' : 'outline'}
      aria-pressed={selected}
      aria-label={selected ? `Remove ${title} from compare` : `Add ${title} to compare`}
      onClick={onClick}
      className={cn(
        variant === 'overlay' &&
          'bg-background/85 hover:bg-background size-10 rounded-full shadow-sm backdrop-blur',
        selected && 'text-primary',
        className,
      )}
    >
      <GitCompareArrows className="size-5" />
      {variant === 'outline' ? (selected ? 'In compare' : 'Compare') : null}
    </Button>
  );
}
