import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useInViewport,
  useIsDesktop,
  usePageVisible,
  usePrefersReducedMotion,
} from '../../hooks/useGalleryMotion';
import {
  PROPERTY_HERO_IMAGE_SIZES,
  propertyHeroImageSrc,
  propertyHeroImageSrcSet,
} from '../../lib/propertyImages';

/** Desktop hero advance — 4–5s premium pacing. */
const DESKTOP_AUTOPLAY_MS = 4500;
/** Mobile resumes on same cadence after user engagement. */
const MOBILE_AUTOPLAY_MS = 4500;
const RESUME_AFTER_MS = 5000;
const FADE_MS = 650;
const FADE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SWIPE_THRESHOLD_PX = 48;
/** Matches PropertyGallery `sm:` layout split. */
const DESKTOP_LAYOUT_PX = 640;

type PropertyHeroCarouselProps = {
  images: string[];
  title: string;
  className?: string;
  imageClassName?: string;
  showArrows?: boolean;
  onSlideClick?: (index: number) => void;
  onIndexChange?: (index: number) => void;
};

function HeroImage({
  originalSrc,
  alt,
  loading,
  className,
  isActive,
}: {
  originalSrc: string;
  alt: string;
  loading: 'lazy' | 'eager';
  className?: string;
  isActive: boolean;
}) {
  const src = propertyHeroImageSrc(originalSrc);
  const srcSet = propertyHeroImageSrcSet(originalSrc);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? PROPERTY_HERO_IMAGE_SIZES : undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={isActive && loading === 'eager' ? 'high' : 'auto'}
      draggable={false}
    />
  );
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
  const rootRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  const isDesktopLayout = useIsDesktop(DESKTOP_LAYOUT_PX);
  const reducedMotion = usePrefersReducedMotion();
  const inViewport = useInViewport(rootRef, 0.25);
  const pageVisible = usePageVisible();

  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const [userEngaged, setUserEngaged] = useState(false);
  const autoplayRef = useRef<number | null>(null);
  const resumeRef = useRef<number | null>(null);

  const dragStartX = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const markEngaged = useCallback(() => {
    setUserEngaged(true);
  }, []);

  const interactionPaused = hoverPaused || touchPaused;

  const autoplayEligible =
    count > 1 &&
    !reducedMotion &&
    inViewport &&
    pageVisible &&
    !interactionPaused &&
    (isDesktopLayout || userEngaged);

  const autoplayMs = isDesktopLayout ? DESKTOP_AUTOPLAY_MS : MOBILE_AUTOPLAY_MS;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const scheduleResume = useCallback(() => {
    if (resumeRef.current != null) window.clearTimeout(resumeRef.current);
    resumeRef.current = window.setTimeout(() => setTouchPaused(false), RESUME_AFTER_MS);
  }, []);

  const pauseAfterManualNav = useCallback(() => {
    markEngaged();
    setTouchPaused(true);
    scheduleResume();
  }, [markEngaged, scheduleResume]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    if (!autoplayEligible) return;

    autoplayRef.current = window.setInterval(goNext, autoplayMs);
    return () => {
      if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    };
  }, [autoplayEligible, autoplayMs, goNext]);

  useEffect(
    () => () => {
      if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
      if (resumeRef.current != null) window.clearTimeout(resumeRef.current);
    },
    [],
  );

  const renderIndices = useMemo(() => {
    const indices = new Set<number>([0, index]);
    if (isDesktopLayout || userEngaged) {
      indices.add((index + 1) % count);
    }
    return indices;
  }, [count, index, isDesktopLayout, userEngaged]);

  if (count === 0) return null;

  if (count === 1) {
    return (
      <button
        type="button"
        onClick={() => onSlideClick?.(0)}
        className={`relative block h-full w-full overflow-hidden ${className}`}
        aria-label="View photo 1"
      >
        <HeroImage
          originalSrc={images[0]}
          alt={`${title} — photo 1`}
          className={imageClassName}
          loading="eager"
          isActive
        />
      </button>
    );
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    markEngaged();
    setTouchPaused(true);
    dragStartX.current = e.clientX;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const deltaX = e.clientX - dragStartX.current;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    pointerIdRef.current = null;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
    scheduleResume();
  };

  return (
    <div
      ref={rootRef}
      className={`group/hero relative h-full w-full overflow-hidden ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} photos`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          pauseAfterManualNav();
          goPrev();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          pauseAfterManualNav();
          goNext();
        }
      }}
      onMouseEnter={() => isDesktopLayout && setHoverPaused(true)}
      onMouseLeave={() => isDesktopLayout && setHoverPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {images.map((originalSrc, i) => {
        if (!renderIndices.has(i)) return null;
        return (
          <button
            key={originalSrc}
            type="button"
            onClick={() => onSlideClick?.(i)}
            className="absolute inset-0 h-full w-full overflow-hidden motion-reduce:transition-none"
            style={{
              opacity: i === index ? 1 : 0,
              transition: reducedMotion ? 'none' : `opacity ${FADE_MS}ms ${FADE_EASING}`,
              zIndex: i === index ? 1 : 0,
              pointerEvents: i === index ? 'auto' : 'none',
            }}
            aria-label={`View photo ${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            <HeroImage
              originalSrc={originalSrc}
              alt={`${title} — photo ${i + 1}`}
              className={`${imageClassName} select-none`}
              loading={i === 0 ? 'eager' : 'lazy'}
              isActive={i === index}
            />
          </button>
        );
      })}

      {showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pauseAfterManualNav();
              goPrev();
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
              pauseAfterManualNav();
              goNext();
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
