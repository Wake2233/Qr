'use client';

import { useVehiclesByIds } from '@cp/api';
import { compareHref } from '@cp/core';
import { AnimatePresence, LazyMotion, m, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/lib/stores/compare';

// The tray is on every storefront page: load motion's animation features only when needed.
const loadFeatures = () => import('@/lib/motion-features').then((mod) => mod.domAnimation);

/** Floating compare tray, shown on storefront pages while vehicles are selected. */
export function CompareTray() {
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const { supabase } = useAuth();
  const { data: cards = [] } = useVehiclesByIds(supabase, ids);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const visible = ids.length > 0 && pathname !== '/compare';

  return (
    <LazyMotion features={loadFeatures} strict>
      <AnimatePresence>
        {visible ? (
          <m.aside
            aria-label="Compare tray"
            initial={reduceMotion ? false : { y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="bg-background/90 fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl max-lg:bottom-24 lg:bottom-6"
          >
            <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
              {ids.map((id) => {
                const card = cards.find((c) => c.id === id);
                return (
                  <li
                    key={id}
                    className="bg-muted relative h-12 w-16 shrink-0 overflow-hidden rounded-lg"
                  >
                    {card?.cover_url ? (
                      <Image
                        src={card.cover_url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      aria-label={`Remove ${card?.title ?? 'vehicle'} from compare`}
                      className="bg-background/90 absolute top-0.5 right-0.5 grid size-6 place-items-center rounded-full"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
            <Button asChild size="sm">
              <Link href={compareHref(ids)}>Compare ({ids.length})</Link>
            </Button>
          </m.aside>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}
