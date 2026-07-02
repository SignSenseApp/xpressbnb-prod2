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

/** Cinematic crossfade — slow editorial pacing (1100–1400ms). */
const FADE_MS = 1250;
const REVEAL_MS = 680;
const FADE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SWIPE_THRESHOLD_PX = 52;
const DESKTOP_LAYOUT_PX = 640;

type HeroOrientation = 'landscape' | 'portrait' | 'square';

type PropertyHeroCarouselProps = {
  images: string[];
  title: string;
  className?: string;
  imageClassName?: string;
  showArrows?: boolean;
  onSlideClick?: (index: number) => void;
  onIndexChange?: (index: number) => void;
  slideIndex?: number;
  onSlideIndexChange?: (index: number) => void;
  enableAutoplay?: boolean;
};

function orientationFromDimensions(width: number, height: number): HeroOrientation {
  if (!width || !height) return 'landscape';
  const ratio = width / height;
  if (ratio > 1.12) return 'landscape';
  if (ratio < 0.88) return 'portrait';
  return 'square';
}

function HeroImage({
  originalSrc,
  alt,
  loading,
  className,
  isActive,
  reducedMotion,
}: {
  originalSrc: string;
  alt: string;
  loading: 'lazy' | 'eager';
  className?: string;
  isActive: boolean;
  reducedMotion: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  const [orientation, setOrientation] = useState<HeroOrientation>('landscape');

  const src = propertyHeroImageSrc(originalSrc);
  const srcSet = propertyHeroImageSrcSet(originalSrc);

  useEffect(() => {
    setReady(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setOrientation(orientationFromDimensions(img.naturalWidth, img.naturalHeight));
      if (isActive) setReady(true);
    }
  }, [originalSrc, isActive]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setOrientation(orientationFromDimensions(img.naturalWidth, img.naturalHeight));
    if (isActive) setReady(true);
  };

  const orientationClass =
    orientation === 'portrait'
      ? 'xpx-cinema-hero-image--portrait'
      : orientation === 'square'
        ? 'xpx-cinema-hero-image--square'
        : 'xpx-cinema-hero-image--landscape';

  const revealStyle =
    isActive && ready
      ? { opacity: 1 }
      : isActive
        ? { opacity: 0 }
        : { opacity: 0 };

  return (
    <img
      ref={imgRef}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? PROPERTY_HERO_IMAGE_SIZES : undefined}
      alt={alt}
      className={`${className ?? ''} ${orientationClass} xpx-cinema-hero-image`.trim()}
      style={{
        ...revealStyle,
        transition: reducedMotion
          ? 'none'
          : `opacity ${isActive && !ready ? REVEAL_MS : FADE_MS}ms ${FADE_EASING}`,
      }}
      loading={loading}
      decoding="async"
      fetchPriority={isActive && loading === 'eager' ? 'high' : 'auto'}
      draggable={false}
      onLoad={handleLoad}
    />
  );
}

export default function PropertyHeroCarousel({
  images,
  title,
  className = '',
  imageClassName = 'h-full w-full',
  showArrows = true,
  onSlideClick,
  onIndexChange,
  slideIndex,
  onSlideIndexChange,
  enableAutoplay = false,
}: PropertyHeroCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  const isDesktopLayout = useIsDesktop(DESKTOP_LAYOUT_PX);
  const reducedMotion = usePrefersReducedMotion();
  const inViewport = useInViewport(rootRef, 0.25);
  const pageVisible = usePageVisible();

  const isControlled = slideIndex !== undefined;
  const [internalIndex, setInternalIndex] = useState(0);
  const index = isControlled ? slideIndex : internalIndex;

  const setIndex = useCallback(
    (next: number | ((prev: number) => number)) => {
      const resolved = typeof next === 'function' ? next(index) : next;
      if (isControlled) onSlideIndexChange?.(resolved);
      else setInternalIndex(resolved);
    },
    [index, isControlled, onSlideIndexChange],
  );

  const [hoverPaused, setHoverPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const autoplayRef = useRef<number | null>(null);

  const dragStartX = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const interactionPaused = hoverPaused || touchPaused;

  const autoplayEligible =
    enableAutoplay &&
    count > 1 &&
    !reducedMotion &&
    inViewport &&
    pageVisible &&
    !interactionPaused;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count, setIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count, setIndex]);

  const pauseAfterManualNav = useCallback(() => {
    setTouchPaused(true);
    window.setTimeout(() => setTouchPaused(false), 4000);
  }, []);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    if (!autoplayEligible) return;

    autoplayRef.current = window.setInterval(goNext, 6000);
    return () => {
      if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    };
  }, [autoplayEligible, goNext]);

  useEffect(
    () => () => {
      if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    },
    [],
  );

  const renderIndices = useMemo(() => {
    const indices = new Set<number>([0, index]);
    indices.add((index - 1 + count) % count);
    indices.add((index + 1) % count);
    return indices;
  }, [count, index]);

  if (count === 0) return null;

  if (count === 1) {
    return (
      <button
        type="button"
        onClick={() => onSlideClick?.(0)}
        className={`relative block h-full w-full overflow-hidden ${className}`}
        aria-label="View photograph 1"
      >
        <HeroImage
          originalSrc={images[0]}
          alt={`${title} — photograph 1`}
          className={imageClassName}
          loading="eager"
          isActive
          reducedMotion={reducedMotion}
        />
      </button>
    );
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
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
      pauseAfterManualNav();
      if (deltaX < 0) goNext();
      else goPrev();
    } else {
      window.setTimeout(() => setTouchPaused(false), 400);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`group/hero xpx-cinema-hero relative h-full w-full overflow-hidden ${className}`}
      role="region"
      aria-roledescription="sequence"
      aria-label={`${title} photographs`}
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
            key={`${originalSrc}-${i}`}
            type="button"
            onClick={() => onSlideClick?.(i)}
            className="absolute inset-0 h-full w-full overflow-hidden motion-reduce:transition-none"
            style={{
              opacity: i === index ? 1 : 0,
              transition: reducedMotion ? 'none' : `opacity ${FADE_MS}ms ${FADE_EASING}`,
              zIndex: i === index ? 1 : 0,
              pointerEvents: i === index ? 'auto' : 'none',
            }}
            aria-label={`View photograph ${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            <HeroImage
              originalSrc={originalSrc}
              alt={`${title} — photograph ${i + 1}`}
              className={`${imageClassName} select-none`}
              loading={i === 0 ? 'eager' : 'lazy'}
              isActive={i === index}
              reducedMotion={reducedMotion}
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
            className="xpx-cinema-hero-nav xpx-cinema-hero-nav--prev"
            aria-label="Previous photograph"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.15} aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pauseAfterManualNav();
              goNext();
            }}
            className="xpx-cinema-hero-nav xpx-cinema-hero-nav--next"
            aria-label="Next photograph"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.15} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
