import { useState, useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { XPRESSBNB_LOGO_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../lib/branding';
import { logSupabaseError } from '../lib/supabase';
import type { Property } from '../lib/database.types';
import { openHomeOverlay } from '../lib/navigation';
import { TEAM_EMAIL } from '../lib/team';
import { ManageCookiesLink } from './CookieConsent';
import EditorialFeaturedCarousel from './home/EditorialFeaturedCarousel';
import NearbyStaysSection from './nearby/NearbyStaysSection';
import { OnboardingListingsEngagement } from './onboarding/OnboardingListingsEngagement';
import { getPublicListings, invalidatePublicListingsCache } from '../lib/publicListings';
import { warmPublicHostCache } from '../lib/hostPublicCache';
import { INQUIRY_HOST_TAGLINE } from '../lib/inquiryCopy';
import HowItWorksWalkthrough from './HowItWorksWalkthrough';
import { premiumBrand } from '../lib/premiumBrand';

const FOOTER_HEADING = '#FFFFFF';
const FOOTER_BODY = 'rgba(255,255,255,0.6)';
const FOOTER_DIVIDER = 'rgba(255,255,255,0.08)';
const FOOTER_COPY = 'rgba(255,255,255,0.35)';

export type HomepageBelowFoldProps = {
  onCityClick: (city: string) => void;
  onNavigate: (path: string) => void;
  scrollTo: (id: string) => void;
  tripQuery?: string;
};

export default function HomepageBelowFold({
  onCityClick,
  onNavigate,
  scrollTo,
  tripQuery = '',
}: HomepageBelowFoldProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const loadPropertiesRef = useRef(0);

  useEffect(() => {
    const requestId = ++loadPropertiesRef.current;
    void loadProperties(requestId);
    return () => {
      loadPropertiesRef.current += 1;
    };
  }, []);

  const loadProperties = async (requestId: number, forceRefresh = false) => {
    setLoading(true);
    setListingsError(null);
    try {
      const result = await getPublicListings({ forceRefresh });
      if (requestId !== loadPropertiesRef.current) return;
      if (result.status === 'error') {
        setProperties([]);
        setListingsError("We couldn't load stays right now. Please try again.");
        return;
      }
      const data = result.listings;
      setProperties(data);
      warmPublicHostCache(data.map((listing) => listing.host_id));
    } catch (err) {
      if (requestId !== loadPropertiesRef.current) return;
      logSupabaseError('Error loading properties', err);
      setProperties([]);
      setListingsError("We couldn't load stays right now. Please try again.");
    } finally {
      if (requestId === loadPropertiesRef.current) setLoading(false);
    }
  };

  const featuredProperties = properties.slice(0, 8);
  const formattedTripQuery = tripQuery ? (tripQuery.startsWith('?') ? tripQuery : `?${tripQuery}`) : '';

  return (
    <>
      <NearbyStaysSection onNavigate={onNavigate} fallbackTrending={featuredProperties} />

      {/* ─── Featured stays — editorial ─── */}
      <OnboardingListingsEngagement
        id="listings"
        className="scroll-mt-28 pt-8 pb-10 md:pt-12 md:pb-14 md:bg-[#FAF8F4]"
        style={{ background: '#F9FAFB' }}
      >
        {/* Mobile Featured Stays - Modern VRBO Style */}
        <div className="md:hidden bg-[#F9FAFB] pt-6 pb-28">
          {/* Section header */}
          <div className="flex items-center justify-between px-4 mb-5">
            <div>
              <h2 className="text-[22px] font-extrabold text-[#111827] leading-tight tracking-tight">
                Featured stays
              </h2>
              {/* Green underline accent */}
              <div
                className="h-[3px] w-[90px] rounded-full mt-1.5"
                style={{ background: 'linear-gradient(90deg, #059669 0%, #10B981 100%)' }}
              />
            </div>
            <button
              type="button"
              onClick={() => onCityClick('Delhi')}
              className="text-[14px] font-semibold flex items-center gap-1 px-3 py-2 rounded-full transition-all hover:bg-[#ECFDF5] active:scale-95"
              style={{ color: '#059669' }}
            >
              View all
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Cards horizontal scroll */}
          {loading ? (
            <div className="flex gap-3 px-4 overflow-hidden">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="min-w-[calc(100vw-52px)] h-[200px] rounded-[20px] bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : listingsError ? (
            <div className="py-16 text-center text-sm px-4 text-[#6B7280]">
              <p className="font-semibold text-[#111827] mb-1">We couldn&apos;t load stays right now</p>
              <p>{listingsError}</p>
              <button
                type="button"
                onClick={() => {
                  invalidatePublicListingsCache();
                  void loadProperties(loadPropertiesRef.current, true);
                }}
                className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ background: '#059669' }}
              >
                Try again
              </button>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#9CA3AF]">
              No properties available right now.
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
              {featuredProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => {
                    const q = formattedTripQuery.startsWith('?') ? formattedTripQuery : formattedTripQuery ? `?${formattedTripQuery}` : '';
                    onNavigate(`/property/${property.id}${q}`);
                  }}
                  className="min-w-[calc(100vw-56px)] max-w-[360px] h-[220px] rounded-[24px] overflow-hidden relative cursor-pointer snap-start shrink-0 transition-all duration-300 active:scale-[0.97]"
                  style={{
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 8px 40px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Background image */}
                  {property.images && Array.isArray(property.images) && property.images[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
                  )}

                  {/* Gradient overlay - smoother */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%)`,
                    }}
                  />

                  {/* TOP LEFT — Location pill with glassmorphism */}
                  <div
                    className="absolute top-3.5 left-3.5 flex items-center gap-1.5 rounded-full px-3.5 py-2 backdrop-blur-md"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span className="text-[12.5px] font-semibold text-white">{property.city}</span>
                  </div>

                  {/* TOP RIGHT — Host Favourite with modern badge */}
                  <div
                    className="absolute top-3.5 right-3.5 rounded-[14px] px-3 py-2 text-center backdrop-blur-sm"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <p className="text-[10px] font-bold text-[#111827] leading-tight">Host</p>
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: '#059669' }}>
                      Favourite ♡
                    </p>
                  </div>

                  {/* BOTTOM ROW */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-4">
                    {/* Host info */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-[38px] h-[38px] rounded-full border-2 border-white overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold text-white drop-shadow-lg">Your Host</span>
                        {/* Verified check with better styling */}
                        <div
                          className="w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center"
                          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#059669"
                            strokeWidth="3"
                            strokeLinecap="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Price with modern badge */}
                    <div
                      className="text-right px-3 py-2 rounded-[12px] backdrop-blur-md"
                      style={{
                        background: 'rgba(0,0,0,0.5)',
                      }}
                    >
                      <span className="text-[17px] font-bold text-white drop-shadow-lg">
                        ₹{(property.price_per_day ?? property.price_full_day ?? 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[12px] font-normal text-white/80">/night</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Featured Stays */}
        <div className="hidden md:block xpx-container">
          <div className="xpx-premium-featured-head">
            <div>
              <h2 className="xpx-premium-section-title">Featured stays</h2>
              <span className="xpx-premium-squiggle" aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => onCityClick('Delhi')}
              className="xpx-premium-view-all"
            >
              View all
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {loading ? (
            <FeaturedSkeleton />
          ) : listingsError ? (
            <div className="py-16 text-center text-sm px-4 text-[#6B7280]">
              <p className="font-semibold text-[#111827] mb-1">We couldn&apos;t load stays right now</p>
              <p>{listingsError}</p>
              <button
                type="button"
                onClick={() => {
                  invalidatePublicListingsCache();
                  void loadProperties(loadPropertiesRef.current, true);
                }}
                className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ background: premiumBrand.forest }}
              >
                Try again
              </button>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#9CA3AF]">
              No properties available right now.
            </div>
          ) : (
            <EditorialFeaturedCarousel
              properties={featuredProperties}
              tripQuery={formattedTripQuery}
            />
          )}
        </div>
      </OnboardingListingsEngagement>

      {/* ─── Brand promise ─── */}
      <section className="py-12 md:py-16" style={{ background: premiumBrand.stone }}>
        <div className="xpx-container text-center max-w-2xl mx-auto">
          <p className="xpx-premium-font-display text-2xl md:text-3xl font-bold tracking-tight text-[#111827]">
            Book directly with hosts. Zero guest commission.
          </p>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-[#6B7280]">
            Human-first travel across Delhi NCR — transparent pricing before you inquire.
          </p>
        </div>
      </section>

      {/* ─── Host CTA ─── */}
      <section id="host" className="relative py-12 md:py-16" style={{ background: premiumBrand.ivory }}>
        <div className="xpx-container">
          <div
            className="relative overflow-hidden rounded-[24px] px-6 py-10 md:px-12 md:py-14"
            style={{
              background:
                'linear-gradient(135deg, #064E3B 0%, #0B8A5A 52%, #10B981 100%)',
              boxShadow: '0 20px 50px rgba(11, 138, 90, 0.22)',
            }}
          >
            <div className="relative z-[1] max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/90">
                Host with XpressBnB
              </p>
              <h2 className="mt-3 xpx-premium-font-display text-[32px] md:text-[40px] font-bold tracking-tight leading-[1.05] text-white max-w-[14ch]">
                Turn your space into income
              </h2>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-emerald-50/85 max-w-[42ch]">
                {INQUIRY_HOST_TAGLINE} List in minutes, zero platform fees on guest bookings.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/auth/login')}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-sm font-semibold bg-white text-[#065F46] shadow-lg xpx-press"
                >
                  Start hosting
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-sm font-semibold border border-white/40 text-white xpx-press"
                >
                  How it works
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="why" className="scroll-mt-28 py-12 md:py-16" style={{ background: premiumBrand.stone }}>
        <div className="xpx-container space-y-10">
          <div>
            <p className="xpx-premium-eyebrow">How it works</p>
            <h2 className="xpx-premium-section-title mt-2">Three calm steps to your stay</h2>
            <p className="mt-2 text-sm text-[#6B7280] max-w-lg">
              Browse first. Inquire when you&apos;re ready. Hear directly from the host.
            </p>
          </div>
          <HowItWorksWalkthrough id="how-it-works" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                {
                  icon: ShieldCheck,
                  title: 'Verified when marked',
                  desc: 'Quality-reviewed listings with transparent host pricing.',
                },
                {
                  icon: Zap,
                  title: 'Zero guest commission',
                  desc: 'You pay the host directly — no platform fees on your stay.',
                },
              ] as const
            ).map((card) => (
              <div
                key={card.title}
                className="rounded-[20px] p-6 bg-white/70 backdrop-blur-xl border border-white/80"
                style={{ boxShadow: '0 8px 24px rgba(17,24,39,0.05)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(11,138,90,0.12)', color: premiumBrand.forest }}
                >
                  <card.icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="mt-4 font-bold text-lg text-[#111827]">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ background: '#032E25', borderTop: `1px solid ${FOOTER_DIVIDER}` }}>
        <div className="xpx-container pt-14 md:pt-16 pb-8 md:pb-10">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2.5">
                <img
                  src={XPRESSBNB_LOGO_PATH}
                  alt=""
                  className={`${XPRESSBNB_LOGO_IMG_CLASS} h-9 w-9 object-contain`}
                  width={38}
                  height={38}
                  decoding="async"
                />
                <span className="xpx-premium-font-display font-bold text-lg text-white">
                  Xpress<span style={{ color: premiumBrand.forest }}>BnB</span>
                </span>
              </div>
              <p className="mt-5 text-sm leading-relaxed max-w-sm" style={{ color: FOOTER_BODY }}>
                Direct stays across Delhi NCR. Host-listed pricing, zero guest commission.
              </p>
            </div>
            <FooterCol
              title="Explore"
              items={['Delhi', 'Gurgaon', 'Noida', 'Rishikesh'].map((c) => ({
                label: c,
                onClick: () => onCityClick(c),
              }))}
            />
            <FooterCol
              title="Company"
              items={[
                { label: 'How it works', onClick: () => scrollTo('how-it-works') },
                { label: 'Become a Host', onClick: () => onNavigate('/auth/login') },
                { label: 'Help', onClick: () => { window.location.href = `mailto:${TEAM_EMAIL}`; } },
              ]}
            />
            <FooterCol
              title="Legal"
              items={[
                { label: 'Privacy', onClick: () => openHomeOverlay('privacy') },
                { label: 'Terms', onClick: () => openHomeOverlay('terms') },
                { label: 'Contact', onClick: () => { window.location.href = `mailto:${TEAM_EMAIL}`; } },
              ]}
            />
          </div>
          <div
            className="pt-7 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderTop: `1px solid ${FOOTER_DIVIDER}` }}
          >
            <p className="text-xs" style={{ color: FOOTER_COPY }}>
              &copy; 2026 XpressBnB. All rights reserved.
              {' · '}
              <ManageCookiesLink className="hover:underline" style={{ color: FOOTER_BODY }} />
            </p>
            <p className="text-xs font-semibold" style={{ color: FOOTER_BODY }}>
              India&apos;s direct host marketplace
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="shrink-0 w-[min(88vw,380px)] aspect-[4/5] rounded-[24px] animate-pulse"
          style={{ background: premiumBrand.stone }}
        />
      ))}
    </div>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; onClick: () => void }[];
}) {
  return (
    <div>
      <h4 className="font-bold text-sm mb-5 text-white">{title}</h4>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className="text-sm transition-colors hover:underline"
              style={{ color: FOOTER_BODY }}
              onMouseEnter={(e) => { e.currentTarget.style.color = premiumBrand.forest; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = FOOTER_BODY; }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
