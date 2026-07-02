import { lazy, Suspense, useMemo, type CSSProperties } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Menu, MessageCircle, X, MapPin, Search } from 'lucide-react';
import { XPRESSBNB_LOGO_PATH } from '../lib/branding';
import SEOHead from './SEOHead';
import { generateOrganizationStructuredData } from '../lib/seo';
import { addDaysIso, parseTripFromSearch } from '../lib/tripSearch';
import { scrollToId } from '../lib/smoothScroll';
import { readScrollAnchorOffset } from '../lib/layoutTokens';
import XpModeSwitch from './XpModeSwitch';
import HomepageBelowFoldGate from './HomepageBelowFoldGate';
import HeroSearchBar from './search/HeroSearchBar';
import MobileHomepageHero from './home/MobileHomepageHero';
import DesktopHomepageHero from './home/DesktopHomepageHero';
import LocalDiscoveryCarousel from './home/LocalDiscoveryCarousel';
import TrustChips from './home/TrustChips';
import { useNearbyLocationOptional } from '../contexts/NearbyLocationContext';
import { useGuestOnboardingOptional } from '../contexts/GuestOnboardingContext';
import { usePrefersReducedMotion } from '../hooks/useGalleryMotion';
import { useStickySearchMorph } from '../hooks/useStickySearchMorph';
import { prefetchStaysListingRouteChunk } from '../lib/listingRouteChunk';
import { readLocationPreference } from '../lib/locationPreferences';
import { premiumBrand } from '../lib/premiumBrand';

const PersonalizedHomeFeed = lazy(() => import('./nearby/PersonalizedHomeFeed'));

const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#ECFDF5',
  amber: '#F59E0B',
  amberBg: '#FFFBEB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#9CA3AF',
  background: '#F9FAFB',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const CITIES = [
  {
    name: 'Delhi',
    slug: 'delhi',
    tagline: 'Historic yet happening.',
    stays: '980+',
    icon: 'landmark',
  },
  {
    name: 'Gurgaon',
    slug: 'gurgaon',
    tagline: 'Modern stays. Great life.',
    stays: '450+',
    icon: 'building',
  },
  {
    name: 'Noida',
    slug: 'noida',
    tagline: 'Clean. Connected. Calm.',
    stays: '310+',
    icon: 'building-2',
  },
  {
    name: 'Greater Noida',
    slug: 'greater-noida',
    tagline: 'Space to breathe.',
    stays: '180+',
    icon: 'building-2',
  },
  {
    name: 'Rishikesh',
    slug: 'rishikesh',
    tagline: 'Spiritual. Serene. Real.',
    stays: '320+',
    icon: 'mountain',
  },
  {
    name: 'Ghaziabad',
    slug: 'ghaziabad',
    tagline: 'Close to everything.',
    stays: '120+',
    icon: 'building',
  },
];

const TRUST_ITEMS = [
  {
    icon: '₹',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    title: 'Zero Fees',
    desc: 'Pay hosts directly',
  },
  {
    icon: '👤',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    title: 'Direct Host',
    desc: 'Real people, real homes',
  },
  {
    icon: '✓',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
    title: 'Verified',
    desc: 'Every home checked',
  },
  {
    icon: '💰',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    title: 'No Commission',
    desc: 'Best price guaranteed',
  },
];

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1800&q=80',
    city: 'Rishikesh',
    place: 'The Ganges',
  },
  {
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1800&q=80',
    city: 'Delhi',
    place: 'India Gate',
  },
  {
    image: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=1800&q=80',
    city: 'Gurgaon',
    place: 'Cyber City',
  },
  {
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1800&q=80',
    city: 'Noida',
    place: 'Sector 18',
  },
];

const BELOW_FOLD_ANCHOR_IDS = new Set(['listings', 'host', 'why', 'how-it-works']);
const PERSONALIZED_CROSSFADE_MS = 220;

export default function NewHomepage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeCity, setActiveCity] = useState('delhi');

  const activateBelowFoldRef = useRef<(() => void) | null>(null);
  const heroSearchSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const scrollTo = (id: string) => {
    if (BELOW_FOLD_ANCHOR_IDS.has(id)) {
      activateBelowFoldRef.current?.();
    }
    requestAnimationFrame(() => {
      scrollToId(id, { offset: readScrollAnchorOffset(), duration: 1.05 });
    });
  };

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleCityClick = (cityOrSlug: string) => {
    const slug = cityOrSlug.toLowerCase().replace(/\s+/g, '-');
    prefetchStaysListingRouteChunk(slug);
    navigate(`/stays/${slug}`);
  };

  const [searchCity, setSearchCity] = useState<string>('Delhi');
  const [searchCheckin, setSearchCheckin] = useState<string>('');
  const [searchCheckout, setSearchCheckout] = useState<string>('');
  const [searchGuests, setSearchGuests] = useState<number>(2);

  useEffect(() => {
    if (window.location.pathname !== '/') return;
    const t = parseTripFromSearch(window.location.search);
    if (t.checkin) setSearchCheckin(t.checkin);
    if (t.checkout) setSearchCheckout(t.checkout);
    if (t.guests != null && t.guests > 0) setSearchGuests(t.guests);
  }, []);

  const handleSearchCheckin = (v: string) => {
    setSearchCheckin(v);
    setSearchCheckout((prev) => {
      if (!v) return prev;
      if (!prev || prev <= v) return addDaysIso(v, 1);
      return prev;
    });
  };

  const handleSearchCheckout = (v: string) => {
    if (searchCheckin && v && v <= searchCheckin) {
      setSearchCheckout(addDaysIso(searchCheckin, 1));
      return;
    }
    setSearchCheckout(v);
  };

  const handleHeroSearch = () => {
    const today = new Date().toISOString().split('T')[0];
    let cin = searchCheckin;
    let cout = searchCheckout;
    if (cin && cin < today) cin = today;
    if (cin && !cout) cout = addDaysIso(cin, 1);
    if (
      cin &&
      cout &&
      new Date(`${cout}T12:00:00`).getTime() <= new Date(`${cin}T12:00:00`).getTime()
    ) {
      cout = addDaysIso(cin, 1);
    }
    const slug = searchCity.toLowerCase().replace(/\s+/g, '-');
    const params = new URLSearchParams();
    if (cin) params.set('checkin', cin);
    if (cout) params.set('checkout', cout);
    if (searchGuests) params.set('guests', String(searchGuests));
    const qs = params.toString();
    prefetchStaysListingRouteChunk(slug);
    navigate(`/stays/${slug}${qs ? `?${qs}` : ''}`);
  };

  const nearby = useNearbyLocationOptional();
  const onboarding = useGuestOnboardingOptional();
  const reducedMotion = usePrefersReducedMotion();
  const hasPersonalizedLocation =
    nearby?.permission === 'granted' &&
    Boolean(nearby.coords ?? readLocationPreference()?.coords);
  const wantsPersonalized = hasPersonalizedLocation;
  const showPersonalized = wantsPersonalized && (onboarding?.isOnboardingSettled ?? true);
  const stickySearchActive = useStickySearchMorph(heroSearchSentinelRef, !showPersonalized);

  const nearbyLocationLabel = useMemo(() => {
    if (!nearby) return null;
    if (nearby.permission === 'granted') {
      const city =
        nearby.detectedCity?.split(',')[0] ?? nearby.locationLabel?.split(',')[0] ?? null;
      return city ? `Near ${city}` : 'Around you';
    }
    return 'Choose location';
  }, [nearby]);

  const handleSearchLocationClick = () => {
    navigate('/explore');
  };

  const searchBarProps = {
    cities: CITIES,
    city: searchCity,
    onCityChange: setSearchCity,
    checkin: searchCheckin,
    onCheckinChange: handleSearchCheckin,
    checkout: searchCheckout,
    onCheckoutChange: handleSearchCheckout,
    guests: searchGuests,
    onGuestsChange: setSearchGuests,
    onSearch: handleHeroSearch,
    locationLabel: nearbyLocationLabel,
    onLocationClick: handleSearchLocationClick,
  };

  const crossfadeStyle = (active: boolean): CSSProperties => ({
    opacity: active ? 1 : 0,
    pointerEvents: active ? 'auto' : 'none',
    transition: reducedMotion
      ? 'none'
      : `opacity ${PERSONALIZED_CROSSFADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  });

  const headerSolid = scrolled || stickySearchActive;

  const standardHomepage = (
    <div className="min-h-screen relative overflow-x-clip xpx-premium-page xpx-mobile-bottom-pad">
      <SEOHead
        config={{
          title: 'XpressBnB — Direct Stays in Delhi NCR | Zero Guest Commission',
          description:
            'Book directly with hosts. Private stays in Delhi, Gurgaon, Noida and Rishikesh. Zero guest commission, transparent pricing.',
          keywords:
            'direct stays delhi, premium stays noida, gurgaon serviced apartments, rishikesh retreats, zero commission',
          canonical: 'https://xpressbnb.com',
          structuredData: generateOrganizationStructuredData(),
        }}
      />

      {/* ─── Desktop header + mobile sticky search ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 xpx-top-chrome xpx-premium-header max-md:hidden ${
          headerSolid ? 'xpx-premium-header--solid' : 'xpx-premium-header--hero'
        }`}
      >
        <div className="xpx-container xpx-nav-row flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 min-w-0"
              aria-label="XpressBnB home"
            >
              <img
                src={XPRESSBNB_LOGO_PATH}
                alt=""
                className="h-9 w-9 object-contain shrink-0"
                width={36}
                height={36}
                decoding="async"
              />
              <span className="xpx-premium-font-display hidden sm:inline text-[20px] font-bold tracking-tight">
                <span style={{ color: premiumBrand.charcoal }}>Xpress</span>
                <span style={{ color: premiumBrand.forest }}>BnB</span>
              </span>
            </button>
            <XpModeSwitch />
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {['Stays', 'Host', 'About'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  label === 'Host'
                    ? navigate('/auth/login')
                    : scrollTo(label === 'Stays' ? 'listings' : 'how-it-works')
                }
                className="px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors"
                style={{ color: premiumBrand.charcoal }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = premiumBrand.forest;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = premiumBrand.charcoal;
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/track-inquiry')}
              className="xpx-premium-glass-btn"
              aria-label="Inbox"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth/register')}
              className="hidden md:inline-flex items-center justify-center rounded-full px-4 text-sm font-semibold text-white min-h-[44px] transition-opacity hover:opacity-95"
              style={{ background: premiumBrand.forest }}
            >
              List property
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="lg:hidden xpx-premium-glass-btn"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </header>

      {stickySearchActive && (
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-50 xpx-top-chrome xpx-premium-header xpx-premium-header--solid"
          aria-label="Search"
        >
          <div className="xpx-container py-2">
            <HeroSearchBar {...searchBarProps} variant="compact" />
          </div>
        </div>
      )}

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-x-0 top-0 z-[55] xpx-top-chrome pt-[calc(var(--xpx-safe-top)+4.5rem)]">
          <div className="mx-5 rounded-2xl border border-[rgba(17,24,39,0.08)] bg-[#FAF8F4]/98 backdrop-blur-xl shadow-lg overflow-hidden">
            <nav className="py-2 flex flex-col">
              {['Stays', 'Host', 'About', 'Log in'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    if (label === 'Host' || label === 'Log in') navigate('/auth/login');
                    else scrollTo(label === 'Stays' ? 'listings' : 'how-it-works');
                  }}
                  className="w-full text-left py-3.5 px-4 rounded-xl text-[15px] font-medium min-h-[48px]"
                  style={{ color: premiumBrand.charcoal }}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ─── Mobile Hero — New Design (Reduced Height) ─── */}
      <div className="md:hidden relative w-full overflow-hidden" style={{ height: '54vw', minHeight: '280px', maxHeight: '360px' }}>
        {/* Rotating background images */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${slide.image})`,
              opacity: i === heroIndex ? 1 : 0,
            }}
          />
        ))}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: `linear-gradient(170deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.52) 65%, rgba(0,0,0,0.80) 100%)`,
          }}
        />

        {/* Top scrim — neutral header zone (no green foliage / tint behind logo) */}
        <div
          className="absolute top-0 left-0 right-0 z-[2] pointer-events-none"
          style={{
            height: 'calc(var(--xpx-safe-top) + 5.5rem)',
            background:
              'linear-gradient(to bottom, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.22) 45%, transparent 100%)',
          }}
          aria-hidden
        />

        {/* Floating Header */}
        <div
          className="absolute left-0 right-0 z-50 h-16 px-[18px] flex items-center justify-between"
          style={{ top: 'var(--xpx-safe-top)' }}
        >
          {/* Logo pill */}
          <div className="flex items-center gap-2 bg-white backdrop-blur-md rounded-2xl px-3 py-2 shadow-sm">
            <img
              src={XPRESSBNB_LOGO_PATH}
              alt=""
              className="w-6 h-6 object-contain"
              width={24}
              height={24}
              decoding="async"
            />
            <span className="text-[15px] font-bold text-[#111827] tracking-tight">XpressBnB</span>
          </div>

          {/* Glass buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/track-inquiry')}
              className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center"
              aria-label="Inbox"
            >
              <MessageCircle className="h-5 w-5 text-white" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5 text-white" strokeWidth={2} />
              ) : (
                <Menu className="h-5 w-5 text-white" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* Content — bottom positioned */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
          {/* HEADLINE */}
          <div className="mb-3">
            <span
              className="block text-[34px] font-extrabold text-white leading-[1.05] tracking-[-0.8px]"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
            >
              XpressBnB gives you a place to belong
            </span>
          </div>

          {/* SUBTITLE */}
          <p className="text-[13px] text-white/80 font-normal leading-[1.45] mb-4" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            Book directly with verified Hosts. Stay freely
          </p>

          {/* SEARCH BAR - Modern VRBO Style */}
          <button
            type="button"
            onClick={handleSearchLocationClick}
            className="w-full flex items-center bg-white rounded-[28px] h-[56px] px-3 mb-4 shadow-2xl transition-transform active:scale-[0.98]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)' }}
          >
            {/* Icon + Text Container */}
            <div className="flex items-center gap-3 flex-1 px-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <MapPin className="w-5 h-5" style={{ color: COLORS.primary }} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col items-start flex-1">
                <span className="text-[15px] font-semibold text-[#111827] leading-tight">Where to?</span>
                <span className="text-[12px] text-[#6B7280] leading-tight">Anywhere · Any week</span>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95" style={{ background: COLORS.primary, boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                <Search className="w-[19px] h-[19px] text-white" strokeWidth={2.5} />
              </div>
            </div>
          </button>

          {/* SOCIAL PROOF - More Relatable */}
          <div className="flex items-center gap-3">
            {/* Avatar cluster */}
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-[28px] h-[28px] rounded-full bg-gray-300 border-2 border-white overflow-hidden"
                  style={{ marginLeft: i === 1 ? 0 : '-10px' }}
                />
              ))}
            </div>

            <div>
              <p className="text-[12px] text-white/85 font-medium leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
                Join thousands finding homes away
              </p>
              <p className="text-[11px] text-white/70 flex items-center gap-1" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
                <span className="text-[#F59E0B]">★</span>
                4.8 · Real guests, real reviews
              </p>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-4 right-5 z-10 flex gap-1.5">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIndex(i)}
              className="transition-all duration-300"
              style={{
                width: i === heroIndex ? 20 : 6,
                height: 6,
                borderRadius: 9999,
                background: i === heroIndex ? COLORS.primary : 'rgba(255,255,255,0.5)',
                border: 'none',
                padding: 0,
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Hide mobile nav when open */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-x-0 top-0 z-[55] xpx-top-chrome pt-[calc(var(--xpx-safe-top)+4.5rem)]">
          <div className="mx-5 rounded-2xl border border-[rgba(17,24,39,0.08)] bg-[#FAF8F4]/98 backdrop-blur-xl shadow-lg overflow-hidden">
            <nav className="py-2 flex flex-col">
              {['Stays', 'Host', 'About', 'Log in'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    if (label === 'Host' || label === 'Log in') navigate('/auth/login');
                    else scrollTo(label === 'Stays' ? 'listings' : 'how-it-works');
                  }}
                  className="w-full text-left py-3.5 px-4 rounded-xl text-[15px] font-medium min-h-[48px]"
                  style={{ color: premiumBrand.charcoal }}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <DesktopHomepageHero searchBarProps={searchBarProps} />

      {/* ─── City Chips (mobile) - Modern Style ─── */}
      <div className="md:hidden bg-white border-b border-gray-100 py-4">
        <div className="flex gap-2.5 overflow-x-auto px-4 scrollbar-hide">
          {CITIES.map((city) => (
            <button
              key={city.slug}
              onClick={() => {
                setActiveCity(city.slug);
                handleCityClick(city.slug);
              }}
              className={`px-5 py-2.5 rounded-full text-[13.5px] font-semibold whitespace-nowrap transition-all duration-200 ${
                activeCity === city.slug
                  ? 'bg-[#111827] text-white shadow-lg scale-105'
                  : 'bg-[#F9FAFB] text-[#374151] border-2 border-[#E5E7EB] hover:border-[#111827] active:scale-95'
              }`}
              style={{
                boxShadow: activeCity === city.slug ? '0 4px 12px rgba(17,24,39,0.25)' : 'none',
              }}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── City Discovery Cards (mobile) - Modern Style ─── */}
      <div className="md:hidden bg-[#F9FAFB] py-5">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide pb-2">
          {CITIES.map((city) => (
            <div
              key={city.slug}
              onClick={() => handleCityClick(city.slug)}
              className="min-w-[160px] w-[160px] bg-white rounded-[20px] overflow-hidden cursor-pointer border border-transparent transition-all duration-300 active:scale-95 hover:border-[#059669]"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)',
              }}
            >
              {/* City photo */}
              <div className="relative h-[100px] bg-gray-100 overflow-hidden">
                <img
                  src={`https://images.unsplash.com/photo-${city.slug === 'delhi' ? '1587474260584-136574528ed5' : city.slug === 'gurgaon' ? '1555636222-cae831e670b3' : city.slug === 'noida' ? '1582719508461-905c673771fd' : city.slug === 'rishikesh' ? '1506905925346-21bda4d32df4' : '1587474260584-136574528ed5'}?w=300&q=80`}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                {/* Icon chip with gradient */}
                <div 
                  className="absolute top-2.5 left-2.5 w-[32px] h-[32px] rounded-full flex items-center justify-center text-[16px] backdrop-blur-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                  }}
                >
                  {city.icon === 'landmark' ? '🏛️' : '🏢'}
                </div>
              </div>

              {/* City info */}
              <div className="p-3">
                <p className="text-[14px] font-bold text-[#111827] mb-1 leading-tight">{city.name}</p>
                <p className="text-[11.5px] text-[#6B7280] leading-[1.4] mb-2.5">{city.tagline}</p>
                <div className="flex items-center justify-end">
                  <div className="w-[24px] h-[24px] rounded-full bg-[#ECFDF5] flex items-center justify-center transition-transform hover:scale-110">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Trust Strip (mobile) - Modern Style ─── */}
      <div className="md:hidden bg-white py-5 px-4">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide">
          {TRUST_ITEMS.map((item, idx) => (
            <div
              key={item.title}
              className="flex items-start gap-3 min-w-fit"
              style={{
                animation: `fadeInUp 0.5s ease-out ${idx * 0.1}s both`,
              }}
            >
              {/* Icon circle with gradient */}
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 text-[16px] font-bold shadow-sm"
                style={{
                  background: item.iconBg,
                  color: item.iconColor,
                }}
              >
                {item.icon}
              </div>

              {/* Text */}
              <div>
                <p className="text-[13px] font-bold text-[#111827] leading-tight whitespace-nowrap mb-0.5">
                  {item.title}
                </p>
                <p className="text-[11px] text-[#6B7280] leading-tight whitespace-nowrap">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:block">
        <LocalDiscoveryCarousel onCityClick={handleCityClick} />
      </div>
      <div className="hidden md:block">
        <TrustChips desktopOnly />
      </div>

      <HomepageBelowFoldGate
        onCityClick={handleCityClick}
        onNavigate={navigate}
        scrollTo={scrollTo}
        onActivateRef={(activate) => {
          activateBelowFoldRef.current = activate;
        }}
        tripQuery={[
          searchCheckin && `checkin=${searchCheckin}`,
          searchCheckout && `checkout=${searchCheckout}`,
          searchGuests && `guests=${searchGuests}`,
        ]
          .filter(Boolean)
          .join('&')}
      />
    </div>
  );

  if (!wantsPersonalized) {
    return standardHomepage;
  }

  return (
    <div className="relative min-h-screen xpx-premium-page">
      <div
        className="min-h-screen"
        style={{
          ...crossfadeStyle(showPersonalized),
          position: showPersonalized ? 'relative' : 'absolute',
          inset: 0,
          width: '100%',
        }}
        aria-hidden={!showPersonalized}
      >
        <SEOHead
          config={{
            title: `Stays near ${nearby?.detectedCity ?? 'you'} | XpressBnB`,
            description: 'Personalized stays near you. Zero commission, direct from hosts.',
            keywords: 'nearby stays, direct host homes, xpressbnb',
            canonical: 'https://xpressbnb.com',
            structuredData: generateOrganizationStructuredData(),
          }}
        />
        <Suspense fallback={null}>
          <PersonalizedHomeFeed
            onNavigate={navigate}
            compactSearch={<HeroSearchBar {...searchBarProps} variant="compact" />}
          />
        </Suspense>
      </div>
      <div
        style={{
          ...crossfadeStyle(!showPersonalized),
          position: showPersonalized ? 'absolute' : 'relative',
          inset: 0,
          width: '100%',
        }}
        aria-hidden={showPersonalized}
      >
        {standardHomepage}
      </div>
    </div>
  );
}
