import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';
import {
  galleryTransitionStyle,
  useTransformGallery,
} from '../../hooks/useTransformGallery';

const HERO_AUTOPLAY_MS = 4000;
const RESUME_AFTER_MS = 3000;
const TRANSITION_MS = 450;

type PropertyHeroCarouselProps = {
  images: string[];
  title: string;
  className?: string;
  imageClassName?: string;
  showArrows?: boolean;
  onSlideClick?: (index: number) => void;
  onIndexChange?: (index: number) => void;
};

function resolveSlideUrl(images: string[], index: number): string {
  if (index < 0) return images[images.length - 1] ?? '';
  if (index >= images.length) return images[0] ?? '';
  return images[index] ?? '';
}

export default function PropertyHeroCarousel({
  images,
  title,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  showArrows = true,
  onSlideClick,
  onIndexChange,
}: PropertyHeroCarouselProps) {
  const count = images.length;
  const reducedMotion = usePrefersReducedMotion();
  const [hoverPaused, setHoverPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);

  const gallery = useTransformGallery({
    slideCount: count,
    loop: true,
    autoplayMs: HERO_AUTOPLAY_MS,
    active: count > 1 && !reducedMotion,
    paused: hoverPaused || touchPaused,
    transitionMs: TRANSITION_MS,
    resumeAfterMs: RESUME_AFTER_MS,
    swipeEnabled: count > 1,
    reducedMotion,
  });

  useEffect(() => {
    onIndexChange?.(gallery.logicalIndex);
  }, [gallery.logicalIndex, onIndexChange]);

  useEffect(() => {
    if (!gallery.isDragging && touchPaused) {
      const timer = window.setTimeout(() => setTouchPaused(false), RESUME_AFTER_MS);
      return () => window.clearTimeout(timer);
    }
  }, [gallery.isDragging, touchPaused]);

  if (count === 0) return null;

  if (count === 1) {
    return (
      <button
        type="button"
        onClick={() => onSlideClick?.(0)}
        className={`relative block h-full w-full overflow-hidden ${className}`}
        aria-label="View photo 1"
      >
        <img
          src={images[0]}
          alt={`${title} — photo 1`}
          className={imageClassName}
          loading="eager"
          decoding="async"
        />
      </button>
    );
  }

  return (
    <div
      className={`group/hero relative h-full w-full overflow-hidden ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} photos`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setTouchPaused(true);
          gallery.goPrev();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setTouchPaused(true);
          gallery.goNext();
        }
      }}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div ref={gallery.containerRef} className="h-full w-full overflow-hidden">
        <div
          className="flex h-full touch-pan-y"
          style={galleryTransitionStyle(
            gallery.translateX,
            gallery.enableTransition,
            gallery.isDragging,
            TRANSITION_MS,
          )}
          onTransitionEnd={gallery.handleTransitionEnd}
          onPointerDown={(e) => {
            setTouchPaused(true);
            gallery.onPointerDown(e);
          }}
          onPointerMove={gallery.onPointerMove}
          onPointerUp={gallery.onPointerUp}
          onPointerCancel={gallery.onPointerCancel}
        >
          {gallery.extendedSlideIndices.map((slideIndex, i) => {
            const logical =
              slideIndex < 0 ? count - 1 : slideIndex >= count ? 0 : slideIndex;
            return (
              <button
                key={`${slideIndex}-${i}`}
                type="button"
                onClick={() => onSlideClick?.(logical)}
                className="relative h-full shrink-0 overflow-hidden"
                style={{ width: gallery.slideWidth || '100%' }}
                aria-label={`View photo ${logical + 1} of ${count}`}
              >
                <img
                  src={resolveSlideUrl(images, slideIndex)}
                  alt={`${title} — photo ${logical + 1}`}
                  className={`${imageClassName} select-none`}
                  loading={i <= 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTouchPaused(true);
              gallery.goPrev();
            }}
            className="absolute left-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/hero:opacity-100"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTouchPaused(true);
              gallery.goNext();
            }}
            className="absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/hero:opacity-100"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
