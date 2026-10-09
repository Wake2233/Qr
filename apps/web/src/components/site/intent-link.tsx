'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

/**
 * A `<Link>` that prefetches on intent (hover, touch, focus) instead of on entering the viewport.
 * For grids and rails of cards, where viewport prefetching would fetch every visible card's route.
 */
export function IntentLink({
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={(event) => {
        setActive(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        setActive(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setActive(true);
        onFocus?.(event);
      }}
    />
  );
}
