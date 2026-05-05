import { useEffect, useRef, useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Bed } from 'lucide-react';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

/**
 * Apple/Expedia-style property gallery.
 *
 * Desktop: 1 large hero on the left + up to 3 stacked thumbnails on the
 * right. The hero carries a "+N photos" pill; the last thumbnail carries
 * a "+N" overlay when there are more photos than slots.
 *
 * Mobile: a horizontal scroll-snap strip with a bottom-right "i / N"
 * counter pill — feels like the native iOS photo viewer.
 *
 * Both surfaces open the same lightbox with arrow / Escape support.
 */
export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const safeImages = (images ?? []).filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );
  const total = safeImages.length;

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Lightbox keyboard nav
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

  // Keep mobile counter in sync with horizontal scroll position
  const onMobileScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== mobileIndex) setMobileIndex(idx);
  };

  // Empty state — uses the warm surface tokens so a photo-less listing
  // still reads as part of the design system.
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

  const heroSrc = safeImages[0];
  const thumbs = safeImages.slice(1, 4);
  const remaining = Math.max(0, total - 4);

  return (
    <>
      {/* Desktop / tablet — 3-col, 3-row grid. Hero takes 2 cols × 3 rows so
          the row-height of the thumbnails on the right matches the hero exactly. */}
      <div
        className="hidden sm:grid grid-cols-3 grid-rows-3 gap-3 md:gap-4 rounded-3xl overflow-hidden"
        style={{ height: 'clamp(380px, 48vw, 520px)' }}
      >
        <button
          type="button"
          onClick={() => openAt(0)}
          className={`relative ${thumbs.length > 0 ? 'col-span-2 row-span-3' : 'col-span-3 row-span-3'} overflow-hidden rounded-2xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xpx-warm)]`}
          aria-label="View hero photo"
        >
          <img
            src={heroSrc}
            alt={`${title} — primary photo`}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            loading="eager"
          />
          {/* Soft bottom-left gradient so the badge stays legible on busy photos. */}
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(15,23,42,0.32))' }}
          />
          <span
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-xpx-text"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
              boxShadow: '0 6px 18px rgba(15,23,42,0.10)',
            }}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="tabular-nums">+{total} Photos</span>
          </span>
        </button>

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

      {/* Mobile — horizontal scroll snap strip. Uses native momentum scrolling
          and a small bottom-right counter so it feels like the iOS photo
          viewer. We compute the active index from scrollLeft. */}
      <div className="sm:hidden -mx-3 relative">
        <div
          ref={stripRef}
          onScroll={onMobileScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-3"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          {safeImages.map((img, i) => (
            <button
              key={`m-${i}`}
              type="button"
              onClick={() => openAt(i)}
              className="shrink-0 w-full aspect-[4/3] rounded-2xl overflow-hidden focus:outline-none"
              style={{ scrollSnapAlign: 'center' }}
              aria-label={`View photo ${i + 1} of ${total}`}
            >
              <img
                src={img}
                alt={`${title} — photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </button>
          ))}
        </div>
        {/* Counter pill — bottom right, mirroring native iOS photo viewer. */}
        <span
          className="absolute bottom-3 right-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tabular-nums"
          style={{
            background: 'rgba(15,23,42,0.6)',
            color: '#FFFFFF',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <Camera className="w-3 h-3" />
          {Math.min(mobileIndex + 1, total)} / {total}
        </span>
      </div>

      {/* Lightbox — backdrop click closes; arrow keys & buttons cycle. */}
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

          <div
            className="absolute top-4 left-4 z-[90] bg-black/40 text-white px-4 py-2 rounded-full backdrop-blur-sm font-semibold tabular-nums"
          >
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

          {/* Thumbnail strip at the bottom of the lightbox so users can jump
              straight to a specific photo without arrow-key cycling. */}
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
