import { useEffect, useRef, type RefObject } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';
import {
  galleryTransitionStyle,
  useTransformGallery,
} from '../../hooks/useTransformGallery';
import {
  PROPERTY_GALLERY_THUMB_SIZES,
  PROPERTY_LIGHTBOX_IMAGE_SIZES,
  propertyGalleryThumbSrc,
  propertyGalleryThumbSrcSet,
  propertyLightboxImageSrc,
  propertyLightboxImageSrcSet,
} from '../../lib/propertyImages';

const TOUR_TRANSITION_MS = 380;

type PropertyPhotoTourProps = {
  images: string[];
  title: string;
  startIndex: number;
  onClose: () => void;
};

function resolveSlideUrl(images: string[], index: number): string {
  if (index < 0) return images[images.length - 1] ?? '';
  if (index >= images.length) return images[0] ?? '';
  return images[index] ?? '';
}

/**
 * Full-screen photo tour — VRBO-style: slide the photo, arrows, swipe, filmstrip.
 */
export default function PropertyPhotoTour({
  images,
  title,
  startIndex,
  onClose,
}: PropertyPhotoTourProps) {
  const count = images.length;
  const reducedMotion = usePrefersReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);

  const gallery = useTransformGallery({
    slideCount: count,
    loop: count > 1,
    swipeEnabled: count > 1,
    reducedMotion,
    initialIndex: startIndex,
  });

  const index = gallery.logicalIndex;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const goNext = gallery.goNext;
  const goPrev = gallery.goPrev;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    const active = stripRef.current?.querySelector('[aria-current="true"]');
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [index, reducedMotion]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[120] xpx-property-gallery-lightbox flex flex-col"
    >
      <div className="relative z-[2] flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 shrink-0">
        <p
          className="px-3.5 py-1.5 rounded-full text-sm font-semibold tabular-nums"
          style={{ background: 'rgba(0,0,0,0.45)', color: 'var(--xpx-on-dark)' }}
        >
          {index + 1} / {count}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.16)', minHeight: 44, minWidth: 44 }}
          aria-label="Close photo viewer"
        >
          <X className="w-6 h-6" style={{ color: 'var(--xpx-on-dark)' }} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center">
        {count > 1 && (
          <button
            type="button"
            onClick={gallery.goPrev}
            className="absolute left-2 sm:left-4 z-[3] w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.94)', color: 'var(--xpx-text)' }}
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </button>
        )}

        <div
          ref={gallery.containerRef as RefObject<HTMLDivElement>}
          className="h-full w-full overflow-hidden"
        >
          <div
            className="flex h-full items-center touch-pan-y"
            style={galleryTransitionStyle(
              gallery.translateX,
              gallery.enableTransition,
              gallery.isDragging,
              reducedMotion ? 0 : TOUR_TRANSITION_MS,
            )}
            onTransitionEnd={gallery.handleTransitionEnd}
            onPointerDown={gallery.onPointerDown}
            onPointerMove={gallery.onPointerMove}
            onPointerUp={gallery.onPointerUp}
            onPointerCancel={gallery.onPointerCancel}
          >
            {gallery.extendedSlideIndices.map((slideIndex, i) => {
              const url = resolveSlideUrl(images, slideIndex);
              const src = propertyLightboxImageSrc(url);
              const srcSet = propertyLightboxImageSrcSet(url);
              return (
                <div
                  key={`tour-${slideIndex}-${i}`}
                  className="shrink-0 h-full flex items-center justify-center px-12 sm:px-20"
                  style={{
                    width: gallery.slideWidth || '100%',
                    minWidth: gallery.slideWidth || '100%',
                  }}
                >
                  <img
                    src={src}
                    srcSet={srcSet}
                    sizes={srcSet ? PROPERTY_LIGHTBOX_IMAGE_SIZES : undefined}
                    alt={`${title} — photo ${index + 1}`}
                    width={1280}
                    height={800}
                    className="max-h-full max-w-full object-contain select-none pointer-events-none rounded-md"
                    loading={i <= 2 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {count > 1 && (
          <button
            type="button"
            onClick={gallery.goNext}
            className="absolute right-2 sm:right-4 z-[3] w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.94)', color: 'var(--xpx-text)' }}
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="shrink-0 pb-4 pt-2 px-3">
          <div ref={stripRef} className="flex gap-2 overflow-x-auto scrollbar-hide justify-start sm:justify-center">
            {images.map((img, i) => {
              const lbThumb = propertyGalleryThumbSrc(img);
              const thumbSrcSet = propertyGalleryThumbSrcSet(img);
              return (
                <button
                  key={`lb-${i}`}
                  type="button"
                  onClick={() => gallery.goTo(i)}
                  className={`shrink-0 w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] rounded-lg overflow-hidden border-2 transition-opacity ${
                    i === index ? 'border-white opacity-100' : 'border-transparent opacity-55 hover:opacity-100'
                  }`}
                  aria-label={`Jump to photo ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                >
                  <img
                    src={lbThumb}
                    srcSet={thumbSrcSet}
                    sizes={thumbSrcSet ? PROPERTY_GALLERY_THUMB_SIZES : undefined}
                    alt=""
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
