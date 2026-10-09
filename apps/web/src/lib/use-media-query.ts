'use client';

import { useSyncExternalStore } from 'react';

/**
 * Live `matchMedia` result. The server render (and hydration) always sees `false`, so use it
 * only for UI that may appear after hydration without shifting layout.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
