import { useCallback, useEffect, useRef, useState } from 'react';
import type { Property } from '../../lib/database.types';
import EditorialFeaturedStayCard from './EditorialFeaturedStayCard';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';

type EditorialFeaturedCarouselProps = {
  properties: Property[];
  tripQuery?: string;
};

/** Horizontal editorial featured stays — snap carousel with peek */
export default function EditorialFeaturedCarousel({
  properties,
  tripQuery = '',
}: EditorialFeaturedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const syncActiveFromScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || properties.length === 0) return;
    const card = el.querySelector<HTMLElement>('.xpx-editorial-stay-card');
    if (!card) return;
    const cardWidth = card.offsetWidth + 16;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(Math.max(index, 0), properties.length - 1));
  }, [properties.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncActiveFromScroll, { passive: true });
    return () => el.removeEventListener('scroll', syncActiveFromScroll);
  }, [syncActiveFromScroll]);

  useEffect(() => {
    if (reducedMotion || properties.length <= 1) return;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>('.xpx-editorial-stay-card');
      if (!card) return;
      const stride = card.offsetWidth + 16;
      const next = (activeIndex + 1) % properties.length;
      el.scrollTo({ left: stride * next, behavior: 'smooth' });
      setActiveIndex(next);
    }, 5500);
    return () => window.clearInterval(id);
  }, [activeIndex, properties.length, reducedMotion]);

  if (properties.length === 0) return null;

  return (
    <div className="xpx-editorial-featured-wrap">
      <div ref={trackRef} className="xpx-editorial-featured-track scrollbar-hide">
        {properties.map((property, i) => (
          <EditorialFeaturedStayCard
            key={property.id}
            property={property}
            tripQuery={tripQuery}
            showHostFavorite={i === 0}
          />
        ))}
      </div>
      {properties.length > 1 && (
        <div className="xpx-editorial-featured-dots" aria-hidden>
          {properties.map((p, i) => (
            <span
              key={p.id}
              className={`xpx-editorial-featured-dot${i === activeIndex ? ' xpx-editorial-featured-dot--active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
