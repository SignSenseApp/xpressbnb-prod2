import { useEffect, useRef, useState } from 'react';
import {
  useInViewport,
  useIsDesktop,
  usePrefersReducedMotion,
  useScrollPause,
} from '../hooks/useGalleryMotion';
import {
  galleryTransitionStyle,
  useTransformGallery,
} from '../hooks/useTransformGallery';
import { listPropertyImages } from '../lib/propertyImages';

const DESKTOP_HOVER_AUTOPLAY_MS = 2500;
const MOBILE_IDLE_AUTOPLAY_MS = 4000;
const HOVER_RESET_MS = 400;
const MOBILE_RESUME_MS = 3000;
const TRANSITION_MS = 450;

type PropertyCardGalleryProps = {
  images: Parameters<typeof listPropertyImages>[0];
  alt: string;
  isCardHovered: boolean;
  onIndexChange?: (index: number) => void;
  onSwipe?: () => void;
  children?: React.ReactNode;
};

function resolveSlideUrl(images: string[], index: number): string {
  if (index < 0) return images[images.length - 1] ?? '';
  if (index >= images.length) return images[0] ?? '';
  return images[index] ?? '';
}

export default function PropertyCardGallery({
  images: rawImages,
  alt,
  isCardHovered,
  onIndexChange,
  onSwipe,
  children,
}: PropertyCardGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const images = listPropertyImages(rawImages);
  const count = images.length;

  const isDesktop = useIsDesktop();
  const reducedMotion = usePrefersReducedMotion();
  const inViewport = useInViewport(rootRef, 0.4);

  const [touchPaused, setTouchPaused] = useState(false);
  const [scrollPaused, setScrollPaused] = useState(false);
  const [resumePaused, setResumePaused] = useState(false);

  useScrollPause(setScrollPaused);

  const desktopHoverActive =
    isDesktop && isCardHovered && inViewport && count > 1 && !reducedMotion;

  const mobileIdleActive =
    !isDesktop && inViewport && count > 1 && !reducedMotion;

  const paused = touchPaused || scrollPaused || resumePaused;

  const gallery = useTransformGallery({
    slideCount: count,
    loop: true,
    autoplayMs: desktopHoverActive
      ? DESKTOP_HOVER_AUTOPLAY_MS
      : mobileIdleActive
        ? MOBILE_IDLE_AUTOPLAY_MS
        : null,
    active: inViewport && count > 1,
    paused,
    transitionMs: TRANSITION_MS,
    resumeAfterMs: MOBILE_RESUME_MS,
    swipeEnabled: count > 1,
    reducedMotion,
  });

  useEffect(() => {
    onIndexChange?.(gallery.logicalIndex);
  }, [gallery.logicalIndex, onIndexChange]);

  useEffect(() => {
    if (!isDesktop || isCardHovered) return;
    const timer = window.setTimeout(() => {
      gallery.resetToFirst();
    }, HOVER_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [isCardHovered, isDesktop, gallery.resetToFirst]);

  useEffect(() => {
    if (gallery.isDragging) {
      setTouchPaused(true);
      setResumePaused(true);
      return;
    }
    if (!touchPaused && !scrollPaused) return;
    const timer = window.setTimeout(() => {
      setTouchPaused(false);
      setResumePaused(false);
    }, MOBILE_RESUME_MS);
    return () => window.clearTimeout(timer);
  }, [gallery.isDragging, scrollPaused, touchPaused]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setTouchPaused(true);
    setResumePaused(true);
    gallery.onPointerDown(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    gallery.onPointerUp(e);
    if (gallery.didSwipe()) onSwipe?.();
  };

  if (count === 0) {
    return (
      <div ref={rootRef} className="xpx-property-card-media">
        <div className="flex h-full w-full items-center justify-center text-sm text-[#6B7280]">
          No image
        </div>
        {children}
      </div>
    );
  }

  if (count === 1) {
    return (
      <div ref={rootRef} className="xpx-property-card-media">
        <img
          src={images[0]}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out motion-reduce:transition-none md:group-hover:scale-[1.03]"
        />
        {children}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="xpx-property-card-media overflow-hidden">
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
          onPointerDown={handlePointerDown}
          onPointerMove={gallery.onPointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={gallery.onPointerCancel}
        >
          {gallery.extendedSlideIndices.map((slideIndex, i) => (
            <img
              key={`${slideIndex}-${i}`}
              src={resolveSlideUrl(images, slideIndex)}
              alt={alt}
              loading={i <= 2 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="h-full w-full shrink-0 object-cover select-none"
              style={{ width: gallery.slideWidth || '100%' }}
            />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
