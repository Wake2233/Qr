'use client';

import type { HomeBoard as HomeBoardData, VehicleCard } from '@cp/api';
import { formatPrice } from '@cp/core';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, ImageOff, Pin, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { saveHomeOrder } from '@/app/dashboard/home/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAX_PINS = 100;
const OTHERS_VISIBLE = 20;

/** Pinned cars (drag to reorder, #1 = spotlight) and the other live cars that can be pinned. */
export function HomeBoard({ board }: { board: HomeBoardData }) {
  const [pinned, setPinned] = useState(board.pinned);
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pinnedIds = useMemo(() => new Set(pinned.map((card) => card.id)), [pinned]);
  const all = useMemo(() => [...board.pinned, ...board.others], [board]);
  const others = all.filter((card) => !pinnedIds.has(card.id));
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = others.filter((card) => {
    const haystack = `${card.title} ${card.stock_number ?? ''}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  /** Optimistic: show the new order right away, roll back if the save fails. */
  const save = (next: VehicleCard[], message: string) => {
    const previous = pinned;
    setPinned(next);
    startTransition(async () => {
      const result = await saveHomeOrder(next.map((card) => card.id));
      if (!result.ok) {
        setPinned(previous);
        toast.error(result.error);
      } else {
        toast.success(message);
      }
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= pinned.length) return;
    const card = pinned[from];
    save(
      arrayMove(pinned, from, to),
      to === 0 && card ? `${card.title} is the spotlight` : 'Order saved',
    );
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      pinned.findIndex((card) => card.id === active.id),
      pinned.findIndex((card) => card.id === over.id),
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section aria-labelledby="pinned-title" className="bg-card space-y-4 rounded-xl border p-5">
        <div className="space-y-1">
          <h2 id="pinned-title" className="font-display text-lg font-semibold">
            On the home page{' '}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              ({pinned.length})
            </span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Drag to reorder, or use the arrows. Changes go live right away.
          </p>
        </div>
        {pinned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            Nothing pinned: the home page shows the newest cars, and the newest one is the
            spotlight. Pin a car to put it first.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={pinned.map((card) => card.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className={cn('space-y-2', pending && 'opacity-80')}>
                {pinned.map((card, index) => (
                  <SortableRow
                    key={card.id}
                    card={card}
                    index={index}
                    last={index === pinned.length - 1}
                    disabled={pending}
                    onMove={move}
                    onRemove={() =>
                      save(
                        pinned.filter((c) => c.id !== card.id),
                        `${card.title} removed from the home page`,
                      )
                    }
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section aria-labelledby="others-title" className="bg-card space-y-4 rounded-xl border p-5">
        <div className="space-y-1">
          <h2 id="others-title" className="font-display text-lg font-semibold">
            Pin a car
          </h2>
          <p className="text-muted-foreground text-sm">
            Cars for sale that aren’t pinned. They appear after the pinned ones, newest first.
          </p>
        </div>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by make, model or stock #"
            aria-label="Search cars to pin"
            className="pl-9"
          />
        </div>
        {matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {others.length === 0 ? 'Every car for sale is pinned.' : 'No cars match that search.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {matches.slice(0, OTHERS_VISIBLE).map((card) => (
              <li key={card.id} className="flex items-center gap-3 rounded-lg border p-2">
                <Thumb card={card} />
                <CardText card={card} />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || pinned.length >= MAX_PINS}
                  onClick={() => save([...pinned, card], `${card.title} pinned`)}
                >
                  <Pin /> Pin
                </Button>
              </li>
            ))}
          </ul>
        )}
        {matches.length > OTHERS_VISIBLE ? (
          <p className="text-muted-foreground text-xs">
            Showing {OTHERS_VISIBLE} of {matches.length}. Search to find others.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function SortableRow({
  card,
  index,
  last,
  disabled,
  onMove,
  onRemove,
}: {
  card: VehicleCard;
  index: number;
  last: boolean;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-background flex items-center gap-2 rounded-lg border p-2',
        isDragging && 'relative z-10 shadow-lg',
        index === 0 && 'border-primary/60',
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground grid size-9 shrink-0 cursor-grab place-items-center rounded-md active:cursor-grabbing"
        aria-label={`Reorder ${card.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="text-muted-foreground w-5 shrink-0 text-center text-sm tabular-nums">
        {index + 1}
      </span>
      <Thumb card={card} />
      <CardText card={card} spotlight={index === 0} />
      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move ${card.title} up`}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move ${card.title} down`}
          disabled={disabled || last}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${card.title} from the home page`}
          disabled={disabled}
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
    </li>
  );
}

function Thumb({ card }: { card: VehicleCard }) {
  return (
    <div className="bg-muted relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-md">
      {card.cover_url ? (
        <Image
          src={card.cover_url}
          alt={card.cover_alt ?? card.title}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <ImageOff className="text-muted-foreground absolute inset-0 m-auto size-4" aria-hidden />
      )}
    </div>
  );
}

function CardText({ card, spotlight = false }: { card: VehicleCard; spotlight?: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Link href={`/dashboard/inventory/${card.id}`} className="truncate hover:underline">
          {card.title}
        </Link>
        {spotlight ? (
          <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
            Spotlight
          </span>
        ) : null}
      </p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {card.price_cents !== null ? formatPrice(card.price_cents) : 'No price'}
        {card.stock_number ? ` · Stock #${card.stock_number}` : ''}
      </p>
    </div>
  );
}
