import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  Heart,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  Zap,
  Lock,
} from 'lucide-react';
import { XPRESSBNB_LOGO_IMG_CLASS, XPRESSBNB_LOGO_NAV_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../lib/branding';
import { supabase } from '../lib/supabase';
import SEOHead from './SEOHead';
import { generateOrganizationStructuredData } from '../lib/seo';
import type { Property } from '../lib/database.types';
import { addDaysIso, parseTripFromSearch } from '../lib/tripSearch';
import { getLenis, scrollToId } from '../lib/smoothScroll';

// Brand emerald (#50C878) — coral (#FF385C) reserved for Search Stays + Reserve/Book only.
const ACCENT = '#50C878';
const ACCENT_DARK = '#3dae68';
const ACCENT_LIGHT = '#ecfdf5';
const ACCENT_BORDER = '#bbf7d0';
const CTA_RED = '#FF385C';
const CTA_RED_DARK = '#E11D48';
const BASE = '#FFFFFF';
const SURFACE = '#FFFFFF';
const SURFACE_LIGHT = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_MUTED = '#64748B';
const TEXT_SUBTLE = '#94A3B8';
const BORDER = '#E2E8F0';
const VERIFIED = '#50C878';
const VERIFIED_BG = '#ecfdf5';
const RATING = '#D97706';
const FOOTER_HEADING = '#FFFFFF';
const FOOTER_BODY = 'rgba(255,255,255,0.6)';
const FOOTER_LOGO_ACCENT = ACCENT;
/** Footer link hover — same brand emerald as header accents */
const FOOTER_LINK_HOVER = ACCENT;
const FOOTER_DIVIDER = 'rgba(255,255,255,0.08)';
const FOOTER_COPY = 'rgba(255,255,255,0.35)';
const INK_FAINT = 'rgba(15,23,42,0.18)';

const HERO_SLIDES = [
  {
    city: 'Gurgaon',
    tagline: 'Corporate hub, premium stays',
    image:
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  {
    city: 'Delhi',
    tagline: 'Capital stays, unbeatable prices',
    image:
      'https://images.pexels.com/photos/2506988/pexels-photo-2506988.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  {
    city: 'Rishikesh',
    tagline: 'Yoga capital, riverside retreats',
    image:
      'https://images.pexels.com/photos/2161449/pexels-photo-2161449.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  {
    city: 'Noida',
    tagline: 'Modern city, verified comfort',
    image:
      'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  {
    city: 'Greater Noida',
    tagline: 'Spacious homes, serene surroundings',
    image:
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
];

const CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Rishikesh'];

const CITY_IMAGES: Record<string, string> = {
  Delhi:
    'https://images.pexels.com/photos/789750/pexels-photo-789750.jpeg?auto=compress&cs=tinysrgb&w=600',
  Gurgaon:
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600',
  Noida:
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Greater Noida':
    'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=600',
  Rishikesh:
    'https://images.pexels.com/photos/2161449/pexels-photo-2161449.jpeg?auto=compress&cs=tinysrgb&w=600',
};

const TRUST_BADGES = [
  { icon: CheckCircle, label: 'Verified Properties' },
  { icon: Lock, label: 'Secure Booking' },
  { icon: Zap, label: 'Zero Commission' },
];

interface Testimonial {
  id: string;
  name: string;
  avatar_url: string;
  location: string;
  rating: number;
  quote: string;
}

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'f1',
    name: 'Aarav Mehta',
    avatar_url: 'https://i.pravatar.cc/120?img=12',
    location: 'New Delhi',
    rating: 5,
    quote:
      'Booked a verified apartment in Saket and the experience was flawless. Zero hidden fees and the host was incredible.',
  },
  {
    id: 'f2',
    name: 'Priya Sharma',
    avatar_url: 'https://i.pravatar.cc/120?img=47',
    location: 'Mumbai',
    rating: 5,
    quote:
      'XpressBnB feels premium without the premium price tag. The verification badge gave me real peace of mind.',
  },
  {
    id: 'f3',
    name: 'Rohan Iyer',
    avatar_url: 'https://i.pravatar.cc/120?img=33',
    location: 'Bengaluru',
    rating: 5,
    quote:
      'Used it for a 2-week corporate stay in Gurgaon. Direct-with-host model saved me almost 18% versus other platforms.',
  },
];

export default function NewHomepage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesByCity, setPropertiesByCity] = useState<Record<string, Property[]>>({});
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);

  useEffect(() => {
    loadProperties();
    loadTestimonials();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
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

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_testimonials')
        .select('id, name, avatar_url, location, rating, quote')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        setTestimonials(data as Testimonial[]);
      }
    } catch {
      /* fallback testimonials remain */
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
    <div className="min-h-screen relative" style={{ background: BASE, color: TEXT }}>
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

      {/* ──── Navbar ──── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? 'rgba(255,255,255,0.78)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
          borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-2">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 min-w-0 shrink text-base sm:text-lg md:text-xl leading-none"
          >
            <img
              src={XPRESSBNB_LOGO_PATH}
              alt=""
              className={XPRESSBNB_LOGO_NAV_IMG_CLASS}
              width={48}
              height={48}
              decoding="async"
            />
            <span
              className="font-extrabold tracking-tight truncate"
              style={{
                color: scrolled ? TEXT : '#ffffff',
                textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.35), 0 0 18px rgba(0,0,0,0.22)',
              }}
            >
              Xpress<span style={{ color: ACCENT }}>BnB</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {['Stays', 'Experiences', 'Host', 'About'].map(label => (
              <button
                key={label}
                onClick={() =>
                  label === 'Host'
                    ? navigate('/auth/login')
                    : scrollTo(label === 'Stays' ? 'listings' : label === 'About' ? 'why' : 'listings')
                }
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  color: scrolled ? TEXT_MUTED : 'rgba(255,255,255,0.85)',
                  textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/auth/login')}
              className={`hidden md:inline-flex px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                scrolled ? 'text-[#0F172A] hover:text-[#50C878]' : 'text-white/85 hover:text-white'
              }`}
              style={{
                textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              className="rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:scale-[1.03] whitespace-nowrap hover:brightness-95"
              style={{
                background: ACCENT,
                boxShadow: '0 8px 24px rgba(80,200,120,0.35)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = ACCENT_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ACCENT;
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* ──── Hero ──── */}
      <section className="relative w-full overflow-hidden" style={{ height: '100svh', minHeight: 580 }}>
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.city}
            className="absolute inset-0"
            style={{
              opacity: i === heroIndex ? 1 : 0,
              transition: 'opacity 1800ms ease-in-out',
            }}
          >
            <img
              src={slide.image}
              alt={slide.city}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: i === heroIndex ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 12000ms ease-out',
              }}
            />
          </div>
        ))}
        {/* Gradient overlay — fades from 35% dark at top to the new off-white
            at the bottom, so the section seam into the cream Trust Strip is
            seamless. Avoids the old hard cinematic-black handoff. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.45) 50%, rgba(13,27,42,0.55) 88%, ' + BASE + ' 100%)',
          }}
        />

        <div className="relative z-[1] h-full flex flex-col justify-center px-4 md:px-8 max-w-7xl mx-auto pt-20 pb-4">
          <div className="flex-1 flex flex-col justify-center md:justify-center">
            <div className="max-w-xl">
              <h1
                className="text-white font-extrabold leading-[1.08] tracking-tight"
                style={{ fontSize: 'clamp(28px, 5vw, 52px)', textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
              >
                Find Your Verified Stay
              </h1>
              <p
                className="mt-3 text-base md:text-lg font-medium"
                style={{ color: ACCENT, textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}
              >
                Zero commission. Trusted hosts.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.city}
                  onClick={() => setHeroIndex(i)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: i === heroIndex ? 'rgba(80,200,120,0.28)' : 'rgba(255,255,255,0.16)',
                    color: i === heroIndex ? '#ffffff' : 'rgba(255,255,255,0.85)',
                    border: i === heroIndex ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <MapPin className="w-3 h-3" />
                  {s.city}
                </button>
              ))}
            </div>

            {/* Search Bar - placed right after city pills so it stays visible on mobile */}
            <div className="w-full max-w-3xl mt-6">
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
        className="relative z-[1] -mt-1"
        style={{ background: SURFACE_LIGHT, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-center gap-3 md:gap-12 py-4 overflow-x-auto scrollbar-hide">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 shrink-0 px-4 py-2.5 rounded-xl"
                style={{ background: SURFACE, border: '1px solid rgba(80,200,120,0.4)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: ACCENT_LIGHT }}
                >
                  <Icon className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: TEXT }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Featured Stays ──── */}
      <section id="listings" className="scroll-mt-24" style={{ background: BASE }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-10">
          <SectionHeader
            label="HANDPICKED FOR YOU"
            title="Featured Stays"
            subtitle="Premium verified properties from our community"
            action={
              <button
                onClick={() => handleCityClick('Delhi')}
                className="flex items-center gap-1 text-sm font-semibold transition-colors text-[#50C878] hover:text-[#3dae68]"
              >
                View all
                <ChevronRight className="w-4 h-4" />
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
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
          <SectionHeader
            label="EXPLORE"
            title="Top Destinations"
            subtitle="Verified homes across India's best cities"
          />

          {/* Desktop: row1 Delhi (2 cols) | Gurgaon; row2 Noida | Greater Noida | Rishikesh */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-3">
            <button
              type="button"
              onClick={() => handleCityClick('Delhi')}
              className="group relative md:col-span-2 aspect-[16/9] overflow-hidden cursor-pointer rounded-2xl transition-all duration-300 md:hover:scale-[1.01]"
              style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.08)', borderRadius: 16 }}
            >
              <TopDestinationCardInner city="Delhi" propertiesByCity={propertiesByCity} large />
            </button>
            <button
              type="button"
              onClick={() => handleCityClick('Gurgaon')}
              className="group relative aspect-[4/3] overflow-hidden cursor-pointer rounded-2xl transition-all duration-300 md:hover:scale-[1.01]"
              style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.08)', borderRadius: 16 }}
            >
              <TopDestinationCardInner city="Gurgaon" propertiesByCity={propertiesByCity} />
            </button>
            {(['Noida', 'Greater Noida', 'Rishikesh'] as const).map(city => (
              <button
                key={city}
                type="button"
                onClick={() => handleCityClick(city)}
                className="group relative aspect-[4/3] overflow-hidden cursor-pointer rounded-2xl transition-all duration-300 md:hover:scale-[1.01]"
                style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.08)', borderRadius: 16 }}
              >
                <TopDestinationCardInner city={city} propertiesByCity={propertiesByCity} />
              </button>
            ))}
          </div>

          {/* Mobile: 2×3, equal 4/3 */}
          <div className="grid md:hidden grid-cols-2 gap-3">
            {CITIES.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => handleCityClick(city)}
                className="group relative aspect-[4/3] overflow-hidden cursor-pointer rounded-2xl transition-all duration-300 active:scale-[0.99]"
                style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.08)', borderRadius: 16 }}
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
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="w-6 h-6" style={{ color: RATING }} fill={RATING} />
                ))}
              </div>
              <span className="text-3xl md:text-4xl font-extrabold ml-2" style={{ color: '#50C878' }}>4.8</span>
            </div>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>from 50,000+ verified guest reviews</p>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
            {testimonials.slice(0, 3).map(t => (
              <article
                key={t.id}
                className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-auto rounded-2xl p-6 transition-colors duration-200 hover:border-[#50C878]"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 2px ${ACCENT}40` }}
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
                <p className="mt-3 text-sm leading-relaxed line-clamp-3" style={{ color: TEXT_MUTED }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Host CTA ──── */}
      <section
        id="host"
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #022c22 0%, #166534 50%, #50C878 100%)',
        }}
      >
        <div className="relative z-[1] max-w-3xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <h2
            className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white"
            style={{ fontWeight: 800 }}
          >
            Earn with XpressBnB
          </h2>
          <p
            className="mt-3 text-base md:text-lg max-w-lg mx-auto"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            List your property in 5 minutes. Start earning from day one with zero platform fees.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold transition-all hover:scale-[1.03]"
            style={{
              background: '#FFFFFF',
              color: '#15803d',
              fontWeight: 700,
              borderRadius: 50,
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.92)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            Start Hosting
            <ArrowRight className="w-5 h-5" style={{ color: '#15803d' }} />
          </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(
              [
                {
                  icon: ShieldCheck,
                  title: '100% Verified',
                  desc: 'Every property is personally inspected and approved before going live.',
                  accent: 'card' as const,
                },
                {
                  icon: Zap,
                  title: 'Zero Commission',
                  desc: 'Book directly from the host. No middlemen, no surprise fees.',
                  accent: 'card' as const,
                },
                {
                  icon: Lock,
                  title: 'Secure Payments',
                  desc: 'PCI-grade encryption and instant refunds keep your money protected.',
                  accent: 'card' as const,
                },
                {
                  icon: Star,
                  title: 'Best Price Guarantee',
                  desc: 'See a lower price elsewhere? We match it and credit the difference.',
                  accent: 'card' as const,
                },
              ] as const
            ).map(card => {
              const chip = { bg: ACCENT_LIGHT, fg: ACCENT };
              return (
              <div
                key={card.title}
                className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  boxShadow: 'var(--xpx-shadow-card)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: chip.bg }}
                >
                  <card.icon className="w-5 h-5" style={{ color: chip.fg }} />
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
          background: '#022c22',
          borderTop: `1px solid ${FOOTER_DIVIDER}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-lg leading-none">
                <img
                  src={XPRESSBNB_LOGO_PATH}
                  alt=""
                  className={XPRESSBNB_LOGO_IMG_CLASS}
                  width={36}
                  height={36}
                  decoding="async"
                />
                <span className="font-extrabold tracking-tight" style={{ color: FOOTER_HEADING }}>
                  Xpress<span style={{ color: FOOTER_LOGO_ACCENT }}>BnB</span>
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: FOOTER_BODY }}>
                India&rsquo;s first zero-commission booking platform. Direct, verified, and
                beautifully simple.
              </p>
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
            className="pt-8 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderTop: `1px solid ${FOOTER_DIVIDER}` }}
          >
            <p className="text-xs" style={{ color: FOOTER_COPY }}>
              &copy; 2026 XpressBnB. All rights reserved.
            </p>
            <p className="text-xs font-semibold" style={{ color: FOOTER_BODY }}>
              India&rsquo;s Smarter Stay
            </p>
          </div>
        </div>
      </footer>

      <div className="h-20 md:hidden" />
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
    const el = input as HTMLInputElement & { showPicker?: () => Promise<void> };
    if (typeof el.showPicker === 'function') {
      void el.showPicker().catch(() => input.click());
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
  large = false,
}: {
  city: string;
  propertiesByCity: Record<string, Property[]>;
  large?: boolean;
}) {
  const count = propertiesByCity[city]?.length || 0;
  const cover = propertiesByCity[city]?.[0]?.images?.[0] || CITY_IMAGES[city];
  return (
    <>
      <img
        src={cover}
        alt={city}
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)',
        }}
      />
      <div className="absolute bottom-4 left-4 text-left">
        <div
          className="text-white font-extrabold leading-tight"
          style={{ fontSize: large ? 22 : 16 }}
        >
          {city}
        </div>
        <div className="mt-0.5 text-xs font-normal" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {count} properties
        </div>
      </div>
    </>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    const lenis = getLenis();
    lenis?.stop();

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      lenis?.start();
    };
  }, [mobileOpen]);

  const mobileSheet =
    mobileOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-search-sheet-title"
            className="fixed inset-0 z-[120] flex flex-col justify-end bg-slate-950/45 backdrop-blur-md md:hidden"
            style={{
              WebkitTapHighlightColor: 'transparent',
              overscrollBehavior: 'contain',
            }}
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="xpx-hero-search-sheet mx-auto flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-[28px] shadow-[0_-16px_56px_rgba(15,23,42,0.22)] overflow-hidden"
              style={{
                background: SURFACE,
                borderTop: `1px solid ${BORDER}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex justify-center bg-[inherit] pt-3 pb-2">
                <div className="h-1 w-11 rounded-full bg-slate-300/95" aria-hidden />
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 space-y-4"
                style={{
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3
                    id="hero-search-sheet-title"
                    className="text-base font-bold"
                    style={{ color: TEXT }}
                  >
                    Search stays
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl leading-none transition-transform active:scale-95"
                    style={{ background: SURFACE_LIGHT, color: TEXT }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <label className="block text-xs font-semibold" style={{ color: TEXT_MUTED }}>
                  City
                  <select
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="xpx-input mt-1"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold" style={{ color: TEXT_MUTED }}>
                    Check-in
                    <input
                      type="date"
                      min={today}
                      value={checkin}
                      onChange={(e) => onCheckinChange(e.target.value)}
                      className="xpx-input mt-1 min-h-[48px]"
                    />
                  </label>
                  <label className="text-xs font-semibold" style={{ color: TEXT_MUTED }}>
                    Check-out
                    <input
                      type="date"
                      min={checkin || today}
                      value={checkout}
                      onChange={(e) => onCheckoutChange(e.target.value)}
                      className="xpx-input mt-1 min-h-[48px]"
                    />
                  </label>
                </div>
                <label className="block text-xs font-semibold" style={{ color: TEXT_MUTED }}>
                  Guests
                  <select
                    value={guests}
                    onChange={(e) => onGuestsChange(Number(e.target.value))}
                    className="xpx-input mt-1 min-h-[48px]"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onSearch();
                  }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold transition-transform active:scale-[0.98]"
                  style={{
                    background: CTA_RED,
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(255,56,92,0.32)',
                    minHeight: 52,
                  }}
                >
                  <Search className="h-4 w-4" />
                  Search stays
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {/* Mobile — Where to? + search only (dates/guests in sheet) */}
      <div
        className="md:hidden flex items-center w-full rounded-full overflow-hidden"
        style={{
          height: 46,
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          padding: '0 6px 0 14px',
        }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex-1 flex flex-col items-start justify-center min-w-0 py-2 text-left"
        >
          <span style={{ fontSize: 11, color: '#717171', fontWeight: 600 }}>Where to?</span>
          <span style={{ fontSize: 14, color: '#111', fontWeight: 700 }}>{city}</span>
          {(checkin || checkout || guests) && (
            <span
              className="block truncate max-w-[200px] mt-0.5"
              style={{ fontSize: 11, color: '#717171', fontWeight: 600 }}
            >
              {checkin && checkout
                ? `${formatHeroDisplayDate(checkin)} – ${formatHeroDisplayDate(checkout)}`
                : checkin
                  ? `${formatHeroDisplayDate(checkin)} · ${guests} guests`
                  : `${guests} guests`}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSearch()}
          className="flex items-center justify-center shrink-0 rounded-full"
          style={{
            background: CTA_RED,
            width: 40,
            height: 40,
            marginRight: 4,
          }}
          aria-label="Search stays"
        >
          <Search className="w-5 h-5" style={{ color: '#ffffff' }} />
        </button>
      </div>

      {mobileSheet}

      {/* Desktop — single pill, dividers, icon-only search (no guests in bar) */}
      <div
        className="hidden md:flex items-center w-full"
        style={{
          background: '#ffffff',
          borderRadius: 60,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          height: 66,
          padding: '0 8px 0 0',
          maxWidth: 820,
          width: '100%',
        }}
      >
        <div
          className="flex flex-col justify-center min-w-0"
          style={{ flex: '1.35', paddingLeft: 24, paddingRight: 16 }}
        >
          <span style={{ fontSize: 11, color: '#717171', fontWeight: 600 }}>Where to?</span>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="mt-0.5 appearance-none bg-transparent border-0 p-0 text-[14px] outline-none cursor-pointer w-full truncate"
            style={{ color: '#111', fontWeight: 700 }}
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: 1, height: 32, background: '#ebebeb', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-[120px] shrink-0"
          style={{ flex: 1, paddingLeft: 20, paddingRight: 20 }}
        >
          <span style={{ fontSize: 11, color: '#717171', fontWeight: 600 }}>Check-in</span>
          <div className="relative mt-0.5 min-h-[44px] w-full flex items-center">
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
              className="absolute inset-0 z-10 flex w-full min-h-[44px] items-center rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50C878] focus-visible:ring-offset-2"
              aria-label="Choose check-in date"
            >
              <span className="text-[14px] font-bold truncate" style={{ color: '#111' }}>
                {checkin ? formatHeroDisplayDate(checkin) : 'Add date'}
              </span>
            </button>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: '#ebebeb', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-[120px] shrink-0"
          style={{ flex: 1, paddingLeft: 16, paddingRight: 16 }}
        >
          <span style={{ fontSize: 11, color: '#717171', fontWeight: 600 }}>Check-out</span>
          <div className="relative mt-0.5 min-h-[44px] w-full flex items-center">
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
              className="absolute inset-0 z-10 flex w-full min-h-[44px] items-center rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50C878] focus-visible:ring-offset-2"
              aria-label="Choose check-out date"
            >
              <span className="text-[14px] font-bold truncate" style={{ color: '#111' }}>
                {checkout ? formatHeroDisplayDate(checkout) : 'Add date'}
              </span>
            </button>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: '#ebebeb', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-0"
          style={{ flex: 0.95, paddingLeft: 16, paddingRight: 12 }}
        >
          <span style={{ fontSize: 11, color: '#717171', fontWeight: 600 }}>Guests</span>
          <select
            value={guests}
            onChange={(e) => onGuestsChange(Number(e.target.value))}
            className="mt-0.5 appearance-none bg-transparent border-0 p-0 text-[14px] outline-none cursor-pointer w-full truncate"
            style={{ color: '#111', fontWeight: 700 }}
            aria-label="Guests"
          >
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'guest' : 'guests'}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center justify-center shrink-0 rounded-full"
          style={{
            background: CTA_RED,
            width: 48,
            height: 48,
            marginRight: 4,
          }}
          aria-label="Search stays"
        >
          <Search className="w-5 h-5" style={{ color: '#ffffff' }} />
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
        <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight leading-tight" style={{ color: TEXT }}>
          {title}
        </h2>
        <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>{subtitle}</p>
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
    ref.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroll">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-[1] w-10 h-10 rounded-full items-center justify-center transition-all opacity-0 group-hover/scroll:opacity-100"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 6px 20px rgba(15,23,42,0.10)',
          }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: TEXT }} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-[1] w-10 h-10 rounded-full items-center justify-center transition-all opacity-0 group-hover/scroll:opacity-100"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 6px 20px rgba(15,23,42,0.10)',
          }}
        >
          <ChevronRight className="w-5 h-5" style={{ color: TEXT }} />
        </button>
      )}
      <div
        ref={ref}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      className="snap-start shrink-0 min-w-[240px] max-w-[260px] w-[min(260px,85vw)] cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 group"
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
      }}
    >
      <div className="relative h-[180px] overflow-hidden">
        {property.images?.[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
          style={{
            background: ACCENT,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(80,200,120,0.25)',
          }}
        >
          &#8377;{price}<span className="font-normal opacity-90">/night</span>
        </div>
        <button
          onClick={e => e.stopPropagation()}
          aria-label="Save"
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}
        >
          <Heart className="w-4 h-4" style={{ color: ACCENT }} fill={ACCENT} />
        </button>
        {property.is_verified && (
          <div
            className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{
              background: VERIFIED_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              boxShadow: '0 4px 12px rgba(80, 200, 120, 0.12)',
            }}
          >
            <CheckCircle className="w-3 h-3" style={{ color: ACCENT }} />
            <span className="text-[10px] font-bold" style={{ color: ACCENT_DARK }}>Verified</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-sm leading-tight line-clamp-1" style={{ color: TEXT }}>
          {property.title}
        </h3>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: TEXT_MUTED }}>
          <MapPin className="w-3 h-3 inline mr-1" />
          {property.city}
        </p>
        <div className="flex items-center gap-1 mt-2.5 text-xs">
          <Star className="w-3.5 h-3.5" style={{ color: RATING }} fill={RATING} />
          <span className="font-bold" style={{ color: TEXT }}>{property.rating?.toFixed(1) || '4.8'}</span>
          <span style={{ color: TEXT_SUBTLE }}>({reviews})</span>
        </div>
      </div>
    </article>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="shrink-0 min-w-[240px] max-w-[260px] w-[260px] rounded-2xl overflow-hidden"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div className="h-[180px] animate-pulse" style={{ background: SURFACE_LIGHT }} />
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
      <h4 className="font-bold text-sm mb-4" style={{ color: FOOTER_HEADING }}>{title}</h4>
      <ul className="space-y-2.5">
        {items.map(item => (
          <li key={item.label}>
            <button
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
