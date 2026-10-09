'use client';

import { vehicleImageAlt } from '@cp/core';
import useEmblaCarousel from 'embla-carousel-react';
import { Car, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { blurhashDataUrl } from '@/lib/blurhash';
import { cn } from '@/lib/utils';

const loadLightbox = () => import('./vehicle-lightbox');
const VehicleLightbox = dynamic(() => loadLightbox().then((mod) => mod.VehicleLightbox), {
  ssr: false,
});

export interface GalleryImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  alt: string | null;
}

/** VDP gallery: swipeable main image, thumbnail strip, and a zoomable fullscreen lightbox. */
export function VehicleGallery({ title, images }: { title: string; images: GalleryImage[] }) {
  const [viewportRef, embla] = useEmblaCarousel({ loop: images.length > 1 });
  const [thumbsRef, thumbs] = useEmblaCarousel({ dragFree: true, containScroll: 'keepSnaps' });
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      const selected = embla.selectedScrollSnap();
      setIndex(selected);
      thumbs?.scrollTo(selected);
    };
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, thumbs]);

  const go = useCallback((to: number) => embla?.scrollTo(to), [embla]);
  const alt = (image: GalleryImage, i: number) => image.alt ?? vehicleImageAlt(title, null, i);

  if (images.length === 0) {
    return (
      <div className="bg-muted text-muted-foreground grid aspect-[4/3] place-items-center rounded-2xl">
        <Car className="size-12" aria-hidden />
        <span className="sr-only">No photos yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
        className="group bg-muted relative overflow-hidden rounded-2xl"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') embla?.scrollPrev();
          if (event.key === 'ArrowRight') embla?.scrollNext();
        }}
      >
        <div ref={viewportRef} className="overflow-hidden">
          <div className="flex touch-pan-y">
            {images.map((image, i) => {
              const blur = blurhashDataUrl(image.blurhash);
              return (
                <div
                  key={image.id}
                  className="relative aspect-[4/3] min-w-0 flex-[0_0_100%]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${images.length}`}
                >
                  <button
                    type="button"
                    className="absolute inset-0 cursor-zoom-in outline-none"
                    onClick={() => setLightbox(i)}
                    onPointerEnter={() => void loadLightbox()}
                    onTouchStart={() => void loadLightbox()}
                    aria-label={`Open photo ${i + 1} full screen`}
                    tabIndex={i === index ? 0 : -1}
                  >
                    <Image
                      src={image.url}
                      alt={alt(image, i)}
                      fill
                      sizes="(min-width: 1280px) 820px, (min-width: 1024px) 60vw, 100vw"
                      priority={i === 0}
                      placeholder={blur ? 'blur' : 'empty'}
                      blurDataURL={blur}
                      className="object-cover"
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {images.length > 1 ? (
          <>
            <GalleryArrow side="left" onClick={() => embla?.scrollPrev()} />
            <GalleryArrow side="right" onClick={() => embla?.scrollNext()} />
          </>
        ) : null}
        <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-2">
          <span className="bg-background/85 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur">
            {index + 1} / {images.length}
          </span>
          <span className="bg-background/85 grid size-7 place-items-center rounded-full backdrop-blur">
            <Expand className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>

      {images.length > 1 ? (
        <div ref={thumbsRef} className="overflow-hidden">
          <ul className="flex gap-2" aria-label="Choose a photo">
            {images.map((image, i) => (
              <li key={image.id} className="flex-[0_0_22%] sm:flex-[0_0_15%]">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    'bg-muted focus-visible:ring-ring relative block aspect-[4/3] w-full overflow-hidden rounded-lg outline-none focus-visible:ring-2',
                    i === index ? 'ring-primary ring-2' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="140px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lightbox !== null ? (
        <VehicleLightbox
          index={lightbox}
          onClose={() => setLightbox(null)}
          onView={go}
          slides={images.map((image, i) => ({
            src: image.url,
            alt: alt(image, i),
            width: image.width ?? undefined,
            height: image.height ?? undefined,
          }))}
        />
      ) : null}
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'bg-background/85 hover:bg-background focus-visible:ring-ring absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full shadow-md backdrop-blur transition outline-none focus-visible:ring-2 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
