'use client';

import type { ConsoleVehicleImage } from '@cp/api';
import { MAX_VEHICLE_IMAGES, moveItem } from '@cp/core';
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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  deletePhoto,
  registerPhotos,
  reorderPhotos,
  requestPhotoUploads,
} from '@/app/dashboard/inventory/actions';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { env } from '@/lib/env';
import { prepareImage, uploadWithProgress } from '@/lib/images';
import { cn } from '@/lib/utils';

interface PhotoManagerProps {
  vehicleId: string;
  dealerId: string;
  title: string;
  images: ConsoleVehicleImage[];
  error?: string;
}

interface UploadItem {
  key: string;
  name: string;
  progress: number;
  failed?: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export function PhotoManager({ vehicleId, dealerId, title, images, error }: PhotoManagerProps) {
  const [order, setOrder] = useState(images);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Server data wins after each refresh (uploads, deletes, reorders).
  const [serverImages, setServerImages] = useState(images);
  if (images !== serverImages) {
    setServerImages(images);
    setOrder(images);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistOrder = (next: ConsoleVehicleImage[]) => {
    const previous = order;
    setOrder(next);
    startTransition(async () => {
      const result = await reorderPhotos(
        vehicleId,
        next.map((image) => image.id),
      );
      if (!result.ok) {
        setOrder(previous);
        toast.error(result.error);
      }
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.findIndex((image) => image.id === active.id);
    const to = order.findIndex((image) => image.id === over.id);
    persistOrder(arrayMove(order, from, to));
  };

  const remove = (image: ConsoleVehicleImage) =>
    startTransition(async () => {
      const result = await deletePhoto(vehicleId, {
        id: image.id,
        storage_path: image.storage_path,
      });
      if (result.ok) toast.success('Photo removed');
      else toast.error(result.error);
    });

  async function upload(files: File[]) {
    const room = MAX_VEHICLE_IMAGES - order.length;
    const accepted = files.filter((file) => file.type.startsWith('image/')).slice(0, room);
    if (files.length > accepted.length) {
      toast.warning(
        room <= 0
          ? `A listing can have at most ${MAX_VEHICLE_IMAGES} photos.`
          : `Only image files are added (up to ${room} more).`,
      );
    }
    if (accepted.length === 0) return;

    const items = accepted.map((file) => ({
      key: crypto.randomUUID(),
      name: file.name,
      progress: 0,
    }));
    setUploads((prev) => [...prev, ...items]);
    const setItem = (key: string, patch: Partial<UploadItem>) =>
      setUploads((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

    // Resize/encode in the browser first (fewer bytes over the wire).
    const prepared = await Promise.all(
      accepted.map(async (file, i) => {
        const item = items[i];
        try {
          return { item, image: await prepareImage(file) };
        } catch {
          if (item) setItem(item.key, { failed: 'Unsupported image' });
          return null;
        }
      }),
    );
    const ready = prepared.filter((p) => p !== null && p.item !== undefined) as {
      item: UploadItem;
      image: Awaited<ReturnType<typeof prepareImage>>;
    }[];
    if (ready.length === 0) return;

    const targets = await requestPhotoUploads({
      dealerId,
      vehicleId,
      files: ready.map(({ item, image }) => ({ fileId: item.key, extension: image.extension })),
    });
    if (!targets.ok) {
      toast.error(targets.error);
      setUploads((prev) => prev.filter((u) => !items.some((i) => i.key === u.key)));
      return;
    }

    const results = await Promise.all(
      ready.map(async ({ item, image }, i) => {
        const target = targets.data[i];
        if (!target) return null;
        try {
          await uploadWithProgress(
            target.signedUrl,
            image.blob,
            image.contentType,
            env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            (progress) => setItem(item.key, { progress }),
          );
          return {
            storage_path: target.path,
            width: image.width,
            height: image.height,
            blurhash: image.blurhash,
          };
        } catch (uploadError) {
          setItem(item.key, {
            failed: uploadError instanceof Error ? uploadError.message : 'Upload failed',
          });
          return null;
        }
      }),
    );

    const uploaded = results.filter((r) => r !== null);
    if (uploaded.length) {
      const saved = await registerPhotos(vehicleId, uploaded);
      if (saved.ok)
        toast.success(`${saved.data.count} photo${saved.data.count === 1 ? '' : 's'} added`);
      else toast.error(saved.error);
    }
    setUploads((prev) => prev.filter((u) => u.failed || !items.some((i) => i.key === u.key)));
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          'hover:bg-muted/50 focus-within:ring-ring flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:ring-2',
          dragOver && 'border-primary bg-primary/5',
          error && 'border-destructive',
        )}
      >
        <ImagePlus className="text-muted-foreground size-8" />
        <span className="font-medium">Drop photos here or click to choose</span>
        <span className="text-muted-foreground text-sm">
          JPEG, PNG or WebP. Resized to 2400px and compressed before upload. {order.length}/
          {MAX_VEHICLE_IMAGES} photos.
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            void upload(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </label>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {uploads.length ? (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((item) => (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              {item.failed ? null : <Loader2 className="size-4 animate-spin" />}
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.failed ? (
                <span className="text-destructive">{item.failed}</span>
              ) : (
                <Progress
                  value={item.progress * 100}
                  className="w-40"
                  aria-label={`Uploading ${item.name}`}
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {order.length ? (
        <>
          <p className="text-muted-foreground text-sm">
            Drag to reorder (or focus a photo and use the arrow keys with space). The first photo is
            the cover shown on listing cards.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order.map((image) => image.id)} strategy={rectSortingStrategy}>
              <ul
                className={cn(
                  'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
                  pending && 'opacity-80',
                )}
              >
                {order.map((image, index) => (
                  <SortablePhoto
                    key={image.id}
                    image={image}
                    index={index}
                    title={title}
                    disabled={pending}
                    onMakeCover={() => persistOrder(moveItem(order, index, 0))}
                    onRemove={() => remove(image)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      ) : null}
    </div>
  );
}

function SortablePhoto({
  image,
  index,
  title,
  disabled,
  onMakeCover,
  onRemove,
}: {
  image: ConsoleVehicleImage;
  index: number;
  title: string;
  disabled: boolean;
  onMakeCover: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const label = image.alt ?? `${title} photo ${index + 1}`;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-card group relative overflow-hidden rounded-lg border',
        isDragging && 'ring-primary z-10 shadow-lg ring-2',
      )}
    >
      <div className="bg-muted relative aspect-[4/3]">
        <Image
          src={image.url}
          alt={label}
          fill
          sizes="(min-width: 1024px) 220px, 45vw"
          className="object-cover"
        />
        {index === 0 ? (
          <span className="bg-background/90 absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium">
            Cover
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1 p-1.5">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-9 cursor-grab items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
          aria-label={`Reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        {index > 0 ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onMakeCover}>
            <Star /> Cover
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive ml-auto"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Delete ${label}`}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
