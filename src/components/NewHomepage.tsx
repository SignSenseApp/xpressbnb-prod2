import { lazy, Suspense } from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  ShieldCheck,
  Zap,
  Lock,
  Menu,
  X,
} from 'lucide-react';
import { XPRESSBNB_LOGO_PATH } from '../lib/branding';
import SEOHead from './SEOHead';
import { generateOrganizationStructuredData } from '../lib/seo';
import { addDaysIso, parseTripFromSearch } from '../lib/tripSearch';
import { scrollToId } from '../lib/smoothScroll';
import XpModeSwitch from './XpModeSwitch';
import HomepageBelowFoldGate from './HomepageBelowFoldGate';
import { useNearbyLocationOptional } from '../contexts/NearbyLocationContext';
import { readLocationPreference } from '../lib/locationPreferences';

const PersonalizedHomeFeed = lazy(() => import('./nearby/PersonalizedHomeFeed'));

// Global brand system (premium minimal emerald scale).
const ACCENT = '#059669';
const ACCENT_DARK = '#047857';
const ACCENT_LIGHT = '#ecfdf5';
const BASE = '#FAFAF8';
const SURFACE = '#FFFFFF';
const SURFACE_LIGHT = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER = '#E5E7EB';
/**
 * Pexels CDN: keep `w` modest for first paint (LCP). Pattern:
 * `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=<width>`
 */
const HERO_PEXELS_W_DESKTOP = 1280;
const HERO_IMAGE_WIDTHS = [375, 768, HERO_PEXELS_W_DESKTOP] as const;
/** Full-bleed hero — image width always matches viewport. */
const HERO_IMAGE_SIZES = '100vw';

function pexelsPhotoUrl(photoId: string, width: number) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

function heroPexelsSrcSet(photoId: string): string {
  return HERO_IMAGE_WIDTHS.map((w) => `${pexelsPhotoUrl(photoId, w)} ${w}w`).join(', ');
}

function heroPexelsSrc(photoId: string): string {
  return pexelsPhotoUrl(photoId, HERO_PEXELS_W_DESKTOP);
}

/** Intrinsic 16:9 hints for hero `<img>` (object-cover; real aspect may vary slightly). */
const HERO_IMG_INTRINSIC = { width: 1920, height: 1080 } as const;

const HERO_SLIDE_META = [
  { city: 'Gurgaon', tagline: 'Corporate hub, premium stays', photoId: '1571460' },
  { city: 'Delhi', tagline: 'Capital stays, unbeatable prices', photoId: '2506988' },
  { city: 'Rishikesh', tagline: 'Yoga capital, riverside retreats', photoId: '2161449' },
  { city: 'Noida', tagline: 'Modern city, verified comfort', photoId: '1396122' },
  {
    city: 'Greater Noida',
    tagline: 'Spacious homes, serene surroundings',
    photoId: '1643383',
  },
] as const;

const HERO_SLIDES = HERO_SLIDE_META.map(({ city, tagline, photoId }) => ({
  city,
  tagline,
  photoId,
  src: heroPexelsSrc(photoId),
  srcSet: heroPexelsSrcSet(photoId),
}));

const CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Ghaziabad', 'Rishikesh'];

const BELOW_FOLD_ANCHOR_IDS = new Set(['listings', 'host', 'why']);

const TRUST_BADGES = [
  {
    icon: CheckCircle,
    label: 'Verified Properties',
    subtext: 'Every stay vetted',
  },
  {
    icon: Lock,
    label: 'Secure Booking',
    subtext: 'Protected payments',
  },
  {
    icon: Zap,
    label: 'Zero Commission',
    subtext: 'No middleman fees',
  },
  {
    icon: ShieldCheck,
    label: 'Best Price Guarantee',
    subtext: 'Always the best rate',
  },
];

export default function NewHomepage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  /** Slides that have ever been active — mount `<img>` only for these (starts {0} for LCP). */
  const heroSlidesWithImgRef = useRef(new Set<number>([0]));
  heroSlidesWithImgRef.current.add(heroIndex);

  const activateBelowFoldRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const next = (heroIndex + 1) % HERO_SLIDES.length;
    const slide = HERO_SLIDES[next];
    const img = new Image();
    img.sizes = HERO_IMAGE_SIZES;
    img.srcset = slide.srcSet;
    img.src = slide.src;
  }, [heroIndex]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
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
    const id = setInterval(() => {
      setHeroIndex(i => (i + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const scrollTo = (id: string) => {
    if (BELOW_FOLD_ANCHOR_IDS.has(id)) {
      activateBelowFoldRef.current?.();
    }
    requestAnimationFrame(() => {
      scrollToId(id, { offset: -88, duration: 1.05 });
    });
  };

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleCityClick = (city: string) => {
    navigate(`/stays/${city.toLowerCase().replace(/\s+/g, '-')}`);
  };

  // Hero search state — city + dates + guests, all serializable into the URL
  // so /stays/<city>?checkin=...&checkout=...&guests=N stays shareable.
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
    setSearchCheckout(prev => {
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
    navigate(`/stays/${slug}${qs ? `?${qs}` : ''}`);
  };

  const nearby = useNearbyLocationOptional();
  const hasPersonalizedLocation =
    nearby?.permission === 'granted' &&
    Boolean(nearby.coords ?? readLocationPreference()?.coords);

  if (hasPersonalizedLocation) {
    return (
      <>
        <SEOHead
          config={{
            title: `Stays near ${nearby?.detectedCity ?? 'you'} | XpressBnB`,
            description:
              'Personalized verified stays near you. Zero commission, direct from hosts.',
            keywords: 'nearby stays, verified homes, xpressbnb',
            canonical: 'https://xpressbnb.com',
            structuredData: generateOrganizationStructuredData(),
          }}
        />
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: BASE }}>
              <div className="text-sm text-xpx-muted">Curating stays for you…</div>
            </div>
          }
        >
          <PersonalizedHomeFeed onNavigate={navigate} />
        </Suspense>
      </>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-clip" style={{ background: BASE, color: TEXT }}>
      <SEOHead
        config={{
          title:
            'XpressBnB - Verified Stays in Delhi NCR | No Commission, Best Price Guaranteed',
          description:
            'Book verified homes and apartments directly from hosts. Premium stays in Delhi, Gurgaon, Noida and Rishikesh. No brokerage, zero commission.',
          keywords:
            'verified stays delhi, no brokerage apartments, premium stays noida, gurgaon serviced apartments, rishikesh retreats',
          canonical: 'https://xpressbnb.com',
          structuredData: generateOrganizationStructuredData(),
        }}
      />

      {/* ──── Navbar (premium white bar — hero layout unchanged) ──── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-[border-color] duration-300"
        style={{
          background: SURFACE,
          borderBottom: scrolled ? `1px solid ${BORDER}` : `1px solid rgba(226, 232, 240, 0.65)`,
          boxShadow: 'none',
        }}
      >
        <div className="xpx-container min-h-[var(--xpx-nav-height)] h-[var(--xpx-nav-height)] grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-self-start">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 min-w-0 text-left shrink"
              aria-label="XpressBnB home"
            >
              <img
                src={XPRESSBNB_LOGO_PATH}
                alt=""
                className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0"
                width={40}
                height={40}
                decoding="async"
                fetchPriority="low"
              />
              <span
                className="hidden sm:inline truncate text-[22px] sm:text-[24px] leading-none"
                style={{
                  letterSpacing: '-0.03em',
                  textShadow: '0 1px 2px rgba(15,23,42,0.18)',
                }}
              >
                <span style={{ color: TEXT, fontWeight: 800 }}>Xpress</span>
                <span style={{ color: '#34D399', fontWeight: 800 }}>BnB</span>
              </span>
            </button>
            <XpModeSwitch />
          </div>

          <nav className="hidden lg:flex items-center justify-center gap-1 justify-self-center">
            {['Stays', 'Experiences', 'Host', 'About'].map(label => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  label === 'Host'
                    ? navigate('/auth/login')
                    : scrollTo(label === 'Stays' ? 'listings' : label === 'About' ? 'why' : 'listings')
                }
                className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[48px] inline-flex items-center"
                style={{ color: TEXT }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = ACCENT;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = TEXT;
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 justify-self-end">
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="hidden md:inline-flex items-center justify-center px-3 sm:px-4 rounded-lg text-sm font-medium transition-colors min-h-[48px]"
              style={{ color: TEXT }}
              onMouseEnter={e => {
                e.currentTarget.style.color = ACCENT;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = TEXT;
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth/register')}
              className="inline-flex items-center justify-center rounded-lg px-2 sm:px-3 md:px-4 text-[11px] sm:text-xs md:text-sm font-semibold text-white transition-colors whitespace-nowrap min-h-[48px] shrink touch-manipulation"
              style={{ background: ACCENT }}
              onMouseEnter={e => {
                e.currentTarget.style.background = ACCENT_DARK;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = ACCENT;
              }}
            >
              <span className="hidden md:inline">List your property</span>
              <span className="md:hidden">List property</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(o => !o)}
              className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-lg transition-colors touch-manipulation"
              style={{ color: TEXT }}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X className="h-6 w-6" strokeWidth={2} /> : <Menu className="h-6 w-6" strokeWidth={2} />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div
            className="lg:hidden border-t overflow-hidden"
            style={{
              background: SURFACE,
              borderColor: BORDER,
            }}
          >
            <nav className="xpx-container py-3 flex flex-col">
              {['Stays', 'Experiences', 'Host', 'About'].map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    if (label === 'Host') {
                      navigate('/auth/login');
                    } else {
                      scrollTo(label === 'Stays' ? 'listings' : label === 'About' ? 'why' : 'listings');
                    }
                  }}
                  className="w-full text-left py-3.5 px-2 rounded-lg text-[15px] font-medium min-h-[48px] flex items-center touch-manipulation"
                  style={{ color: TEXT }}
                >
                  {label}
                </button>
              ))}
              <div className="border-t mt-2 pt-2 md:hidden" style={{ borderColor: BORDER }}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    navigate('/auth/login');
                  }}
                  className="w-full text-left py-3.5 px-2 rounded-lg text-[15px] font-medium min-h-[48px] flex items-center touch-manipulation"
                  style={{ color: TEXT }}
                >
                  Log in
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ──── Hero ──── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(430px, 70vh, 520px)', minHeight: 430 }}
      >
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.city}
            className="absolute inset-0"
            style={{
              opacity: i === heroIndex ? 1 : 0,
              transition: 'opacity 1800ms ease-in-out',
            }}
          >
            {heroSlidesWithImgRef.current.has(i) ? (
              <img
                src={slide.src}
                srcSet={slide.srcSet}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full max-w-none object-cover"
                width={HERO_IMG_INTRINSIC.width}
                height={HERO_IMG_INTRINSIC.height}
                sizes={HERO_IMAGE_SIZES}
                loading={i === heroIndex ? 'eager' : 'lazy'}
                fetchPriority={i === heroIndex ? 'high' : 'low'}
                decoding="async"
                style={{
                  transform: i === heroIndex ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 12000ms ease-out',
                }}
              />
            ) : null}
          </div>
        ))}
        {/* Gradient overlay — fades from 35% dark at top to the new off-white
            at the bottom, so the section seam into the cream Trust Strip is
            seamless. Avoids the old hard cinematic-black handoff. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,6,23,0.66) 0%, rgba(2,6,23,0.52) 42%, rgba(2,6,23,0.36) 72%, rgba(2,6,23,0.22) 100%)',
          }}
        />

        <div className="relative z-[1] h-full xpx-container xpx-nav-offset pb-8 md:pb-10">
          <div className="h-full flex flex-col justify-center">
            <div
              className="max-w-3xl"
              style={{ animation: 'fadeInUp 560ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
            >
              <h1
                className="text-white font-extrabold leading-[1.08] tracking-tight"
                style={{ fontSize: 'clamp(36px, 6.1vw, 76px)', lineHeight: 0.98, textShadow: '0 8px 28px rgba(2,6,23,0.45)' }}
              >
                Find Your Verified Stay
              </h1>
              <p
                className="mt-4 max-w-2xl text-sm sm:text-base md:text-lg font-medium"
                style={{ color: 'rgba(248,250,252,0.95)', textShadow: '0 2px 10px rgba(2,6,23,0.45)' }}
              >
                Direct bookings. Trusted hosts. Zero commission. Best price, always.
              </p>
            </div>

            <div
              className="w-full max-w-5xl mt-6 md:mt-auto md:pb-0.5"
              style={{ animation: 'xpx-search-float-in 620ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both' }}
            >
              <HeroSearchBar
                cities={CITIES}
                city={searchCity}
                onCityChange={setSearchCity}
                checkin={searchCheckin}
                onCheckinChange={handleSearchCheckin}
                checkout={searchCheckout}
                onCheckoutChange={handleSearchCheckout}
                guests={searchGuests}
                onGuestsChange={setSearchGuests}
                onSearch={handleHeroSearch}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ──── Trust Strip ──── */}
      <section
        className="relative z-[2] -mt-7 md:-mt-10"
        style={{ background: SURFACE_LIGHT, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="xpx-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3 py-5 md:py-6">
            {TRUST_BADGES.map(({ icon: Icon, label, subtext }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 md:gap-3 px-3 md:px-4 py-3 rounded-2xl"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 6px 18px rgba(15,23,42,0.05)',
                }}
              >
                <div
                  className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: ACCENT_LIGHT }}
                >
                  <Icon className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] md:text-sm font-semibold leading-tight" style={{ color: TEXT }}>
                    {label}
                  </div>
                  <div className="hidden md:block text-xs mt-1 leading-tight" style={{ color: TEXT_MUTED }}>
                    {subtext}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomepageBelowFoldGate
        onCityClick={handleCityClick}
        onNavigate={navigate}
        scrollTo={scrollTo}
        onActivateRef={(activate) => {
          activateBelowFoldRef.current = activate;
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════ */

interface HeroSearchBarProps {
  cities: readonly string[];
  city: string;
  onCityChange: (v: string) => void;
  checkin: string;
  onCheckinChange: (v: string) => void;
  checkout: string;
  onCheckoutChange: (v: string) => void;
  guests: number;
  onGuestsChange: (n: number) => void;
  onSearch: () => void;
}

function formatHeroDisplayDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Native date picker — fully invisible inputs (`opacity-0`) often ignore taps in Safari/WebKit. */
function openHeroDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    // showPicker() is synchronous and returns void in current TS lib defs.
    const el = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      input.click();
    }
  } catch {
    input.click();
  }
}

/**
 * HeroSearchBar — mobile sheet has city, dates, guests. Desktop: Airbnb-style pill with guests.
 */
function HeroSearchBar({
  cities,
  city,
  onCityChange,
  checkin,
  onCheckinChange,
  checkout,
  onCheckoutChange,
  guests,
  onGuestsChange,
  onSearch,
}: HeroSearchBarProps) {
  const today = new Date().toISOString().split('T')[0];
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  const mobileDateSummary =
    checkin && checkout
      ? `${formatHeroDisplayDate(checkin)} - ${formatHeroDisplayDate(checkout)}`
      : checkin
        ? formatHeroDisplayDate(checkin)
        : checkout
          ? formatHeroDisplayDate(checkout)
          : 'Add dates';

  return (
    <>
      {/* Mobile — compact trigger; full search opens in sheet */}
      <div
        className="md:hidden w-full rounded-3xl border bg-white px-3 py-2.5"
        style={{
          borderColor: 'rgba(226,232,240,0.95)',
          boxShadow: '0 14px 34px rgba(15,23,42,0.16)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="min-w-0 flex-1 text-left rounded-2xl px-1 py-1.5"
            aria-label="Open search filters"
          >
            <div className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>
              Where to?
            </div>
            <div className="mt-0.5 truncate text-[15px] font-bold leading-tight" style={{ color: '#111827' }}>
              {city}
            </div>
            <div className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: '#6B7280' }}>
              {mobileDateSummary} · {guests} {guests === 1 ? 'guest' : 'guests'}
            </div>
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex h-12 min-w-[98px] items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-white"
            style={{ background: ACCENT }}
            aria-label="Search stays"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            style={{ borderColor: '#E5E7EB' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Search stays</h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                Where to?
                <div className="mt-1.5 flex min-h-[48px] items-center gap-2 rounded-2xl border bg-white px-3" style={{ borderColor: '#E5E7EB' }}>
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: '#9CA3AF' }} />
                  <select
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    style={{ color: '#111827' }}
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2.5">
                <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                  Check-in
                  <div className="relative mt-1.5 min-h-[48px] flex items-center rounded-2xl border bg-white px-3" style={{ borderColor: '#E5E7EB' }}>
                    <Calendar className="h-4 w-4 shrink-0 mr-2" style={{ color: '#9CA3AF' }} />
                    <input
                      type="date"
                      min={today}
                      value={checkin}
                      onChange={(e) => onCheckinChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#111827' }}
                    />
                  </div>
                </label>
                <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                  Check-out
                  <div className="relative mt-1.5 min-h-[48px] flex items-center rounded-2xl border bg-white px-3" style={{ borderColor: '#E5E7EB' }}>
                    <Calendar className="h-4 w-4 shrink-0 mr-2" style={{ color: '#9CA3AF' }} />
                    <input
                      type="date"
                      min={checkin || today}
                      value={checkout}
                      onChange={(e) => onCheckoutChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#111827' }}
                    />
                  </div>
                </label>
              </div>
              <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                Guests
                <div className="mt-1.5 flex min-h-[48px] items-center gap-2 rounded-2xl border bg-white px-3" style={{ borderColor: '#E5E7EB' }}>
                  <Users className="h-4 w-4 shrink-0" style={{ color: '#9CA3AF' }} />
                  <select
                    value={guests}
                    onChange={(e) => onGuestsChange(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    style={{ color: '#111827' }}
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onSearch();
                }}
                className="mt-1 inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.99]"
                style={{ background: ACCENT }}
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop — premium segmented bar */}
      <div
        className="hidden md:flex items-center w-full"
        style={{
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
          minHeight: 78,
          padding: '6px 8px',
          maxWidth: 980,
          width: '100%',
          border: '1px solid rgba(226,232,240,0.9)',
        }}
      >
        <div
          className="flex flex-col justify-center min-w-0"
          style={{ flex: '1.25', paddingLeft: 18, paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Where to?</span>
          <div className="mt-0.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
              className="appearance-none bg-transparent border-0 p-0 text-[14px] outline-none cursor-pointer w-full truncate"
            style={{ color: '#111827', fontWeight: 700 }}
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: '#E5E7EB', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-[120px] shrink-0"
          style={{ flex: 1, paddingLeft: 14, paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Check-in</span>
          <div className="relative mt-0.5 min-h-[44px] w-full flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
            <input
              ref={checkInRef}
              type="date"
              min={today}
              value={checkin}
              onChange={(e) => onCheckinChange(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden={true}
            />
            <button
              type="button"
              onClick={() => openHeroDatePicker(checkInRef.current)}
              className="absolute inset-0 left-6 z-10 flex w-[calc(100%-1.5rem)] min-h-[44px] items-center rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2"
              aria-label="Choose check-in date"
            >
              <span className="text-[14px] font-semibold truncate" style={{ color: '#111827' }}>
                {checkin ? formatHeroDisplayDate(checkin) : 'Add date'}
              </span>
            </button>
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: '#E5E7EB', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-[120px] shrink-0"
          style={{ flex: 1, paddingLeft: 14, paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Check-out</span>
          <div className="relative mt-0.5 min-h-[44px] w-full flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
            <input
              ref={checkOutRef}
              type="date"
              min={checkin || today}
              value={checkout}
              onChange={(e) => onCheckoutChange(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden={true}
            />
            <button
              type="button"
              onClick={() => openHeroDatePicker(checkOutRef.current)}
              className="absolute inset-0 left-6 z-10 flex w-[calc(100%-1.5rem)] min-h-[44px] items-center rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2"
              aria-label="Choose check-out date"
            >
              <span className="text-[14px] font-semibold truncate" style={{ color: '#111827' }}>
                {checkout ? formatHeroDisplayDate(checkout) : 'Add date'}
              </span>
            </button>
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: '#E5E7EB', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-0"
          style={{ flex: 0.95, paddingLeft: 14, paddingRight: 12 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Guests</span>
          <div className="mt-0.5 flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
          <select
            value={guests}
            onChange={(e) => onGuestsChange(Number(e.target.value))}
              className="appearance-none bg-transparent border-0 p-0 text-[14px] outline-none cursor-pointer w-full truncate"
            style={{ color: '#111827', fontWeight: 700 }}
            aria-label="Guests"
          >
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'guest' : 'guests'}
              </option>
            ))}
          </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center justify-center gap-2 shrink-0 rounded-2xl px-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: ACCENT,
            height: 58,
            marginRight: 2,
          }}
          aria-label="Search stays"
        >
          <Search className="w-4 h-4" style={{ color: '#ffffff' }} />
          <span className="text-sm font-semibold text-white">Search</span>
        </button>
      </div>
    </>
  );
}
