import { useRef } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Landmark,
  Mountain,
  Sparkles,
  Trees,
} from 'lucide-react';
import { LOCAL_DESTINATIONS } from '../../lib/premiumBrand';

const ICON_MAP = {
  rishikesh: Mountain,
  gurgaon: Building2,
  delhi: Landmark,
  noida: Building2,
  weekend: Trees,
} as const;

type LocalDiscoveryCarouselProps = {
  onCityClick: (slug: string) => void;
};

export default function LocalDiscoveryCarousel({ onCityClick }: LocalDiscoveryCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* ── Mobile: image cards with dark gradient + overlaid text (design spec) ── */}
      <section className="xm-city md:hidden" aria-label="Explore destinations">
        <div className="xm-city__track scrollbar-hide" role="list">
          {LOCAL_DESTINATIONS.map((dest, index) => {
            const Icon = ICON_MAP[dest.id as keyof typeof ICON_MAP] ?? Sparkles;
            return (
              <button
                key={dest.id}
                type="button"
                role="listitem"
                onClick={() => onCityClick(dest.slug)}
                className="xm-city__card"
              >
                <img
                  src={dest.image}
                  alt=""
                  className="xm-city__img"
                  loading={index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <div className="xm-city__overlay" aria-hidden />
                <span className="xm-city__chip" aria-hidden>
                  <Icon strokeWidth={1.75} />
                </span>
                <div className="xm-city__content">
                  <h3 className="xm-city__name">{dest.city}</h3>
                  <p className="xm-city__tagline">{dest.tagline}</p>
                  <div className="xm-city__footer">
                    <span className="xm-city__stays">{dest.stays} stays</span>
                    <span className="xm-city__arrow" aria-hidden>
                      <ArrowRight strokeWidth={2} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Desktop: unchanged premium layout ── */}
      <section className="xpx-premium-discovery hidden md:block" aria-label="Local discovery">
        <div className="xpx-container">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="xpx-premium-eyebrow">Discover nearby</p>
              <h2 className="xpx-premium-section-title mt-1.5">Where India feels like home</h2>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="xpx-premium-discovery-track scrollbar-hide"
            role="list"
          >
            {LOCAL_DESTINATIONS.map((dest, index) => {
              const Icon = ICON_MAP[dest.id as keyof typeof ICON_MAP] ?? Sparkles;
              return (
                <button
                  key={dest.id}
                  type="button"
                  role="listitem"
                  onClick={() => onCityClick(dest.slug)}
                  className="xpx-premium-dest-card group xpx-press"
                  style={{
                    animationDelay: `${index * 60}ms`,
                    ['--dest-pastel' as string]: dest.pastel,
                  }}
                >
                  <div
                    className="xpx-premium-dest-card__media"
                    style={{ background: dest.pastel }}
                  >
                    <img
                      src={dest.image}
                      alt=""
                      className="xpx-premium-dest-card__img"
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    <div className="xpx-premium-dest-card__overlay" aria-hidden />
                    <span className="xpx-premium-dest-card__icon" aria-hidden>
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="xpx-premium-dest-card__arrow" aria-hidden>
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </div>
                  <div className="xpx-premium-dest-card__body">
                    <span className="xpx-premium-dest-card__emoji" aria-hidden>
                      {dest.emoji}
                    </span>
                    <h3 className="xpx-premium-dest-card__city">{dest.city}</h3>
                    <p className="xpx-premium-dest-card__tagline">{dest.tagline}</p>
                    <p className="xpx-premium-dest-card__stays">{dest.stays} stays</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
