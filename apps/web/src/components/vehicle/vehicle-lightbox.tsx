'use client';

import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';

import Lightbox from 'yet-another-react-lightbox';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';

interface VehicleLightboxProps {
  index: number;
  slides: { src: string; alt: string; width?: number; height?: number }[];
  onClose: () => void;
  onView: (index: number) => void;
}

/** Fullscreen zoomable photo viewer; loaded on demand by the gallery. */
export function VehicleLightbox({ index, slides, onClose, onView }: VehicleLightboxProps) {
  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      on={{ view: ({ index: viewed }) => onView(viewed) }}
      slides={slides}
      plugins={[Zoom, Fullscreen, Counter]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      carousel={{ finite: slides.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
    />
  );
}
