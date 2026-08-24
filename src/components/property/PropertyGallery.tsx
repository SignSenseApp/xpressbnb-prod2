import { useState } from 'react';
import { Bed, LayoutGrid } from 'lucide-react';
import {
  listPropertyImages,
  PROPERTY_GALLERY_THUMB_SIZES,
  propertyGalleryThumbSrc,
  propertyGalleryThumbSrcSet,
} from '../../lib/propertyImages';
import { trackXpressEvent } from '../../lib/analytics';
import PropertyHeroCarousel from './PropertyHeroCarousel';
import PropertyPhotoTour from './PropertyPhotoTour';

interface PropertyGalleryProps {
  images: string[] | import('../../lib/database.types').Json;
  title: string;
}

/**
 * Property gallery — mosaic + sliding hero (VRBO-style).
 * Desktop: sliding hero left, two stills right, photo tour on click.
 * Mobile: full-bleed slider with arrows, swipe, and “View all photos”.
 */
export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const safeImages = listPropertyImages(images);
  const total = safeImages.length;

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);

  if (total === 0) {
    return (
      <div
        className="xpx-property-bento aspect-[4/3] sm:aspect-[16/10] rounded-2xl sm:rounded-3xl flex items-center justify-center"
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
    trackXpressEvent('gallery_opened', { photo_index: i + 1, photo_total: total });
  };

  const rightStack = safeImages.slice(1, 3);
  const remaining = Math.max(0, total - 3);

  const renderBentoImage = (img: string, photoIndex: number) => {
    const thumbSrc = propertyGalleryThumbSrc(img);
    const thumbSrcSet = propertyGalleryThumbSrcSet(img);
    return (
      <img
        src={thumbSrc}
        srcSet={thumbSrcSet}
        sizes={thumbSrcSet ? PROPERTY_GALLERY_THUMB_SIZES : undefined}
        alt={`${title} — photo ${photoIndex + 1}`}
        width={960}
        height={640}
        className="w-full h-full object-cover object-center pointer-events-none"
        loading={photoIndex === 0 ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  };

  return (
    <>
      <div
        className="xpx-property-bento hidden sm:grid gap-2 md:gap-3 rounded-xl sm:rounded-2xl overflow-hidden"
        style={{
          gridTemplateColumns: rightStack.length > 0 ? 'minmax(0, 1.55fr) minmax(0, 1fr)' : '1fr',
          height: 'clamp(340px, 38vw, 460px)',
        }}
      >
        <div className="relative min-h-0 overflow-hidden">
          <PropertyHeroCarousel
            images={safeImages}
            title={title}
            className="h-full"
            imageClassName="w-full h-full object-cover"
            showArrows={total > 1}
            onSlideClick={openAt}
            onIndexChange={setHeroIndex}
          />
        </div>

        {rightStack.length > 0 && (
          <div className="grid grid-rows-2 gap-2 md:gap-3 min-h-0">
            {rightStack.map((img, i) => {
              const photoIndex = i + 1;
              const isLast = i === rightStack.length - 1;
              const showViewAll = isLast && total > 1;
              return (
                <button
                  key={`bento-${photoIndex}`}
                  type="button"
                  onClick={() => openAt(photoIndex)}
                  className="relative min-h-0 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-label={
                    showViewAll && remaining > 0
                      ? `View all ${total} photos`
                      : `View photo ${photoIndex + 1} of ${total}`
                  }
                >
                  {renderBentoImage(img, photoIndex)}
                  {showViewAll && (
                    <span
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-xpx-text pointer-events-none"
                      style={{
                        background: 'rgba(255,255,255,0.94)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        boxShadow: 'var(--xpx-shadow-hover)',
                        border: '1px solid var(--xpx-border)',
                      }}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
                      View all photos
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="sm:hidden relative -mx-[var(--xpx-gutter)] aspect-[4/3] overflow-hidden">
        <PropertyHeroCarousel
          images={safeImages}
          title={title}
          className="h-full"
          imageClassName="w-full h-full object-cover"
          showArrows={total > 1}
          onSlideClick={openAt}
          onIndexChange={setHeroIndex}
        />
        <div
          className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--xpx-on-dark)' }}
        >
          {heroIndex + 1} / {total}
        </div>
        <button
          type="button"
          onClick={() => openAt(heroIndex)}
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-auto touch-manipulation"
          style={{
            background: 'rgba(255,255,255,0.94)',
            color: 'var(--xpx-text)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--xpx-border)',
            minHeight: 36,
          }}
          aria-label={`View all ${total} photos`}
        >
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
          View all photos
        </button>
      </div>

      {open && (
        <PropertyPhotoTour
          images={safeImages}
          title={title}
          startIndex={index}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
