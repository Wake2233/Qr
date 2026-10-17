'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useFavorites } from '@/lib/favorites/use-favorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  vehicleId: string;
  title: string;
  variant?: 'overlay' | 'outline';
  className?: string;
}

export function FavoriteButton({
  vehicleId,
  title,
  variant = 'overlay',
  className,
}: FavoriteButtonProps) {
  const { isSaved, toggle, ready } = useFavorites();
  const saved = isSaved(vehicleId);
  const t = useTranslations('Card');
  return (
    <Button
      type="button"
      size={variant === 'overlay' ? 'icon' : 'default'}
      variant={variant === 'overlay' ? 'secondary' : 'outline'}
      aria-pressed={saved}
      aria-label={t(saved ? 'unsaveTitle' : 'saveTitle', { title })}
      disabled={!ready}
      onClick={() => toggle(vehicleId)}
      className={cn(
        variant === 'overlay' &&
          'bg-background/85 hover:bg-background size-10 rounded-full shadow-sm backdrop-blur',
        className,
      )}
    >
      <Heart className={cn('size-5', saved && 'fill-rose-500 text-rose-500')} />
      {variant === 'outline' ? t(saved ? 'saved' : 'save') : null}
    </Button>
  );
}
