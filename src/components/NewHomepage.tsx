import { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  Calendar,
  Users,
  Heart,
  CheckCircle,
  ShieldCheck,
  Zap,
  Lock,
  Play,
  Menu,
  X,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { XPRESSBNB_LOGO_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../lib/branding';
import { supabase } from '../lib/supabase';
import SEOHead from './SEOHead';
import { generateOrganizationStructuredData } from '../lib/seo';
import type { Property } from '../lib/database.types';
import { addDaysIso, parseTripFromSearch } from '../lib/tripSearch';
import { scrollToId } from '../lib/smoothScroll';

// Global brand system (premium minimal emerald scale).
const ACCENT = '#059669';
const ACCENT_DARK = '#047857';
const ACCENT_LIGHT = '#ecfdf5';
const BASE = '#FAFAF8';
const SURFACE = '#FFFFFF';
const SURFACE_LIGHT = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_MUTED = '#64748B';
const TEXT_SUBTLE = '#94A3B8';
const BORDER = '#E5E7EB';
const VERIFIED = '#059669';
const RATING = '#059669';
const FOOTER_HEADING = '#FFFFFF';
const FOOTER_BODY = 'rgba(255,255,255,0.6)';
const FOOTER_LOGO_ACCENT = ACCENT;
/** Footer link hover — same brand emerald as header accents */
const FOOTER_LINK_HOVER = ACCENT;
const FOOTER_DIVIDER = 'rgba(255,255,255,0.08)';
const FOOTER_COPY = 'rgba(255,255,255,0.35)';
const INK_FAINT = 'rgba(15,23,42,0.18)';

/**
 * Pexels CDN: keep `w` modest for first paint (LCP). Pattern:
 * `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=<width>`
 * Raising `w` slightly on large desktops is optional; 1280 is a good default for hero full-bleed.
 */
const HERO_PEXELS_W = 1280;

function pexelsPhotoUrl(photoId: string, width = HERO_PEXELS_W) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
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
  image: pexelsPhotoUrl(photoId, HERO_PEXELS_W),
}));

const CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Rishikesh'];

const CITY_IMAGES: Record<string, string> = {
  Delhi: pexelsPhotoUrl('789750', 600),
  Gurgaon: pexelsPhotoUrl('1571460', 600),
  Noida: pexelsPhotoUrl('1396122', 600),
  'Greater Noida': pexelsPhotoUrl('1643383', 600),
  Rishikesh: pexelsPhotoUrl('2161449', 600),
};

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

interface Testimonial {
  id: string;
  name: string;
  avatar_url: string;
  location: string;
  rating: number;
  quote: string;
}

const SOCIAL_PROOF_TESTIMONIALS: Testimonial[] = [
  {
    id: 'f1',
    name: 'Aarav Mehta',
    avatar_url: 'https://i.pravatar.cc/120?img=12',
    location: 'New Delhi',
    rating: 5,
    quote:
      'Booked a verified apartment in Saket and the experience was flawless. Zero hidden fees, instant confirmation, and the host was incredible.',
  },
  {
    id: 'f2',
    name: 'Priya Sharma',
    avatar_url: 'https://i.pravatar.cc/120?img=47',
    location: 'Mumbai',
    rating: 5,
    quote:
      'XpressBnB feels premium without the premium price tag. The verification badge gave me peace of mind, and the photos matched perfectly.',
  },
  {
    id: 'f3',
    name: 'Rohan Iyer',
    avatar_url: 'https://i.pravatar.cc/120?img=33',
    location: 'Bengaluru',
    rating: 5,
    quote:
      'Used it for a 2 week corporate stay in Gurgaon. Clean, modern, and the direct with host model saved me almost 11% versus other platforms.',
  },
];

export default function NewHomepage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesByCity, setPropertiesByCity] = useState<Record<string, Property[]>>({});
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  /** Slides that have ever been active — mount `<img>` only for these (starts {0} for LCP). */
  const heroSlidesWithImgRef = useRef(new Set<number>([0]));
  heroSlidesWithImgRef.current.add(heroIndex);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const next = (heroIndex + 1) % HERO_SLIDES.length;
    const url = HERO_SLIDES[next].image;
    const img = new Image();
    img.src = url;
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

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('is_verified', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
      const grouped: Record<string, Property[]> = {};
      CITIES.forEach(c => {
        grouped[c] = (data || []).filter(p => p.city === c);
      });
      setPropertiesByCity(grouped);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    scrollToId(id, { offset: -88, duration: 1.05 });
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

  const featuredProperties = properties.slice(0, 8);

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 min-h-[72px] h-[72px] grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 min-w-0 justify-self-start text-left"
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
              className="truncate text-[22px] sm:text-[24px] leading-none"
              style={{
                letterSpacing: '-0.03em',
                textShadow: '0 1px 2px rgba(15,23,42,0.18)',
              }}
            >
              <span style={{ color: TEXT, fontWeight: 800 }}>Xpress</span>
              <span style={{ color: '#34D399', fontWeight: 800 }}>BnB</span>
            </span>
          </button>

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
            <nav className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-3 flex flex-col">
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
                src={slide.image}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full max-w-none object-cover"
                width={HERO_IMG_INTRINSIC.width}
                height={HERO_IMG_INTRINSIC.height}
                sizes="100vw"
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

        <div className="relative z-[1] h-full max-w-7xl mx-auto px-4 md:px-8 pt-[104px] md:pt-[112px] pb-6 md:pb-8">
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
        <div className="max-w-7xl mx-auto px-4 md:px-8">
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

      {/* ──── Featured Stays ──── */}
      <section id="listings" className="scroll-mt-24" style={{ background: BASE }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-14 md:pb-16">
          <SectionHeader
            label="HANDPICKED FOR YOU"
            title="Featured Stays"
            subtitle="Premium verified properties from our community"
            action={
              <button
                onClick={() => handleCityClick('Delhi')}
                className="flex items-center gap-1 text-sm font-semibold transition-colors text-[#059669] hover:text-[#047857]"
              >
                View all stays
                <span aria-hidden>&rarr;</span>
              </button>
            }
          />

          {loading ? (
            <FeaturedSkeleton />
          ) : featuredProperties.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: TEXT_SUBTLE }}>
              No properties available right now.
            </div>
          ) : (
            <HorizontalScrollCards properties={featuredProperties} />
          )}
        </div>
      </section>

      {/* ──── Top Cities ──── */}
      <section style={{ background: SURFACE_LIGHT }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
          <SectionHeader
            label="EXPLORE"
            title="Top Destinations"
            subtitle="Verified homes across India’s best cities"
          />

          {/* Desktop editorial layout: Delhi left hero, Gurgaon top-right wide, three smaller cities below */}
          <div className="hidden md:grid md:grid-cols-12 md:grid-rows-[minmax(240px,1fr)_minmax(210px,0.9fr)] md:gap-4 lg:gap-5">
            <button
              type="button"
              onClick={() => handleCityClick('Delhi')}
                className="group relative md:col-span-5 md:row-span-2 overflow-hidden cursor-pointer transition-all duration-300 md:hover:-translate-y-1"
              style={{ boxShadow: '0 8px 22px rgba(15,23,42,0.08)', borderRadius: 20 }}
            >
              <TopDestinationCardInner city="Delhi" propertiesByCity={propertiesByCity} variant="hero" />
            </button>
            <button
              type="button"
              onClick={() => handleCityClick('Gurgaon')}
                className="group relative md:col-span-7 overflow-hidden cursor-pointer transition-all duration-300 md:hover:-translate-y-1"
              style={{ boxShadow: '0 8px 20px rgba(15,23,42,0.08)', borderRadius: 20 }}
            >
              <TopDestinationCardInner city="Gurgaon" propertiesByCity={propertiesByCity} variant="wide" />
            </button>
            <div className="md:col-span-7 grid grid-cols-3 gap-4 lg:gap-5">
              {(['Noida', 'Greater Noida', 'Rishikesh'] as const).map(city => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleCityClick(city)}
                  className="group relative min-h-[210px] overflow-hidden cursor-pointer transition-all duration-300 md:hover:-translate-y-1"
                  style={{ boxShadow: '0 8px 18px rgba(15,23,42,0.08)', borderRadius: 20 }}
                >
                  <TopDestinationCardInner city={city} propertiesByCity={propertiesByCity} />
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: premium 2-column cards with generous heights */}
          <div className="grid md:hidden grid-cols-2 gap-3.5">
            {CITIES.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => handleCityClick(city)}
                className="group relative min-h-[170px] overflow-hidden cursor-pointer transition-all duration-300 active:scale-[0.99]"
                style={{ boxShadow: '0 8px 18px rgba(15,23,42,0.08)', borderRadius: 20 }}
              >
                <TopDestinationCardInner city={city} propertiesByCity={propertiesByCity} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Social Proof ──── */}
      <section style={{ background: BASE }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
          <div className="text-center mb-9 md:mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="w-6 h-6" style={{ color: RATING }} fill={RATING} />
                ))}
              </div>
              <span className="text-3xl md:text-4xl font-extrabold ml-2" style={{ color: '#059669' }}>4.8</span>
            </div>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>from 50,000+ verified guest reviews</p>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:auto-rows-fr">
            {SOCIAL_PROOF_TESTIMONIALS.map(t => (
              <article
                key={t.id}
                className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-auto p-6 h-full flex flex-col transition-all duration-300 md:hover:-translate-y-1"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 18,
                  boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
                }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div>
                    <div className="font-bold text-sm leading-tight" style={{ color: TEXT }}>{t.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: TEXT_SUBTLE }}>{t.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5"
                      style={{ color: i < t.rating ? RATING : INK_FAINT }}
                      fill={i < t.rating ? RATING : 'transparent'}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed line-clamp-3 flex-1" style={{ color: TEXT_MUTED }}>
                  {t.quote}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Host CTA ──── */}
      <section
        id="host"
        className="relative"
        style={{
          background: BASE,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
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
                  List in minutes. Reach verified guests. Earn more with zero platform fees.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/auth/login')}
                    className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-full px-5 sm:px-5.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: '#ffffff',
                      color: '#065f46',
                      boxShadow: '0 8px 18px rgba(6, 78, 59, 0.22)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#ecfdf5';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    Start hosting
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTo('why')}
                    className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-full px-5 sm:px-5.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(236,253,245,0.45)',
                      color: '#ffffff',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ background: 'rgba(236,253,245,0.22)' }}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </span>
                    See how it works
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
                      Host growth snapshot
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-white">High-demand bookings across premium urban stays</p>
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
                    {
                      icon: '₹',
                      label: 'Monthly potential',
                      value: '₹45,000+',
                    },
                    {
                      icon: '%',
                      label: 'Platform fee',
                      value: '0%',
                    },
                    {
                      icon: '✓',
                      label: 'Verified guests',
                      value: '100%',
                    },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 py-2.5"
                      style={{
                        borderBottom: item.label === 'Verified guests' ? 'none' : '1px solid rgba(16,185,129,0.14)',
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

      {/* ──── Why XpressBnB ──── */}
      <section id="why" className="scroll-mt-24 relative z-[1]" style={{ background: SURFACE_LIGHT }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
          <SectionHeader
            label="WHY XPRESSBNB"
            title="The premium way to book stays"
            subtitle="Direct relationships, transparent pricing, verified properties"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
            {(
              [
                {
                  icon: ShieldCheck,
                  title: '100% Verified',
                  desc: 'Every property is personally inspected and approved before going live.',
                },
                {
                  icon: Zap,
                  title: 'Zero Commission',
                  desc: 'Book directly from the host. No middlemen, no surprise fees.',
                },
                {
                  icon: Lock,
                  title: 'Secure Payments',
                  desc: 'PCI-grade encryption and instant refunds keep your money protected.',
                },
                {
                  icon: Star,
                  title: 'Best Price Guarantee',
                  desc: 'See a lower price elsewhere? We match it and credit the difference.',
                },
              ] as const
            ).map(card => {
              const chip = { bg: ACCENT_LIGHT, fg: ACCENT };
              return (
              <div
                key={card.title}
                className="group h-full rounded-[20px] p-6 flex flex-col transition-all duration-300 md:hover:-translate-y-1"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  boxShadow: 'none',
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
        <div className="max-w-7xl mx-auto px-5 md:px-8 pt-14 md:pt-16 pb-8 md:pb-9">
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
                India&rsquo;s first zero-commission booking platform. Direct, verified, and beautifully simple.
              </p>
              <div className="mt-6 flex items-center gap-2.5">
                {[
                  { label: 'Instagram', Icon: Instagram },
                  { label: 'Facebook', Icon: Facebook },
                  { label: 'Twitter/X', Icon: Twitter },
                  { label: 'LinkedIn', Icon: Linkedin },
                ].map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors"
                    style={{
                      border: '1px solid rgba(236,253,245,0.2)',
                      color: 'rgba(236,253,245,0.82)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(236,253,245,0.82)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <FooterCol
              title="Explore"
              items={CITIES.map(c => ({ label: c, onClick: () => handleCityClick(c) }))}
            />
            <FooterCol
              title="Company"
              items={[
                { label: 'About', onClick: () => scrollTo('why') },
                { label: 'Become a Host', onClick: () => navigate('/auth/login') },
                { label: 'Help Center', onClick: () => scrollTo('why') },
              ]}
            />
            <FooterCol
              title="Legal"
              items={[
                { label: 'Privacy', onClick: () => {} },
                { label: 'Terms', onClick: () => {} },
                { label: 'Contact', onClick: () => {} },
              ]}
            />
          </div>
          <div
            className="pt-7 md:pt-8 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderTop: `1px solid ${FOOTER_DIVIDER}` }}
          >
            <p className="text-xs" style={{ color: FOOTER_COPY }}>
              &copy; 2025 XpressBnB. All rights reserved.
            </p>
            <p className="text-xs font-semibold" style={{ color: FOOTER_BODY }}>
              India&rsquo;s Smarter Stay ♡
            </p>
          </div>
        </div>
      </footer>

      <div className="h-16 md:hidden" />
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

function TopDestinationCardInner({
  city,
  propertiesByCity,
  variant = 'small',
}: {
  city: string;
  propertiesByCity: Record<string, Property[]>;
  variant?: 'hero' | 'wide' | 'small';
}) {
  const cover = propertiesByCity[city]?.[0]?.images?.[0] || CITY_IMAGES[city];
  const count = propertiesByCity[city]?.length ?? 0;
  const citySize = variant === 'hero' ? 30 : variant === 'wide' ? 24 : 19;
  const countSize = variant === 'hero' ? 'text-sm' : 'text-[13px]';
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
        <div className={`mt-1 ${countSize} font-medium`} style={{ color: 'rgba(248,250,252,0.88)' }}>
          {count.toLocaleString()} properties
        </div>
      </div>
    </div>
  );
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

function SectionHeader({
  label,
  title,
  subtitle,
  action,
}: {
  label: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
      <div>
        <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color: ACCENT }}>
          {label}
        </span>
        <h2 className="mt-2 text-[28px] md:text-3xl font-extrabold tracking-tight leading-tight" style={{ color: TEXT }}>
          {title}
        </h2>
        <p className="text-sm md:text-[15px] mt-1.5" style={{ color: TEXT_MUTED }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function HorizontalScrollCards({ properties }: { properties: Property[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
  }, [properties]);

  const scroll = (dir: 'left' | 'right') => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroll">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="md:hidden absolute left-1 top-1/2 -translate-y-1/2 z-[1] w-9 h-9 rounded-full items-center justify-center transition-all flex"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
          }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: TEXT }} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="md:hidden absolute right-1 top-1/2 -translate-y-1/2 z-[1] w-9 h-9 rounded-full items-center justify-center transition-all flex"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
          }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: TEXT }} />
        </button>
      )}
      <div
        ref={ref}
        onScroll={checkScroll}
        className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {properties.map(p => (
          <FeaturedCard key={p.id} property={p} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-5 md:hidden">
        {properties.slice(0, 6).map((_, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: i === 0 ? ACCENT : INK_FAINT }}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({ property }: { property: Property }) {
  const handleClick = () => {
    window.history.pushState({}, '', `/property/${property.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const price = (property.price_per_day || property.price_full_day || 0).toLocaleString();
  const reviews = Math.max(40, Math.round((property.rating || 4.8) * 25));

  return (
    <article
      onClick={handleClick}
      className="snap-start shrink-0 w-[82vw] min-w-[82vw] max-w-[82vw] sm:w-[74vw] sm:min-w-[74vw] sm:max-w-[74vw] md:w-auto md:min-w-0 md:max-w-none cursor-pointer rounded-[20px] overflow-hidden transition-all duration-300 md:hover:-translate-y-1.5 group h-full flex flex-col"
      style={{
        background: SURFACE,
        border: `1px solid #E5E7EB`,
        boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
      }}
    >
      <div className="relative h-[220px] overflow-hidden">
        {property.images?.[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-sm"
            style={{ background: SURFACE_LIGHT, color: TEXT_SUBTLE }}
          >
            No image
          </div>
        )}
        <div
          className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 6px 16px rgba(15,23,42,0.16)',
          }}
        >
          <Heart className="w-4 h-4" style={{ color: '#0F172A' }} />
        </div>

        <div
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}
        >
          <CheckCircle className="w-3.5 h-3.5" style={{ color: VERIFIED }} />
          <span style={{ color: ACCENT_DARK }}>{property.is_verified ? 'Verified' : 'Community'}</span>
        </div>
        <div
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(255,255,255,0.94)',
            color: TEXT,
            boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
          }}
        >
          &#8377;{price}/night
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-base leading-tight line-clamp-1" style={{ color: TEXT }}>
          {property.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm" style={{ color: TEXT_MUTED }}>
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{property.city}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 text-sm">
          <Star className="w-4 h-4" style={{ color: RATING }} fill={RATING} />
          <span className="font-semibold" style={{ color: TEXT }}>{property.rating?.toFixed(1) || '4.8'}</span>
          <span style={{ color: TEXT_SUBTLE }}>({reviews} reviews)</span>
        </div>
        <div className="mt-auto pt-3 border-t flex items-center gap-1.5 text-xs font-semibold" style={{ borderColor: BORDER, color: ACCENT_DARK }}>
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span>Verified property</span>
        </div>
      </div>
    </article>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-hidden">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="shrink-0 w-[78vw] min-w-[78vw] max-w-[78vw] md:w-auto md:min-w-0 md:max-w-none rounded-[20px] overflow-hidden"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div className="h-[220px] animate-pulse" style={{ background: SURFACE_LIGHT }} />
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
            <div className="h-3 w-1/3 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
          </div>
        </div>
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
      <h4 className="font-bold text-sm mb-5 tracking-wide" style={{ color: FOOTER_HEADING }}>{title}</h4>
      <ul className="space-y-3">
        {items.map(item => (
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
