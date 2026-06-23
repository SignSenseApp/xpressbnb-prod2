import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Property } from '../lib/database.types';
import ConversionPropertyCard from './ConversionPropertyCard';

const AUTOPLAY_MS = 5000;
const TRANSITION_MS = 450;
const RESUME_AFTER_INTERACTION_MS = 3000;
const SWIPE_THRESHOLD_PX = 48;
const GAP_PX = 16;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

function visibleSlideCount(containerWidth: number): number {
  if (containerWidth >= 1280) return 4;
  if (containerWidth >= 1024) return 3;
  if (containerWidth >= 768) return 2;
  return 1;
}

function slideWidthForContainer(containerWidth: number, visible: number): number {
  if (visible <= 1) {
    return Math.min(380, Math.round(containerWidth * 0.88));
  }
  const totalGap = GAP_PX * (visible - 1);
  return Math.min(380, Math.floor((containerWidth - totalGap) / visible));
}

type FeaturedStaysCarouselProps = {
  properties: Property[];
};

/**
 * GPU-accelerated Featured Stays carousel — autoplay, infinite loop, touch swipe.
 * Replaces scrollLeft-based HorizontalScrollCards.
 */
export default function FeaturedStaysCarousel({ properties }: FeaturedStaysCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<number | null>(null);

  const count = properties.length;
  const loopEnabled = count > 1;

  const extendedSlides = useMemo(() => {
    if (!loopEnabled) return properties;
    return [properties[count - 1], ...properties, properties[0]];
  }, [properties, count, loopEnabled]);

  const [trackIndex, setTrackIndex] = useState(loopEnabled ? 1 : 0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragAxisLock = useRef<'x' | 'y' | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();

  const visible = visibleSlideCount(containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 360));
  const slideWidth = containerWidth > 0 ? slideWidthForContainer(containerWidth, visible) : 320;
  const stride = slideWidth + GAP_PX;

  const logicalIndex = loopEnabled
    ? (trackIndex - 1 + count) % count
    : Math.min(trackIndex, Math.max(count - 1, 0));

  const baseOffset = -trackIndex * stride;
  const translateX = baseOffset + (isDragging ? dragOffset : 0);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current != null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current != null) {
      window.clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const pauseInteraction = useCallback(() => {
    setIsPaused(true);
    clearResumeTimer();
  }, [clearResumeTimer]);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      setIsPaused(false);
    }, RESUME_AFTER_INTERACTION_MS);
  }, [clearResumeTimer]);

  const goNext = useCallback(() => {
    if (!loopEnabled) {
      setTrackIndex((i) => Math.min(i + 1, count - 1));
      return;
    }
    setEnableTransition(true);
    setTrackIndex((i) => i + 1);
  }, [count, loopEnabled]);

  const goPrev = useCallback(() => {
    if (!loopEnabled) {
      setTrackIndex((i) => Math.max(i - 1, 0));
      return;
    }
    setEnableTransition(true);
    setTrackIndex((i) => i - 1);
  }, [loopEnabled]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  const handleTransitionEnd = useCallback(() => {
    if (!loopEnabled) return;
    if (trackIndex === count + 1) {
      setEnableTransition(false);
      setTrackIndex(1);
    } else if (trackIndex === 0) {
      setEnableTransition(false);
      setTrackIndex(count);
    }
  }, [count, loopEnabled, trackIndex]);

  useEffect(() => {
    setTrackIndex(loopEnabled ? 1 : 0);
    setEnableTransition(false);
  }, [properties, loopEnabled]);

  useEffect(() => {
    if (!enableTransition) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [enableTransition]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    clearAutoplayTimer();
    if (prefersReducedMotion || isPaused || isDragging || count <= 1) return;

    autoplayTimerRef.current = window.setInterval(() => {
      goNextRef.current();
    }, AUTOPLAY_MS);

    return clearAutoplayTimer;
  }, [clearAutoplayTimer, count, isDragging, isPaused, prefersReducedMotion]);

  useEffect(
    () => () => {
      clearAutoplayTimer();
      clearResumeTimer();
    },
    [clearAutoplayTimer, clearResumeTimer],
  );

  const finishDrag = useCallback(
    (deltaX: number) => {
      setIsDragging(false);
      setDragOffset(0);
      dragAxisLock.current = null;
      pointerIdRef.current = null;

      if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
        if (deltaX < 0) goNext();
        else goPrev();
      }

      scheduleResume();
    },
    [goNext, goPrev, scheduleResume],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pauseInteraction();
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragAxisLock.current = null;
    pointerIdRef.current = e.pointerId;
    setIsDragging(true);
    setDragOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;

    if (dragAxisLock.current == null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      dragAxisLock.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (dragAxisLock.current === 'y') return;

    e.preventDefault();
    setDragOffset(dx);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const deltaX = e.clientX - dragStartX.current;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    finishDrag(dragAxisLock.current === 'x' ? deltaX : 0);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    finishDrag(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      pauseInteraction();
      goPrev();
      scheduleResume();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      pauseInteraction();
      goNext();
      scheduleResume();
    }
  };

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsPaused(false);
      }}
    >
      {loopEnabled && (
        <>
          <button
            type="button"
            onClick={() => {
              pauseInteraction();
              goPrev();
              scheduleResume();
            }}
            className="absolute left-0 top-[calc(110px)] z-[2] hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)] transition-opacity hover:opacity-90 md:flex lg:top-[calc(50%-60px)]"
            aria-label="Previous featured stay"
          >
            <ChevronLeft className="h-4 w-4 text-[#0F172A]" />
          </button>
          <button
            type="button"
            onClick={() => {
              pauseInteraction();
              goNext();
              scheduleResume();
            }}
            className="absolute right-0 top-[calc(110px)] z-[2] hidden h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)] transition-opacity hover:opacity-90 md:flex lg:top-[calc(50%-60px)]"
            aria-label="Next featured stay"
          >
            <ChevronRight className="h-4 w-4 text-[#0F172A]" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className="overflow-hidden touch-pan-y"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured Stays"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div
          className="flex cursor-grab active:cursor-grabbing"
          style={{
            gap: GAP_PX,
            transform: `translate3d(${translateX}px, 0, 0)`,
            transition:
              isDragging || !enableTransition
                ? 'none'
                : `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: 'transform',
          }}
          onTransitionEnd={handleTransitionEnd}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {extendedSlides.map((property, index) => (
            <div
              key={`${property.id}-${index}`}
              className="shrink-0"
              style={{ width: slideWidth }}
              aria-hidden={loopEnabled ? index !== trackIndex : index !== logicalIndex}
            >
              <ConversionPropertyCard
                property={property}
                className="mx-0 w-full max-w-none md:mx-0"
              />
            </div>
          ))}
        </div>
      </div>

      {loopEnabled && (
        <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden>
          {properties.map((property, index) => (
            <span
              key={property.id}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: index === logicalIndex ? 16 : 6,
                background: index === logicalIndex ? '#059669' : 'rgba(15,23,42,0.18)',
              }}
            />
          ))}
        </div>
      )}

      {loopEnabled && (
        <div className="mt-3 flex items-center justify-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => {
              pauseInteraction();
              goPrev();
              scheduleResume();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
            aria-label="Previous featured stay"
          >
            <ChevronLeft className="h-4 w-4 text-[#0F172A]" />
          </button>
          <button
            type="button"
            onClick={() => {
              pauseInteraction();
              goNext();
              scheduleResume();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
            aria-label="Next featured stay"
          >
            <ChevronRight className="h-4 w-4 text-[#0F172A]" />
          </button>
        </div>
      )}
    </div>
  );
}
