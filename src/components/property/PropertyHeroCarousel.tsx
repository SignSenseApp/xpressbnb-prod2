import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';
import {
  galleryTransitionStyle,
  useTransformGallery,
} from '../../hooks/useTransformGallery';
import {
  PROPERTY_HERO_IMAGE_SIZES,
  propertyHeroImageSrc,
  propertyHeroImageSrcSet,
} from '../../lib/propertyImages';

const SWIPE_TRANSITION_MS = 420;

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
  const lastEmitted = useRef<number | null>(null);

  const gallery = useTransformGallery({
    slideCount: count,
    loop: count > 1,
    swipeEnabled: count > 1,
    reducedMotion,
  });

  useEffect(() => {
    if (lastEmitted.current === gallery.logicalIndex) return;
    lastEmitted.current = gallery.logicalIndex;
    onIndexChange?.(gallery.logicalIndex);
  }, [gallery.logicalIndex, onIndexChange]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      gallery.onPointerUp(e);
    },
    [gallery],
  );

  if (count === 0) return null;

  if (count === 1) {
    const src = propertyHeroImageSrc(images[0]);
    const srcSet = propertyHeroImageSrcSet(images[0]);
    return (
      <button
        type="button"
        onClick={() => onSlideClick?.(0)}
        className={`relative block h-full w-full overflow-hidden ${className}`}
        aria-label="View photograph 1"
      >
        <img
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? PROPERTY_HERO_IMAGE_SIZES : undefined}
          alt={`${title} — photograph 1`}
          width={1280}
          height={800}
          className={imageClassName}
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </button>
    );
  }

  return (
    <div
      className={`group/hero xpx-cinema-hero relative h-full w-full overflow-hidden ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} photographs`}
    >
      <div
        ref={gallery.containerRef as RefObject<HTMLDivElement>}
        className="h-full w-full overflow-hidden"
      >
        <div
          className="flex h-full touch-pan-y"
          style={galleryTransitionStyle(
            gallery.translateX,
            gallery.enableTransition,
            gallery.isDragging,
            reducedMotion ? 0 : SWIPE_TRANSITION_MS,
          )}
          onTransitionEnd={gallery.handleTransitionEnd}
          onPointerDown={gallery.onPointerDown}
          onPointerMove={gallery.onPointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={gallery.onPointerCancel}
          onClick={() => {
            if (gallery.didSwipe()) return;
            onSlideClick?.(gallery.logicalIndex);
          }}
        >
          {gallery.extendedSlideIndices.map((slideIndex, i) => {
            const url = resolveSlideUrl(images, slideIndex);
            const src = propertyHeroImageSrc(url);
            const srcSet = propertyHeroImageSrcSet(url);
            return (
              <img
                key={`${slideIndex}-${i}`}
                src={src}
                srcSet={srcSet}
                sizes={srcSet ? PROPERTY_HERO_IMAGE_SIZES : undefined}
                alt={`${title} — photograph ${gallery.logicalIndex + 1}`}
                width={1280}
                height={800}
                className={`${imageClassName} shrink-0 select-none pointer-events-none`}
                style={{
                  width: gallery.slideWidth || '100%',
                  minWidth: gallery.slideWidth || '100%',
                }}
                loading={i <= 2 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
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
              gallery.goPrev();
            }}
            className="xpx-cinema-hero-nav xpx-cinema-hero-nav--prev"
            aria-label="Previous photograph"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              gallery.goNext();
            }}
            className="xpx-cinema-hero-nav xpx-cinema-hero-nav--next"
            aria-label="Next photograph"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
