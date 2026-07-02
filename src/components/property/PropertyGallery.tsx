import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Bed } from 'lucide-react';
import {
  cinematicFrameLabel,
  sequenceCinematicHeroImages,
} from '../../lib/cinematicHeroSequence';
import {
  listPropertyImages,
  PROPERTY_GALLERY_THUMB_SIZES,
  propertyGalleryThumbSrc,
  propertyGalleryThumbSrcSet,
} from '../../lib/propertyImages';
import PropertyHeroCarousel from './PropertyHeroCarousel';

interface PropertyGalleryProps {
  images: string[] | import('../../lib/database.types').Json;
  title: string;
}

const FILMSTRIP_VISIBLE = 4;
const HERO_IMAGE_CLASS = 'xpx-cinema-hero-image h-full w-full';
const HERO_FRAME_CLASS =
  'h-[clamp(480px,72vh,820px)] lg:h-[clamp(520px,76vh,860px)]';
const MOBILE_HERO_CLASS = 'h-[min(75svh,720px)] min-h-[440px]';

function HeroCounter({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;
  return (
    <span
      className="xpx-ed-hero-counter pointer-events-none absolute bottom-4 left-4 z-[2] tabular-nums"
      aria-hidden
    >
      {cinematicFrameLabel(current - 1, total)}
    </span>
  );
}

function MobileProgress({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="xpx-ed-hero-progress pointer-events-none absolute inset-x-0 bottom-0 z-[2]" aria-hidden>
      <div className="xpx-ed-hero-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Cinematic opening sequence — editorial photography, not a property gallery.
 */
export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const rawImages = listPropertyImages(images);
  const storyImages = useMemo(() => sequenceCinematicHeroImages(rawImages), [rawImages]);
  const total = storyImages.length;

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % total);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + total) % total);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, total]);

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  const selectHero = useCallback((i: number) => {
    setHeroIndex(i);
  }, []);

  const filmstripSlots = useMemo(() => {
    if (total <= FILMSTRIP_VISIBLE) {
      return storyImages.map((src, i) => ({ src, imageIndex: i, overflow: 0 }));
    }
    const overflow = total - (FILMSTRIP_VISIBLE - 1);
    return [
      ...storyImages.slice(0, FILMSTRIP_VISIBLE - 1).map((src, i) => ({
        src,
        imageIndex: i,
        overflow: 0,
      })),
      {
        src: storyImages[FILMSTRIP_VISIBLE - 1],
        imageIndex: FILMSTRIP_VISIBLE - 1,
        overflow,
      },
    ];
  }, [storyImages, total]);

  const filmstripGridRows =
    filmstripSlots.length <= 2
      ? 'grid-rows-2'
      : filmstripSlots.length === 3
        ? 'grid-rows-3'
        : 'grid-rows-4';

  if (total === 0) {
    return (
      <div
        className={`xpx-ed-hero-frame ${HERO_FRAME_CLASS} flex flex-col items-center justify-center gap-3`}
        role="img"
        aria-label="No photos available"
      >
        <Bed className="h-10 w-10 text-lux-whisper" strokeWidth={1.25} aria-hidden />
        <p className="text-sm text-lux-whisper">Photography coming soon</p>
      </div>
    );
  }

  const renderFilmstripThumb = (
    slot: (typeof filmstripSlots)[number],
    layout: 'vertical' | 'horizontal',
  ) => {
    const isActive = heroIndex === slot.imageIndex;
    const thumbSrc = propertyGalleryThumbSrc(slot.src);
    const thumbSrcSet = propertyGalleryThumbSrcSet(slot.src);

    const layoutClass =
      layout === 'vertical'
        ? 'min-h-0 w-full'
        : 'aspect-[5/4] w-[26%] min-w-[5rem] max-w-[7rem] shrink-0 snap-center';

    return (
      <button
        key={`strip-${slot.imageIndex}`}
        type="button"
        onClick={() => {
          if (slot.overflow > 0) {
            openAt(slot.imageIndex);
            return;
          }
          selectHero(slot.imageIndex);
        }}
        className={`xpx-ed-filmstrip-thumb relative overflow-hidden focus:outline-none motion-reduce:transition-none ${layoutClass} ${
          isActive ? 'xpx-ed-filmstrip-thumb--active' : ''
        }`}
        aria-label={
          slot.overflow > 0
            ? `View all ${total} photographs`
            : `Show frame ${slot.imageIndex + 1} of ${total}`
        }
        aria-current={isActive ? 'true' : undefined}
      >
        <img
          src={thumbSrc}
          srcSet={thumbSrcSet}
          sizes={thumbSrcSet ? PROPERTY_GALLERY_THUMB_SIZES : undefined}
          alt=""
          className="xpx-ed-filmstrip-image absolute inset-0 h-full w-full"
          loading="lazy"
          decoding="async"
        />
        {slot.overflow > 0 && (
          <div className="xpx-ed-filmstrip-overflow" aria-hidden>
            <span className="text-[10px] font-normal tabular-nums tracking-wide text-white/55">
              +{slot.overflow}
            </span>
          </div>
        )}
      </button>
    );
  };

  const heroCarousel = (frameClass = HERO_FRAME_CLASS) => (
    <div className={`xpx-ed-hero-frame xpx-cinema-hero-frame relative min-w-0 ${frameClass}`}>
      <PropertyHeroCarousel
        images={storyImages}
        title={title}
        className="h-full w-full"
        imageClassName={HERO_IMAGE_CLASS}
        slideIndex={heroIndex}
        onSlideIndexChange={setHeroIndex}
        onSlideClick={openAt}
        onIndexChange={setHeroIndex}
        enableAutoplay={false}
      />
      <HeroCounter current={heroIndex + 1} total={total} />
    </div>
  );

  return (
    <>
      <div className="relative -mx-4 sm:mx-0 lg:hidden">
        <div className={`xpx-ed-hero-frame xpx-cinema-hero-frame relative overflow-hidden ${MOBILE_HERO_CLASS}`}>
          <PropertyHeroCarousel
            images={storyImages}
            title={title}
            className="h-full w-full"
            imageClassName={HERO_IMAGE_CLASS}
            showArrows={false}
            slideIndex={heroIndex}
            onSlideIndexChange={setHeroIndex}
            onSlideClick={openAt}
            onIndexChange={setHeroIndex}
            enableAutoplay={false}
          />
          <HeroCounter current={heroIndex + 1} total={total} />
          <MobileProgress current={heroIndex} total={total} />
        </div>
      </div>

      <div className="hidden sm:block lg:hidden">
        {heroCarousel()}
        {total > 1 && (
          <div
            className="xpx-ed-filmstrip-horizontal mt-6 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
            role="list"
            aria-label="Story frames"
          >
            {filmstripSlots.map((slot) => renderFilmstripThumb(slot, 'horizontal'))}
          </div>
        )}
      </div>

      <div className={`hidden lg:flex gap-2 ${HERO_FRAME_CLASS}`}>
        {heroCarousel('h-full min-w-0 flex-1')}
        {total > 1 && (
          <div
            className={`xpx-ed-filmstrip-vertical grid h-full w-[3.75rem] shrink-0 gap-1 xl:w-[4.25rem] ${filmstripGridRows}`}
            role="list"
            aria-label="Story frames"
          >
            {filmstripSlots.map((slot) => renderFilmstripThumb(slot, 'vertical'))}
          </div>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photograph viewer"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0a0f1a]"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-5 right-5 z-[90] px-2 py-1 text-sm text-white/60 underline underline-offset-4 transition-opacity hover:text-white/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            aria-label="Close viewer"
          >
            Close
          </button>

          {total > 1 && (
            <div
              className="xpx-ed-hero-counter absolute top-5 left-5 z-[90]"
              aria-live="polite"
            >
              {cinematicFrameLabel(index, total)}
            </div>
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + total) % total);
                }}
                className="xpx-cinema-lightbox-nav xpx-cinema-lightbox-nav--prev"
                aria-label="Previous photograph"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.15} aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % total);
                }}
                className="xpx-cinema-lightbox-nav xpx-cinema-lightbox-nav--next"
                aria-label="Next photograph"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.15} aria-hidden />
              </button>
            </>
          )}

          <img
            src={storyImages[index]}
            alt={`${title} — photograph ${index + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[94vw] select-none object-contain"
          />
        </div>
      )}
    </>
  );
}
