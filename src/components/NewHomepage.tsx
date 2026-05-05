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
  ArrowRight,
  Zap,
  Lock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SEOHead from './SEOHead';
import { generateOrganizationStructuredData } from '../lib/seo';
import type { Property } from '../lib/database.types';

// Light Gen Z palette — warm off-white surfaces, white cards, almost-black ink.
const WARM = '#F4A261';
const WARM_DARK = '#E08C45';
const BASE = '#FAFAF7';
const SURFACE = '#FFFFFF';
const SURFACE_LIGHT = '#F5F2EC';
const TEXT = '#0F172A';
const TEXT_MUTED = 'rgba(15,23,42,0.62)';
const TEXT_SUBTLE = 'rgba(15,23,42,0.42)';
const BORDER = 'rgba(15,23,42,0.08)';

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
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const handleHeroSearch = () => {
    const slug = searchCity.toLowerCase().replace(/\s+/g, '-');
    const params = new URLSearchParams();
    if (searchCheckin) params.set('checkin', searchCheckin);
    if (searchCheckout) params.set('checkout', searchCheckout);
    if (searchGuests) params.set('guests', String(searchGuests));
    const qs = params.toString();
    navigate(`/stays/${slug}${qs ? `?${qs}` : ''}`);
  };

  const featuredProperties = properties.slice(0, 8);

  return (
    <div className="min-h-screen" style={{ background: BASE, color: TEXT }}>
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
            className="flex items-center gap-2 min-w-0 shrink"
          >
            <img
              src="/image.png"
              alt="XpressBnB"
              className="h-8 sm:h-9 w-8 sm:w-9 object-contain shrink-0"
            />
            <span
              className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight truncate"
              style={{
                color: scrolled ? TEXT : '#ffffff',
                textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.35), 0 0 18px rgba(0,0,0,0.22)',
              }}
            >
              Xpress<span style={{ color: WARM }}>BnB</span>
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
              className="hidden md:inline-flex px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                color: scrolled ? TEXT_MUTED : 'rgba(255,255,255,0.85)',
                textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              className="rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all hover:scale-[1.03] whitespace-nowrap"
              style={{
                background: WARM,
                color: '#ffffff',
                boxShadow: '0 6px 18px rgba(244,162,97,0.32)',
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
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.45) 50%, rgba(15,23,42,0.55) 88%, ' + BASE + ' 100%)',
          }}
        />

        <div className="relative z-10 h-full flex flex-col justify-center px-4 md:px-8 max-w-7xl mx-auto pt-20 pb-4">
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
                style={{ color: WARM, textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}
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
                    background: i === heroIndex ? 'rgba(244,162,97,0.25)' : 'rgba(255,255,255,0.16)',
                    color: i === heroIndex ? '#ffffff' : 'rgba(255,255,255,0.85)',
                    border: i === heroIndex ? `1px solid ${WARM}` : '1px solid rgba(255,255,255,0.25)',
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
                onCheckinChange={setSearchCheckin}
                checkout={searchCheckout}
                onCheckoutChange={setSearchCheckout}
                guests={searchGuests}
                onGuestsChange={setSearchGuests}
                onSearch={handleHeroSearch}
              />
            </div>
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: 'rgba(244,162,97,0.18)',
                color: '#ffffff',
                border: `1px solid rgba(244,162,97,0.5)`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="font-mono">WELCOME10</span> · 10% off your first stay
            </div>
          </div>
        </div>
      </section>

      {/* ──── Trust Strip ──── */}
      <section
        className="relative z-10 -mt-1"
        style={{ background: SURFACE_LIGHT, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-center gap-3 md:gap-12 py-4 overflow-x-auto scrollbar-hide">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 shrink-0 px-4 py-2.5 rounded-xl"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${WARM}1A` }}
                >
                  <Icon className="w-4 h-4" style={{ color: WARM_DARK }} />
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
                className="flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: WARM_DARK }}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {CITIES.slice(0, 4).map((city, idx) => {
              const count = propertiesByCity[city]?.length || 0;
              const cover = propertiesByCity[city]?.[0]?.images?.[0] || CITY_IMAGES[city];
              const isLarge = idx === 0 || idx === 3;
              return (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                    isLarge ? 'row-span-2 aspect-[3/4]' : 'aspect-square'
                  }`}
                  style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.08)' }}
                >
                  <img
                    src={cover}
                    alt={city}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute left-4 right-4 bottom-4 text-left">
                    <div className="text-white font-bold text-lg md:text-xl leading-tight">{city}</div>
                    <div className="text-white/80 text-xs mt-0.5">{count} properties</div>
                  </div>
                </button>
              );
            })}
          </div>

          {CITIES.length > 4 && (
            <div className="mt-3 grid grid-cols-1">
              <button
                onClick={() => handleCityClick(CITIES[4])}
                className="group relative h-40 md:h-48 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.08)' }}
              >
                <img
                  src={
                    propertiesByCity[CITIES[4]]?.[0]?.images?.[0] || CITY_IMAGES[CITIES[4]]
                  }
                  alt={CITIES[4]}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
                <div className="absolute left-5 bottom-5 text-left">
                  <div className="text-white font-bold text-xl">{CITIES[4]}</div>
                  <div className="text-white/80 text-xs mt-0.5">
                    {propertiesByCity[CITIES[4]]?.length || 0} properties
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ──── Social Proof ──── */}
      <section style={{ background: BASE }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="w-6 h-6" style={{ color: WARM }} fill={WARM} />
                ))}
              </div>
              <span className="text-3xl md:text-4xl font-extrabold ml-2" style={{ color: TEXT }}>4.8</span>
            </div>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>from 50,000+ verified guest reviews</p>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
            {testimonials.slice(0, 3).map(t => (
              <article
                key={t.id}
                className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-auto rounded-2xl p-6"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 2px ${WARM}40` }}
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
                      style={{ color: i < t.rating ? WARM : 'rgba(15,23,42,0.18)' }}
                      fill={i < t.rating ? WARM : 'transparent'}
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
          background: `linear-gradient(135deg, ${SURFACE_LIGHT} 0%, ${BASE} 60%, #FFEFE0 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(circle at 80% 50%, ${WARM}30, transparent 60%), radial-gradient(circle at 15% 30%, rgba(167,139,250,0.18), transparent 55%)`,
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <h2
            className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight"
            style={{ color: TEXT }}
          >
            Earn with XpressBnB
          </h2>
          <p className="mt-3 text-base md:text-lg max-w-lg mx-auto" style={{ color: TEXT_MUTED }}>
            List your property in 5 minutes. Start earning from day one with zero platform fees.
          </p>
          <button
            onClick={() => navigate('/auth/login')}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 font-bold text-base transition-all hover:scale-[1.03]"
            style={{
              background: WARM,
              color: '#ffffff',
              boxShadow: `0 12px 32px ${WARM}55`,
            }}
          >
            Start Hosting
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ──── Why XpressBnB ──── */}
      <section id="why" className="scroll-mt-24" style={{ background: SURFACE_LIGHT }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
          <SectionHeader
            label="WHY XPRESSBNB"
            title="The premium way to book stays"
            subtitle="Direct relationships, transparent pricing, verified properties"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
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
            ].map(card => (
              <div
                key={card.title}
                className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 8px 32px rgba(15,23,42,0.05)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: `${WARM}1A` }}
                >
                  <card.icon className="w-5 h-5" style={{ color: WARM_DARK }} />
                </div>
                <h3 className="mt-5 font-bold text-lg" style={{ color: TEXT }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <footer
        style={{
          background: BASE,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <img
                  src="/image.png"
                  alt="XpressBnB"
                  className="h-9 w-9 object-contain"
                />
                <span className="text-lg font-extrabold tracking-tight" style={{ color: TEXT }}>
                  Xpress<span style={{ color: WARM }}>BnB</span>
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: TEXT_MUTED }}>
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
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <p className="text-xs" style={{ color: TEXT_SUBTLE }}>
              &copy; 2026 XpressBnB. All rights reserved.
            </p>
            <p className="text-xs font-semibold" style={{ color: WARM_DARK }}>
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

/**
 * HeroSearchBar — fully controlled search widget. Mobile shows a compact
 * frosted-white pill that opens a full-width sheet with white surface.
 * Desktop shows an Airbnb-style segmented bar.
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

  return (
    <>
      {/* Mobile compact pill — opens a full-width sheet for input */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-3 w-full rounded-full px-4 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: WARM }}
        >
          <Search className="w-4 h-4" style={{ color: '#ffffff' }} />
        </div>
        <div className="text-left min-w-0">
          <div className="text-sm font-bold" style={{ color: TEXT }}>{city || 'Where to?'}</div>
          <div className="text-xs truncate" style={{ color: TEXT_MUTED }}>
            {checkin && checkout ? `${checkin} → ${checkout}` : 'Add dates'} · {guests}{' '}
            {guests === 1 ? 'guest' : 'guests'}
          </div>
        </div>
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-end"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-label="Search stays"
        >
          <div
            className="w-full rounded-t-3xl p-5 space-y-4"
            style={{ background: SURFACE, borderTop: `1px solid ${BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: TEXT }}>Search stays</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
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
                  className="xpx-input mt-1"
                />
              </label>
              <label className="text-xs font-semibold" style={{ color: TEXT_MUTED }}>
                Check-out
                <input
                  type="date"
                  min={checkin || today}
                  value={checkout}
                  onChange={(e) => onCheckoutChange(e.target.value)}
                  className="xpx-input mt-1"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold" style={{ color: TEXT_MUTED }}>
              Guests
              <select
                value={guests}
                onChange={(e) => onGuestsChange(Number(e.target.value))}
                className="xpx-input mt-1"
              >
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                setMobileOpen(false);
                onSearch();
              }}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-base"
              style={{ background: WARM, color: '#ffffff', boxShadow: '0 8px 24px rgba(244,162,97,0.32)' }}
            >
              <Search className="w-4 h-4" />
              Search stays
            </button>
          </div>
        </div>
      )}

      {/* Desktop expanded search — frosted white over the hero photo */}
      <div
        className="hidden md:block rounded-2xl p-2"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
        }}
      >
        <div className="flex items-center gap-1">
          <SearchSelect
            icon={<MapPin className="w-5 h-5" style={{ color: WARM_DARK }} />}
            label="Where to?"
            value={city}
            onChange={onCityChange}
            options={cities.map((c) => ({ value: c, label: c }))}
          />
          <span className="w-px h-8" style={{ background: BORDER }} />
          <SearchDate
            icon={<Calendar className="w-5 h-5" style={{ color: WARM_DARK }} />}
            label="Check-in"
            value={checkin}
            min={today}
            onChange={onCheckinChange}
          />
          <span className="w-px h-8" style={{ background: BORDER }} />
          <SearchDate
            icon={<Calendar className="w-5 h-5" style={{ color: WARM_DARK }} />}
            label="Check-out"
            value={checkout}
            min={checkin || today}
            onChange={onCheckoutChange}
          />
          <span className="w-px h-8" style={{ background: BORDER }} />
          <SearchSelect
            icon={<Users className="w-5 h-5" style={{ color: WARM_DARK }} />}
            label="Guests"
            value={String(guests)}
            onChange={(v) => onGuestsChange(Number(v))}
            options={Array.from({ length: 8 }, (_, i) => i + 1).map((n) => ({
              value: String(n),
              label: `${n} ${n === 1 ? 'guest' : 'guests'}`,
            }))}
          />
          <button
            onClick={onSearch}
            className="flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-bold text-sm transition-all hover:scale-[1.02] ml-1"
            style={{
              background: WARM,
              color: '#ffffff',
              boxShadow: `0 6px 20px ${WARM}55`,
              minHeight: 52,
            }}
          >
            <Search className="w-4 h-4" />
            Search Stays
          </button>
        </div>
      </div>
    </>
  );
}

function SearchSelect({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label
      className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-slate-100 transition-colors cursor-pointer"
      style={{ minHeight: 48 }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 flex flex-col leading-tight">
        <span className="text-[13px] font-bold" style={{ color: TEXT }}>{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-[12px] outline-none cursor-pointer"
          style={{ color: TEXT_MUTED }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function SearchDate({
  icon,
  label,
  value,
  onChange,
  min,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <label
      className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-slate-100 transition-colors cursor-pointer"
      style={{ minHeight: 48 }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 flex flex-col leading-tight">
        <span className="text-[13px] font-bold" style={{ color: TEXT }}>{label}</span>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-[12px] outline-none w-full cursor-pointer"
          style={{ color: TEXT_MUTED, colorScheme: 'light' }}
        />
      </span>
    </label>
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
        <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color: WARM_DARK }}>
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
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all opacity-0 group-hover/scroll:opacity-100"
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
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all opacity-0 group-hover/scroll:opacity-100"
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
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
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
            style={{ background: i === 0 ? WARM : 'rgba(15,23,42,0.18)' }}
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
      className="snap-start shrink-0 w-[240px] md:w-[260px] cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 group"
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
          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            color: TEXT,
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
          }}
        >
          &#8377;{price}<span className="font-normal" style={{ color: TEXT_MUTED }}>/night</span>
        </div>
        <button
          onClick={e => e.stopPropagation()}
          aria-label="Save"
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}
        >
          <Heart className="w-4 h-4" style={{ color: '#475569' }} />
        </button>
        {property.is_verified && (
          <div
            className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{
              background: WARM,
              boxShadow: '0 4px 12px rgba(244,162,97,0.32)',
            }}
          >
            <CheckCircle className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold text-white">Verified</span>
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
          <Star className="w-3.5 h-3.5" style={{ color: WARM }} fill={WARM} />
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
          className="shrink-0 w-[240px] rounded-2xl overflow-hidden"
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
      <h4 className="font-bold text-sm mb-4" style={{ color: TEXT }}>{title}</h4>
      <ul className="space-y-2.5">
        {items.map(item => (
          <li key={item.label}>
            <button
              onClick={item.onClick}
              className="text-sm transition-colors hover:underline"
              style={{ color: TEXT_MUTED }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
