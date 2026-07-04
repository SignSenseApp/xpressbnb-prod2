import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { XPRESSBNB_LOGO_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../lib/branding';
import { logSupabaseError } from '../lib/supabase';
import type { Property } from '../lib/database.types';
import { normalizeCityBucket } from '../lib/cityBuckets';
import { openHomeOverlay } from '../lib/navigation';
import { TEAM_EMAIL } from '../lib/team';
import { ManageCookiesLink } from './CookieConsent';
import FeaturedStaysCarousel from './FeaturedStaysCarousel';
import NearbyStaysSection from './nearby/NearbyStaysSection';
import { OnboardingListingsEngagement } from './onboarding/OnboardingListingsEngagement';
import { firstImageUrl } from '../lib/savedListingsStorage';
import { getPublicListings, invalidatePublicListingsCache } from '../lib/publicListings';
import { warmPublicHostCache } from '../lib/hostPublicCache';
import { INQUIRY_HOST_TAGLINE } from '../lib/inquiryCopy';
import HowItWorksWalkthrough from './HowItWorksWalkthrough';

const ACCENT = '#059669';
const ACCENT_LIGHT = '#ecfdf5';
const BASE = '#FAFAF8';
const SURFACE = '#FFFFFF';
const SURFACE_LIGHT = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_MUTED = '#64748B';
const TEXT_SUBTLE = '#94A3B8';
const BORDER = '#E5E7EB';
const FOOTER_HEADING = '#FFFFFF';
const FOOTER_BODY = 'rgba(255,255,255,0.6)';
const FOOTER_LOGO_ACCENT = ACCENT;
const FOOTER_LINK_HOVER = ACCENT;
const FOOTER_DIVIDER = 'rgba(255,255,255,0.08)';
const FOOTER_COPY = 'rgba(255,255,255,0.35)';

function pexelsPhotoUrl(photoId: string, width: number) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

const CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Ghaziabad', 'Rishikesh'];

const CITY_TAGLINES: Record<string, string> = {
  Delhi: 'Capital stays, direct host pricing.',
  Gurgaon: 'Corporate hub, premium homes.',
  Noida: 'Modern stays, transparent pricing.',
  'Greater Noida': 'Spacious homes, quiet neighborhoods.',
  Rishikesh: 'Riverside retreats, calm stays.',
  Ghaziabad: 'Comfortable stays near Delhi NCR.',
};

const CITY_IMAGES: Record<string, string> = {
  Delhi: pexelsPhotoUrl('789750', 600),
  Gurgaon: pexelsPhotoUrl('1571460', 600),
  Noida: pexelsPhotoUrl('1396122', 600),
  'Greater Noida': pexelsPhotoUrl('1643383', 600),
  Ghaziabad: pexelsPhotoUrl('2506988', 600),
  Rishikesh: pexelsPhotoUrl('2161449', 600),
};

export type HomepageBelowFoldProps = {
  onCityClick: (city: string) => void;
  onNavigate: (path: string) => void;
  scrollTo: (id: string) => void;
};

export default function HomepageBelowFold({
  onCityClick,
  onNavigate,
  scrollTo,
}: HomepageBelowFoldProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesByCity, setPropertiesByCity] = useState<Record<string, Property[]>>({});
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
        setPropertiesByCity({});
        setListingsError("We couldn't load stays right now. Please try again.");
        return;
      }
      const data = result.listings;
      setProperties(data);
      warmPublicHostCache(data.map((listing) => listing.host_id));
      const grouped: Record<string, Property[]> = {};
      CITIES.forEach((c) => {
        grouped[c] = data.filter((p) => normalizeCityBucket(p.city) === c);
      });
      setPropertiesByCity(grouped);
    } catch (err) {
      if (requestId !== loadPropertiesRef.current) return;
      logSupabaseError('Error loading properties', err);
      setProperties([]);
      setPropertiesByCity({});
      setListingsError("We couldn't load stays right now. Please try again.");
    } finally {
      if (requestId === loadPropertiesRef.current) setLoading(false);
    }
  };

  const featuredProperties = properties.slice(0, 8);

  return (
    <>
      {/* ──── Nearby Stays (location-powered) ──── */}
      <NearbyStaysSection onNavigate={onNavigate} fallbackTrending={featuredProperties} />

      {/* ──── Featured Stays ──── */}
      <OnboardingListingsEngagement id="listings" className="scroll-mt-28 xpx-section" style={{ background: BASE }}>
        <div className="xpx-container">
          <SectionHeader
            label="HANDPICKED FOR YOU"
            title="Featured Stays"
            subtitle="Handpicked stays from our host community"
            action={
              <button
                onClick={() => onCityClick('Delhi')}
                className="flex items-center gap-1 text-sm font-semibold transition-colors text-[#059669] hover:text-[#047857]"
              >
                View all stays
                <span aria-hidden>&rarr;</span>
              </button>
            }
          />

          {loading ? (
            <FeaturedSkeleton />
          ) : listingsError ? (
            <div className="py-16 text-center text-sm px-4" style={{ color: TEXT_MUTED }}>
              <p className="font-semibold text-xpx-text mb-1">We couldn&apos;t load stays right now</p>
              <p>{listingsError}</p>
              <button
                type="button"
                onClick={() => {
                  invalidatePublicListingsCache();
                  void loadProperties(loadPropertiesRef.current, true);
                }}
                className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: ACCENT }}
              >
                Try again
              </button>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: TEXT_SUBTLE }}>
              No properties available right now.
            </div>
          ) : (
            <FeaturedStaysCarousel properties={featuredProperties} />
          )}
        </div>
      </OnboardingListingsEngagement>

      {/* ──── Top Cities ──── */}
      <section className="xpx-section" style={{ background: SURFACE_LIGHT }}>
        <div className="xpx-container">
          <SectionHeader
            label="EXPLORE"
            title="Top Destinations"
            subtitle="Direct host listings across India’s best cities"
          />

          <div className="hidden md:grid md:grid-cols-12 md:grid-rows-[minmax(240px,1fr)_minmax(210px,0.9fr)] md:gap-4 lg:gap-5">
            <button
              type="button"
              onClick={() => onCityClick('Delhi')}
              className="group relative md:col-span-5 md:row-span-2 overflow-hidden cursor-pointer transition-all duration-300 md:hover:-translate-y-1"
              style={{ boxShadow: '0 8px 22px rgba(15,23,42,0.08)', borderRadius: 20 }}
            >
              <TopDestinationCardInner city="Delhi" propertiesByCity={propertiesByCity} listingsLoading={loading} variant="hero" />
            </button>
            <button
              type="button"
              onClick={() => onCityClick('Gurgaon')}
              className="group relative md:col-span-7 overflow-hidden cursor-pointer transition-all duration-300 md:hover:-translate-y-1"
              style={{ boxShadow: '0 8px 20px rgba(15,23,42,0.08)', borderRadius: 20 }}
            >
              <TopDestinationCardInner city="Gurgaon" propertiesByCity={propertiesByCity} listingsLoading={loading} variant="wide" />
            </button>
            <div className="md:col-span-7 grid grid-cols-3 gap-4 lg:gap-5">
              {(['Noida', 'Greater Noida', 'Rishikesh'] as const).map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => onCityClick(city)}
                  className="group relative min-h-[210px] overflow-hidden cursor-pointer transition-all duration-300 md:hover:-translate-y-1"
                  style={{ boxShadow: '0 8px 18px rgba(15,23,42,0.08)', borderRadius: 20 }}
                >
                  <TopDestinationCardInner city={city} propertiesByCity={propertiesByCity} listingsLoading={loading} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:hidden grid-cols-2 gap-4">
            {CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => onCityClick(city)}
                className="group relative min-h-[170px] overflow-hidden cursor-pointer transition-all duration-300 active:scale-[0.99]"
                style={{ boxShadow: '0 8px 18px rgba(15,23,42,0.08)', borderRadius: 20 }}
              >
                <TopDestinationCardInner city={city} propertiesByCity={propertiesByCity} listingsLoading={loading} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Trust message ──── */}
      <section className="xpx-section" style={{ background: BASE }}>
        <div className="xpx-container">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: TEXT }}>
              Direct stays. Real hosts. Zero commission.
            </p>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
              Inquire when you are ready — transparent host pricing, no invented review scores.
            </p>
          </div>
        </div>
      </section>

      {/* ──── Host CTA ──── */}
      <section id="host" className="relative xpx-section" style={{ background: BASE }}>
        <div className="xpx-container">
          <div
            className="relative overflow-hidden rounded-[24px] px-5 py-8 sm:px-7 md:px-10 md:py-11 lg:px-12 lg:py-12"
            style={{
              background:
                'radial-gradient(74% 84% at 100% 0%, rgba(52,211,153,0.28) 0%, rgba(16,185,129,0) 62%), radial-gradient(70% 82% at 8% 100%, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0) 66%), linear-gradient(136deg, #064e3b 0%, #047857 46%, #059669 100%)',
              boxShadow: '0 14px 36px rgba(6, 78, 59, 0.25)',
            }}
          >
            <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-emerald-200/10 blur-3xl" aria-hidden />
            <div className="absolute -bottom-16 left-[24%] h-48 w-48 rounded-full bg-emerald-300/10 blur-3xl" aria-hidden />

            <div className="relative z-[1] grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] gap-8 lg:gap-8 items-center">
              <div className="max-w-xl">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'rgba(236,253,245,0.86)' }}>
                  Host with xpressbnb
                </p>
                <h2 className="mt-3 text-[30px] sm:text-[36px] md:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.05] text-white max-w-[14ch]">
                  Turn your empty space into income
                </h2>
                <p className="mt-4 max-w-[48ch] text-sm sm:text-[15px] md:text-base leading-relaxed" style={{ color: 'rgba(236,253,245,0.78)' }}>
                  {INQUIRY_HOST_TAGLINE} List in minutes, zero platform fees on guest bookings.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('/auth/login')}
                    className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-full px-5 sm:px-5.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: '#ffffff',
                      color: '#065f46',
                      boxShadow: '0 8px 18px rgba(6, 78, 59, 0.22)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ecfdf5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    Start hosting
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTo('how-it-works')}
                    className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-full px-5 sm:px-5.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(236,253,245,0.45)',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    How it works
                  </button>
                </div>
              </div>

              <div className="relative w-full max-w-[470px] lg:ml-auto pt-2 sm:pt-0">
                <div
                  className="relative overflow-hidden rounded-[20px] border"
                  style={{
                    borderColor: 'rgba(236,253,245,0.36)',
                    boxShadow: '0 12px 28px rgba(6, 78, 59, 0.24)',
                  }}
                >
                  <img
                    src="https://images.pexels.com/photos/6585618/pexels-photo-6585618.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    alt="Modern premium room for hosting"
                    className="h-[248px] w-full object-cover sm:h-[278px] md:h-[304px]"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(180deg, rgba(2,6,23,0.06) 0%, rgba(2,6,23,0.55) 100%)',
                    }}
                  />
                  <div className="absolute left-3.5 right-3.5 bottom-3.5 rounded-[14px] border px-3.5 py-2.5 backdrop-blur-sm" style={{ borderColor: 'rgba(236,253,245,0.26)', background: 'rgba(6,78,59,0.5)' }}>
                    <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'rgba(167,243,208,0.88)' }}>
                      Why hosts list here
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-white">Direct inquiries, zero commission on guest bookings</p>
                  </div>
                </div>

                <div
                  className="absolute -left-5 bottom-4 hidden sm:block w-[250px] rounded-[18px] border p-3.5 sm:w-[270px] sm:p-4"
                  style={{
                    borderColor: 'rgba(209,250,229,0.44)',
                    background: 'rgba(255,255,255,0.96)',
                    boxShadow: '0 10px 24px rgba(6, 78, 59, 0.18)',
                  }}
                >
                  {[
                    { icon: '%', label: 'Guest commission', value: '0%' },
                    { icon: '→', label: 'Inquiry flow', value: 'Direct' },
                    { icon: '✓', label: 'Listing control', value: 'Yours' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 py-2.5"
                      style={{
                        borderBottom: item.label === 'Listing control' ? 'none' : '1px solid rgba(16,185,129,0.14)',
                      }}
                    >
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                        style={{ background: '#ecfdf5', color: '#047857' }}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: '#6b7280' }}>
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[16px] font-extrabold leading-none" style={{ color: '#065f46' }}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── How it works + honest trust ──── */}
      <section id="why" className="scroll-mt-28 xpx-section relative z-[1]" style={{ background: SURFACE_LIGHT }}>
        <div className="xpx-container space-y-10 md:space-y-12">
          <SectionHeader
            label="HOW IT WORKS"
            title="Three calm steps to your stay"
            subtitle="Browse first. Inquire when you're ready. Hear directly from the host."
          />
          <HowItWorksWalkthrough id="how-it-works" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {(
              [
                {
                  icon: ShieldCheck,
                  title: 'Verified when marked',
                  desc: 'Listings with a verified badge have passed our quality review. Others are direct host listings with transparent pricing.',
                },
                {
                  icon: Zap,
                  title: 'Zero guest commission',
                  desc: 'You pay the host directly. We do not add platform fees on top of the listed price.',
                },
              ] as const
            ).map((card) => {
              const chip = { bg: ACCENT_LIGHT, fg: ACCENT };
              return (
                <div
                  key={card.title}
                  className="h-full rounded-[20px] p-6 flex flex-col"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                    style={{ background: chip.bg }}
                  >
                    <card.icon className="w-5 h-5" style={{ color: chip.fg }} strokeWidth={2} />
                  </div>
                  <h3 className="mt-5 font-bold text-lg" style={{ color: TEXT }}>{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <footer
        style={{
          background: '#032E25',
          borderTop: `1px solid ${FOOTER_DIVIDER}`,
        }}
      >
        <div className="xpx-container pt-14 md:pt-16 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-9">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-10 md:gap-10 mb-10 md:mb-11">
            <div>
              <div className="flex items-center gap-2.5 text-lg leading-none min-h-[40px]">
                <img
                  src={XPRESSBNB_LOGO_PATH}
                  alt=""
                  className={`${XPRESSBNB_LOGO_IMG_CLASS} h-9 w-9 object-contain shrink-0`}
                  width={38}
                  height={38}
                  decoding="async"
                />
                <span className="font-extrabold tracking-tight" style={{ color: FOOTER_HEADING }}>
                  Xpress<span style={{ color: FOOTER_LOGO_ACCENT }}>BnB</span>
                </span>
              </div>
              <p className="mt-5 text-sm leading-relaxed max-w-sm" style={{ color: FOOTER_BODY }}>
                Direct stays across Delhi NCR. Host-listed pricing, zero guest commission.
              </p>
              <p className="mt-4 text-sm" style={{ color: FOOTER_BODY }}>
                <a
                  href={`mailto:${TEAM_EMAIL}`}
                  className="font-semibold underline underline-offset-2 hover:opacity-90"
                  style={{ color: FOOTER_LINK_HOVER }}
                >
                  Questions? Email us
                </a>
              </p>
            </div>
            <FooterCol
              title="Explore"
              items={CITIES.map((c) => ({ label: c, onClick: () => onCityClick(c) }))}
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
            className="pt-7 md:pt-8 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderTop: `1px solid ${FOOTER_DIVIDER}` }}
          >
            <p className="text-xs" style={{ color: FOOTER_COPY }}>
              &copy; 2025 XpressBnB. All rights reserved.
              {' · '}
              <ManageCookiesLink
                className="hover:underline transition-colors"
                style={{ color: FOOTER_BODY }}
              />
            </p>
            <p className="text-xs font-semibold" style={{ color: FOOTER_BODY }}>
              India&rsquo;s Smarter Stay ♡
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function SectionHeader({
  label,
  title,
  subtitle,
  action,
}: {
  label: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="xpx-section-head flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
      <div className="min-w-0">
        <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color: ACCENT }}>
          {label}
        </span>
        <h2 className="mt-2.5 text-[26px] sm:text-[28px] md:text-3xl font-extrabold tracking-tight leading-[1.12]" style={{ color: TEXT }}>
          {title}
        </h2>
        <p className="text-sm md:text-[15px] mt-1.5" style={{ color: TEXT_MUTED }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="xpx-property-card shrink-0 w-[85vw] min-w-[85vw] max-w-[85vw] md:w-auto md:min-w-0 md:max-w-[380px] overflow-hidden"
        >
          <div className="xpx-property-card-media animate-pulse" style={{ background: SURFACE_LIGHT }} />
          <div className="xpx-property-card-skeleton-body">
            <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
            <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: SURFACE_LIGHT }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopDestinationCardInner({
  city,
  propertiesByCity,
  listingsLoading = false,
  variant = 'small',
}: {
  city: string;
  propertiesByCity: Record<string, Property[]>;
  listingsLoading?: boolean;
  variant?: 'hero' | 'wide' | 'small';
}) {
  const cover =
    firstImageUrl(propertiesByCity[city]?.[0]?.images ?? null) || CITY_IMAGES[city];
  const citySize = variant === 'hero' ? 30 : variant === 'wide' ? 24 : 19;
  const cardHeight = variant === 'hero' ? 'min-h-[470px]' : variant === 'wide' ? 'min-h-[240px]' : 'h-full';
  return (
    <div className={`relative w-full h-full ${cardHeight}`}>
      <img
        src={cover}
        alt={city}
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.06] transition-transform duration-700"
        loading="lazy"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(2,6,23,0) 42%, rgba(2,6,23,0.32) 68%, rgba(2,6,23,0.82) 100%)',
        }}
      />
      <div className="absolute bottom-5 left-5 right-5 text-left">
        <div
          className="text-white font-extrabold leading-tight"
          style={{ fontSize: citySize, textShadow: '0 3px 12px rgba(2,6,23,0.38)' }}
        >
          {city}
        </div>
        {listingsLoading ? (
          <p className="text-sm font-medium mt-1" style={{ color: 'rgba(248,250,252,0.88)' }}>
            Loading stays…
          </p>
        ) : (
          <p className="text-xs font-medium text-white/75 italic tracking-wide mt-1">
            {CITY_TAGLINES[city] || city}
          </p>
        )}
      </div>
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
      <h4 className="font-bold text-sm mb-5 tracking-wide" style={{ color: FOOTER_HEADING }}>{title}</h4>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className="text-sm transition-colors hover:underline"
              style={{ color: FOOTER_BODY }}
              onMouseEnter={(e) => { e.currentTarget.style.color = FOOTER_LINK_HOVER; }}
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
