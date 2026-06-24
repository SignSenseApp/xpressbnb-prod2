import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SWIPE_THRESHOLD_PX = 48;

export type UseTransformGalleryOptions = {
  slideCount: number;
  loop?: boolean;
  autoplayMs?: number | null;
  active?: boolean;
  paused?: boolean;
  transitionMs?: number;
  resumeAfterMs?: number;
  swipeEnabled?: boolean;
  reducedMotion?: boolean;
};

export type UseTransformGalleryResult = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  extendedSlideIndices: number[];
  trackIndex: number;
  logicalIndex: number;
  translateX: number;
  slideWidth: number;
  enableTransition: boolean;
  isDragging: boolean;
  goNext: () => void;
  goPrev: () => void;
  resetToFirst: () => void;
  handleTransitionEnd: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  didSwipe: () => boolean;
};

export function useTransformGallery({
  slideCount: count,
  loop = true,
  autoplayMs = null,
  active = true,
  paused = false,
  resumeAfterMs = 3000,
  swipeEnabled = true,
  reducedMotion = false,
}: UseTransformGalleryOptions): UseTransformGalleryResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragAxisLock = useRef<'x' | 'y' | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerCapturedRef = useRef(false);
  const didSwipeRef = useRef(false);

  const loopEnabled = loop && count > 1;

  const extendedSlideIndices = useMemo(() => {
    if (!loopEnabled) return Array.from({ length: count }, (_, i) => i);
    return [-1, ...Array.from({ length: count }, (_, i) => i), count];
  }, [count, loopEnabled]);

  const [trackIndex, setTrackIndex] = useState(loopEnabled ? 1 : 0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const logicalIndex = loopEnabled
    ? (trackIndex - 1 + count) % count
    : Math.min(Math.max(trackIndex, 0), Math.max(count - 1, 0));

  const translateX = -trackIndex * containerWidth + dragOffset;

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

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setEnableTransition(true);
    if (!loopEnabled) {
      setTrackIndex((i) => Math.min(i + 1, count - 1));
      return;
    }
    setTrackIndex((i) => i + 1);
  }, [count, loopEnabled]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setEnableTransition(true);
    if (!loopEnabled) {
      setTrackIndex((i) => Math.max(i - 1, 0));
      return;
    }
    setTrackIndex((i) => i - 1);
  }, [count, loopEnabled]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  const resetToFirst = useCallback(() => {
    setEnableTransition(true);
    setTrackIndex(loopEnabled ? 1 : 0);
  }, [loopEnabled]);

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
    if (!enableTransition) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [enableTransition]);

  useEffect(() => {
    setTrackIndex(loopEnabled ? 1 : 0);
    setEnableTransition(false);
  }, [count, loopEnabled]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    clearAutoplayTimer();
    if (!active || paused || reducedMotion || !autoplayMs || count <= 1 || isDragging) return;

    autoplayTimerRef.current = window.setInterval(() => {
      goNextRef.current();
    }, autoplayMs);

    return clearAutoplayTimer;
  }, [active, autoplayMs, clearAutoplayTimer, count, isDragging, paused, reducedMotion]);

  useEffect(
    () => () => {
      clearAutoplayTimer();
      clearResumeTimer();
    },
    [clearAutoplayTimer, clearResumeTimer],
  );

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      /* resume handled by parent state */
    }, resumeAfterMs);
  }, [clearResumeTimer, resumeAfterMs]);

  const finishDrag = useCallback(
    (deltaX: number) => {
      setIsDragging(false);
      dragAxisLock.current = null;
      pointerIdRef.current = null;
      pointerCapturedRef.current = false;

      if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
        didSwipeRef.current = true;
        setEnableTransition(true);
        setDragOffset(0);
        if (deltaX < 0) goNext();
        else goPrev();
      } else {
        setEnableTransition(true);
        setDragOffset(0);
      }

      scheduleResume();
    },
    [goNext, goPrev, scheduleResume],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || count <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    didSwipeRef.current = false;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragAxisLock.current = null;
    pointerIdRef.current = e.pointerId;
    pointerCapturedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
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

    if (!pointerCapturedRef.current) {
      pointerCapturedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* already captured */
      }
    }

    e.preventDefault();
    setDragOffset(dx);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const deltaX = e.clientX - dragStartX.current;
    if (pointerCapturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
    finishDrag(dragAxisLock.current === 'x' ? deltaX : 0);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    finishDrag(0);
  };

  const didSwipe = useCallback(() => {
    const swiped = didSwipeRef.current;
    didSwipeRef.current = false;
    return swiped;
  }, []);

  return {
    containerRef,
    extendedSlideIndices,
    trackIndex,
    logicalIndex,
    translateX,
    slideWidth: containerWidth,
    enableTransition,
    isDragging,
    goNext,
    goPrev,
    resetToFirst,
    handleTransitionEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    didSwipe,
  };
}

export function galleryTransitionStyle(
  translateX: number,
  enableTransition: boolean,
  isDragging: boolean,
  transitionMs = 450,
): React.CSSProperties {
  return {
    transform: `translate3d(${translateX}px, 0, 0)`,
    transition:
      isDragging || !enableTransition
        ? 'none'
        : `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    willChange: 'transform',
  };
}
