import { useEffect, useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Bed } from 'lucide-react';
import { listPropertyImages } from '../../lib/propertyImages';
import PropertyHeroCarousel from './PropertyHeroCarousel';

interface PropertyGalleryProps {
  images: string[] | import('../../lib/database.types').Json;
  title: string;
}

/**
 * Apple/Expedia-style property gallery with VRBO-inspired hero carousel.
 *
 * Desktop: hero carousel (GPU transform) + stacked thumbnails.
 * Mobile: full-width transform carousel with counter pill.
 *
 * Both surfaces open the same lightbox with arrow / Escape support.
 */
export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const safeImages = listPropertyImages(images);
  const total = safeImages.length;

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

  if (total === 0) {
    return (
      <div
        className="aspect-[16/10] sm:aspect-[2/1] rounded-3xl flex items-center justify-center"
        style={{
          background: 'var(--xpx-surface-light)',
          border: '1px solid var(--xpx-border)',
        }}
      >
        <Bed className="w-16 h-16" style={{ color: 'var(--xpx-subtle)' }} />
      </div>
    );
  }

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  const thumbs = safeImages.slice(1, 4);
  const remaining = Math.max(0, total - 4);

  return (
    <>
      {/* Desktop / tablet — hero carousel + thumbnails */}
      <div
        className="hidden sm:grid grid-cols-3 grid-rows-3 gap-3 md:gap-4 rounded-3xl overflow-hidden"
        style={{ height: 'clamp(380px, 48vw, 520px)' }}
      >
        <div
          className={`relative overflow-hidden rounded-2xl ${
            thumbs.length > 0 ? 'col-span-2 row-span-3' : 'col-span-3 row-span-3'
          }`}
        >
          <PropertyHeroCarousel
            images={safeImages}
            title={title}
            className="rounded-2xl"
            imageClassName="w-full h-full object-cover"
            onSlideClick={openAt}
            onIndexChange={setHeroIndex}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(15,23,42,0.32))' }}
          />
          <span
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-xpx-text pointer-events-none"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
              boxShadow: '0 6px 18px rgba(15,23,42,0.10)',
            }}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {heroIndex + 1} / {total}
            </span>
          </span>
        </div>

        {thumbs.map((img, i) => {
          const isLastThumb = i === thumbs.length - 1;
          const showOverlay = isLastThumb && remaining > 0;
          return (
            <button
              key={`thumb-${i}`}
              type="button"
              onClick={() => openAt(i + 1)}
              className="relative overflow-hidden rounded-2xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xpx-warm)]"
              aria-label={`View photo ${i + 2} of ${total}`}
            >
              <img
                src={img}
                alt={`${title} — photo ${i + 2}`}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                loading="lazy"
              />
              {showOverlay && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(15,23,42,0.5)' }}
                >
                  <div className="text-center text-white">
                    <p className="text-2xl font-extrabold tabular-nums leading-none">+{remaining}</p>
                    <p className="text-[10px] uppercase tracking-wider opacity-80 mt-1">View all</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile — transform carousel */}
      <div className="sm:hidden relative aspect-[4/3] rounded-2xl overflow-hidden">
        <PropertyHeroCarousel
          images={safeImages}
          title={title}
          className="rounded-2xl"
          imageClassName="w-full h-full object-cover"
          showArrows={false}
          onSlideClick={openAt}
          onIndexChange={setHeroIndex}
        />
        <span
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tabular-nums pointer-events-none"
          style={{
            background: 'rgba(15,23,42,0.6)',
            color: '#FFFFFF',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <Camera className="w-3 h-3" />
          {heroIndex + 1} / {total}
        </span>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[80] bg-slate-900/95 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-[90] w-12 h-12 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
            aria-label="Close gallery"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="absolute top-4 left-4 z-[90] bg-black/40 text-white px-4 py-2 rounded-full backdrop-blur-sm font-semibold tabular-nums">
            {index + 1} / {total}
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + total) % total);
                }}
                className="absolute left-4 z-[90] w-12 h-12 sm:w-16 sm:h-16 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % total);
                }}
                className="absolute right-4 z-[90] w-12 h-12 sm:w-16 sm:h-16 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </button>
            </>
          )}

          <img
            src={safeImages[index]}
            alt={`${title} — photo ${index + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg select-none"
          />

          {total > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[90] max-w-full overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 px-4">
                {safeImages.map((img, i) => (
                  <button
                    key={`lb-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIndex(i);
                    }}
                    className={`shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      i === index
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    aria-label={`Jump to photo ${i + 1}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
