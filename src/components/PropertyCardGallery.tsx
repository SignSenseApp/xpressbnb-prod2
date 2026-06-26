import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  useInViewport,
  useIsDesktop,
  usePageVisible,
  usePrefersReducedMotion,
} from '../hooks/useGalleryMotion';
import {
  galleryTransitionStyle,
  useTransformGallery,
} from '../hooks/useTransformGallery';
import {
  listPropertyImages,
  PROPERTY_CARD_IMAGE_SIZES,
  propertyCardImageSrc,
  propertyCardImageSrcSet,
} from '../lib/propertyImages';

/** Intentional hover dwell before desktop preview autoplay (VRBO-style). */
const HOVER_INTENT_MS = 400;
/** Desktop preview advance interval — 1.8–2.2s target band. */
const DESKTOP_HOVER_AUTOPLAY_MS = 2000;
/** Fade back to first slide after hover exit. */
const HOVER_RESET_MS = 400;
const FADE_MS = 500;
const SWIPE_TRANSITION_MS = 450;

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

type CardImageProps = {
  originalSrc: string;
  alt: string;
  loading: 'lazy' | 'eager';
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
};

function CardImage({ originalSrc, alt, loading, className, style, draggable }: CardImageProps) {
  const src = propertyCardImageSrc(originalSrc);
  const srcSet = propertyCardImageSrcSet(originalSrc);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? PROPERTY_CARD_IMAGE_SIZES : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority="auto"
      draggable={draggable}
      className={className}
      style={style}
    />
  );
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
  const pageVisible = usePageVisible();

  const [fadeIndex, setFadeIndex] = useState(0);
  const [hoverIntentReady, setHoverIntentReady] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);

  const desktopHoverActive =
    isDesktop &&
    isCardHovered &&
    hoverIntentReady &&
    inViewport &&
    pageVisible &&
    count > 1 &&
    !reducedMotion;

  const gallery = useTransformGallery({
    slideCount: count,
    loop: true,
    autoplayMs: null,
    active: !isDesktop && count > 1,
    paused: touchPaused,
    transitionMs: SWIPE_TRANSITION_MS,
    swipeEnabled: !isDesktop && count > 1,
    reducedMotion,
  });

  useEffect(() => {
    if (!isDesktop || !isCardHovered) {
      setHoverIntentReady(false);
      return;
    }
    const id = window.setTimeout(() => setHoverIntentReady(true), HOVER_INTENT_MS);
    return () => {
      window.clearTimeout(id);
      setHoverIntentReady(false);
    };
  }, [isCardHovered, isDesktop]);

  useEffect(() => {
    if (isDesktop) {
      onIndexChange?.(fadeIndex);
    } else {
      onIndexChange?.(gallery.logicalIndex);
    }
  }, [fadeIndex, gallery.logicalIndex, isDesktop, onIndexChange]);

  useEffect(() => {
    if (!desktopHoverActive) return;
    const id = window.setInterval(() => {
      setFadeIndex((i) => (i + 1) % count);
    }, DESKTOP_HOVER_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, desktopHoverActive]);

  useEffect(() => {
    if (!isDesktop || isCardHovered) return;
    const timer = window.setTimeout(() => setFadeIndex(0), HOVER_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [isCardHovered, isDesktop]);

  const desktopRenderIndices = useMemo(() => {
    const indices = new Set<number>([0, fadeIndex]);
    if (hoverIntentReady || desktopHoverActive) {
      indices.add((fadeIndex + 1) % count);
    }
    return indices;
  }, [count, desktopHoverActive, fadeIndex, hoverIntentReady]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setTouchPaused(true);
    gallery.onPointerDown(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    gallery.onPointerUp(e);
    if (gallery.didSwipe()) onSwipe?.();
    window.setTimeout(() => setTouchPaused(false), 3000);
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
        <CardImage
          originalSrc={images[0]}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out motion-reduce:transition-none md:group-hover:scale-[1.03]"
        />
        {children}
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div ref={rootRef} className="xpx-property-card-media relative overflow-hidden">
        {images.map((originalSrc, i) => {
          if (!desktopRenderIndices.has(i)) return null;
          return (
            <CardImage
              key={originalSrc}
              originalSrc={originalSrc}
              alt={i === fadeIndex ? alt : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
              aria-hidden={i !== fadeIndex}
              className="absolute inset-0 h-full w-full object-cover motion-reduce:transition-none md:group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              style={{
                opacity: i === fadeIndex ? 1 : 0,
                transition: reducedMotion ? 'none' : `opacity ${FADE_MS}ms ease-out`,
                zIndex: i === fadeIndex ? 1 : 0,
              }}
            />
          );
        })}
        {children}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="xpx-property-card-media overflow-hidden">
      <div ref={gallery.containerRef as RefObject<HTMLDivElement>} className="h-full w-full overflow-hidden">
        <div
          className="flex h-full touch-pan-y"
          style={galleryTransitionStyle(
            gallery.translateX,
            gallery.enableTransition,
            gallery.isDragging,
            SWIPE_TRANSITION_MS,
          )}
          onTransitionEnd={gallery.handleTransitionEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={gallery.onPointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={gallery.onPointerCancel}
        >
          {gallery.extendedSlideIndices.map((slideIndex, i) => (
            <CardImage
              key={`${slideIndex}-${i}`}
              originalSrc={resolveSlideUrl(images, slideIndex)}
              alt={alt}
              loading={i <= 1 ? 'eager' : 'lazy'}
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
