import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';

const HERO_AUTOPLAY_MS = 4000;
const RESUME_AFTER_MS = 5000;
const FADE_MS = 600;
const SWIPE_THRESHOLD_PX = 48;

type PropertyHeroCarouselProps = {
  images: string[];
  title: string;
  className?: string;
  imageClassName?: string;
  showArrows?: boolean;
  onSlideClick?: (index: number) => void;
  onIndexChange?: (index: number) => void;
};

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
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const autoplayRef = useRef<number | null>(null);
  const resumeRef = useRef<number | null>(null);

  const dragStartX = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const paused = hoverPaused || touchPaused;

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

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    if (count <= 1 || reducedMotion || paused) return;

    autoplayRef.current = window.setInterval(goNext, HERO_AUTOPLAY_MS);
    return () => {
      if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
    };
  }, [count, goNext, paused, reducedMotion]);

  useEffect(
    () => () => {
      if (autoplayRef.current != null) window.clearInterval(autoplayRef.current);
      if (resumeRef.current != null) window.clearTimeout(resumeRef.current);
    },
    [],
  );

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
      if (deltaX < 0) goNext();
      else goPrev();
    }
    scheduleResume();
  };

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
          goPrev();
          scheduleResume();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setTouchPaused(true);
          goNext();
          scheduleResume();
        }
      }}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {images.map((src, i) => (
        <button
          key={src}
          type="button"
          onClick={() => onSlideClick?.(i)}
          className="absolute inset-0 h-full w-full overflow-hidden"
          style={{
            opacity: i === index ? 1 : 0,
            transition: reducedMotion ? 'none' : `opacity ${FADE_MS}ms ease-out`,
            zIndex: i === index ? 1 : 0,
            pointerEvents: i === index ? 'auto' : 'none',
          }}
          aria-label={`View photo ${i + 1} of ${count}`}
        >
          <img
            src={src}
            alt={`${title} — photo ${i + 1}`}
            className={`${imageClassName} select-none`}
            loading={i <= 1 ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
          />
        </button>
      ))}

      {showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTouchPaused(true);
              goPrev();
              scheduleResume();
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
              goNext();
              scheduleResume();
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
