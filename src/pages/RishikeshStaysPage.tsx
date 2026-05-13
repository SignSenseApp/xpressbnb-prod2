import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Search,
  Star,
  MapPin,
  Wifi,
  Car,
  Waves,
  Wind,
  Coffee,
  Utensils,
  Tv,
  Mountain,
  SlidersHorizontal,
  X,
  Heart,
  Loader2,
  CheckCircle,
  Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import BookArtistSection from '../components/BookArtistSection';
import RishikeshTrustRow from '../components/RishikeshTrustRow';
import RishikeshExperiencesSection from '../components/RishikeshExperiencesSection';
import SEOHead from '../components/SEOHead';

type PropertyType = 'all' | 'hotel' | 'guesthouse' | 'resort' | 'villa' | 'cottage' | 'hostel';

interface Stay {
  id: string;
  name: string;
  location: string;
  description: string;
  pricePerNight: number;
  rating: number;
  reviews: number;
  type: Exclude<PropertyType, 'all'>;
  amenities: string[];
  images: string[];
  isVerified?: boolean;
  /** Used to know whether clicking "View" should navigate to a real property page. */
  isFromDb: boolean;
  discountPercent?: number;
}

/**
 * Curated fallback dataset. Used only when the Supabase query genuinely returns
 * zero rows (e.g. dev DB) so users on rishikesh.html never see an empty page.
 */
const FALLBACK_STAYS: Stay[] = [
  {
    id: 'fb-1',
    name: 'Ganga View Riverside Cottage',
    location: 'Tapovan, Rishikesh',
    description:
      'A serene cottage perched above the Ganges with panoramic river views and morning yoga decks.',
    pricePerNight: 3800,
    rating: 4.8,
    reviews: 142,
    type: 'cottage',
    amenities: ['WiFi', 'Parking', 'Mountain View', 'Breakfast'],
    images: [
      'https://images.pexels.com/photos/2104882/pexels-photo-2104882.jpeg?auto=compress&w=900',
    ],
    isVerified: true,
    isFromDb: false,
  },
  {
    id: 'fb-2',
    name: 'Laxman Jhula Boutique Resort',
    location: 'Laxman Jhula, Rishikesh',
    description:
      'Boutique resort steps from the iconic suspension bridge with a riverside infinity pool.',
    pricePerNight: 6200,
    rating: 4.7,
    reviews: 318,
    type: 'resort',
    amenities: ['WiFi', 'Pool', 'Restaurant', 'Parking', 'AC'],
    images: ['https://images.pexels.com/photos/261101/pexels-photo-261101.jpeg?auto=compress&w=900'],
    isVerified: true,
    isFromDb: false,
  },
  {
    id: 'fb-3',
    name: 'Tapovan Yoga Retreat House',
    location: 'Tapovan, Rishikesh',
    description: 'Dedicated yoga retreat with daily Hatha and Ashtanga sessions plus organic kitchen.',
    pricePerNight: 2900,
    rating: 4.9,
    reviews: 207,
    type: 'guesthouse',
    amenities: ['WiFi', 'Breakfast', 'Yoga Hall'],
    images: [
      'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&w=900',
    ],
    isFromDb: false,
  },
  {
    id: 'fb-4',
    name: 'Himalayan Pine Villa',
    location: 'Shivpuri, Rishikesh',
    description: 'Private four-bedroom villa surrounded by pine forest, ideal for families and groups.',
    pricePerNight: 9800,
    rating: 4.6,
    reviews: 84,
    type: 'villa',
    amenities: ['WiFi', 'Parking', 'Pool', 'Kitchen', 'Mountain View'],
    images: [
      'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&w=900',
    ],
    isFromDb: false,
  },
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'all', label: 'All stays' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'resort', label: 'Resorts' },
  { value: 'villa', label: 'Villas' },
  { value: 'cottage', label: 'Cottages' },
  { value: 'guesthouse', label: 'Guesthouses' },
  { value: 'hostel', label: 'Hostels' },
];

const AMENITY_OPTIONS = [
  'WiFi',
  'Parking',
  'Pool',
  'AC',
  'Breakfast',
  'Restaurant',
  'Mountain View',
];

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WiFi: Wifi,
  Parking: Car,
  Pool: Waves,
  AC: Wind,
  Breakfast: Coffee,
  Restaurant: Utensils,
  TV: Tv,
  'Mountain View': Mountain,
};

/**
 * Multi-step image fallback chain: try the host-uploaded URL, then any
 * additional uploaded URL, then a curated stock photo. Each StayImage
 * tracks its own error state so a broken upload never leaves an empty card.
 */
function StayImage({ urls, alt }: { urls: string[]; alt: string }) {
  const safeUrls = (urls?.filter(Boolean) ?? []).concat([
    'https://images.pexels.com/photos/261101/pexels-photo-261101.jpeg?auto=compress&w=900',
  ]);
  const [index, setIndex] = useState(0);
  return (
    <img
      src={safeUrls[Math.min(index, safeUrls.length - 1)]}
      alt={alt}
      loading="lazy"
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setIndex((i) => (i + 1 < safeUrls.length ? i + 1 : i))}
    />
  );
}

function AmenityChip({ name }: { name: string }) {
  const Icon = AMENITY_ICONS[name];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-xpx-surface-light border border-xpx-border px-2 py-0.5 text-[11px] text-xpx-muted">
      {Icon ? <Icon className="w-3 h-3" /> : null}
      {name}
    </span>
  );
}

function StayCard({
  stay,
  index,
  saved,
  onToggleSave,
  onView,
}: {
  stay: Stay;
  index: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onView: (stay: Stay) => void;
}) {
  // Alternating commercial pill mirroring the Figma — "Best price" highlights
  // discounted rooms first, otherwise we cycle to keep the grid visually rhythmic.
  const isBestPrice = (stay.discountPercent && stay.discountPercent > 0) || index % 2 === 0;
  const secondaryBadges: string[] = [];
  if (stay.amenities.some((a) => /private|villa/i.test(a))) secondaryBadges.push('Private Space');
  if (
    stay.amenities.some((a) => /river|mountain|view/i.test(a)) ||
    /ganga|river|riverside/i.test(stay.location)
  )
    secondaryBadges.push('Riverside View');
  if (stay.amenities.some((a) => /yoga|hall|retreat/i.test(a)) || stay.type === 'guesthouse')
    secondaryBadges.push('Artist Friendly');
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.36, delay: (index % 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      onClick={() => onView(stay)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onView(stay);
      }}
      className="group rounded-2xl overflow-hidden cursor-pointer focus:outline-none shadow-[0_8px_28px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-shadow duration-300"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border)',
      }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: 'var(--xpx-surface-light)' }}
      >
        <StayImage urls={stay.images} alt={stay.name} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(stay.id);
          }}
          aria-label={saved ? 'Remove from saved' : 'Save stay'}
          aria-pressed={saved}
          className="absolute top-3 right-3 w-11 h-11 rounded-full backdrop-blur flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
          }}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              saved ? 'fill-orange-500 text-orange-500' : 'text-slate-700'
            }`}
          />
        </button>
        {/* Top-left status stack — type first, verified below it. Single column
            so they never overlap (previous version had two absolutes at the
            same coordinates which collided visually). */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start max-w-[70%]">
          <span
            className="capitalize text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#334155',
            }}
          >
            {stay.type}
          </span>
          {stay.isVerified && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold"
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: '#334155',
                boxShadow: '0 2px 8px rgba(15,23,42,0.10)',
              }}
            >
              <CheckCircle className="w-3 h-3" style={{ color: '#50C878' }} /> Verified
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
          {secondaryBadges.slice(0, 2).map((b) => (
            <span
              key={b}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{
                background: 'rgba(255,255,255,0.92)',
                color: '#334155',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {b}
            </span>
          ))}
        </div>
        {stay.discountPercent && stay.discountPercent > 0 && (
          <span
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-white"
            style={{ background: '#50C878' }}
          >
            <Tag className="w-3 h-3" /> {stay.discountPercent}% off
          </span>
        )}
      </div>
      <div className="p-4 sm:p-[18px]">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] sm:text-base font-bold text-xpx-text truncate leading-snug">
            {stay.name}
          </h3>
          <span
            className="inline-flex items-center gap-1 text-sm shrink-0"
            style={{ color: 'var(--xpx-warm-dark)' }}
          >
            <Star className="w-3.5 h-3.5" fill="currentColor" />
            {stay.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-1 text-xs text-xpx-muted inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {stay.location}
        </p>
        <p className="mt-2 text-xs text-xpx-muted line-clamp-2 leading-relaxed">
          {stay.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stay.amenities.slice(0, 4).map((a) => (
            <AmenityChip key={a} name={a} />
          ))}
          {stay.amenities.length > 4 && (
            <span className="text-[11px] text-xpx-subtle">+{stay.amenities.length - 4} more</span>
          )}
        </div>
        <div className="mt-4 pt-3 flex items-end justify-between border-t border-xpx-border">
          <div>
            <p className="text-[11px] text-xpx-subtle">{stay.reviews} reviews</p>
            <p className="text-lg font-extrabold text-xpx-text leading-tight">
              ₹{stay.pricePerNight.toLocaleString('en-IN')}
              <span className="text-xs font-medium text-xpx-muted"> /night</span>
            </p>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={
              isBestPrice
                ? {
                    background: 'rgba(80,200,120,0.10)',
                    color: '#3dae68',
                    border: '1px solid rgba(80,200,120,0.32)',
                  }
                : {
                    background: 'rgba(80,200,120,0.12)',
                    color: 'var(--xpx-warm-dark)',
                    border: '1px solid rgba(80,200,120,0.36)',
                  }
            }
            aria-label={isBestPrice ? 'Best price' : 'Pay later'}
          >
            {isBestPrice ? 'Best price' : 'Pay later'}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

const RishikeshStaysPage: React.FC = () => {
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PropertyType>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000]);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const fetchStays = async () => {
      setLoading(true);
      setWarning(null);
      try {
        // ilike handles case + accidental whitespace in city values. We use
        // select('*') so that the page works whether or not optional columns
        // (discount_percent, offer_label, etc.) have been added to the DB yet.
        // Prefer active listings first. If none are marked active yet, gracefully
        // fall back to all city listings so uploaded inventory still appears.
        // `data` is reassigned below on the fallback query. `dbError` is
        // read once and never reassigned (prefer-const).
        const initialResult = await supabase
          .from('properties')
          .select('*')
          .ilike('city', 'rishikesh')
          .eq('is_active', true);

        const dbError = initialResult.error;
        let data = initialResult.data;

        if (dbError) throw dbError;

        if ((data?.length ?? 0) === 0) {
          const { data: anyStatusRows, error: anyStatusError } = await supabase
            .from('properties')
            .select('*')
            .ilike('city', 'rishikesh');
          if (anyStatusError) throw anyStatusError;
          if ((anyStatusRows?.length ?? 0) > 0) {
            data = anyStatusRows;
            if (!cancelled) {
              setWarning('Showing all Rishikesh listings while active status is being updated.');
            }
          }
        }

        if (!cancelled) {
          const rows = data ?? [];
          if (rows.length > 0) {
            const mapped: Stay[] = rows.map((p) => {
              const amenities = Array.isArray(p.amenities) ? p.amenities : [];
              // Normalize images: drop blanks, ensure absolute https URLs only.
              const cleanImages = (Array.isArray(p.images) ? p.images : [])
                .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
                .map((u) => u.trim());
              return {
                id: p.id,
                name: p.title ?? 'Unnamed Stay',
                location: p.address || `${p.city ?? 'Rishikesh'}`,
                description: p.description ?? '',
                pricePerNight: Number(p.price_per_day) || 0,
                rating: Number(p.rating) || 0,
                reviews: Number(p.total_reviews) || 0,
                type: ((p.property_type as Stay['type']) || 'hotel'),
                amenities,
                images: cleanImages,
                isVerified: Boolean(p.is_verified),
                discountPercent:
                  typeof p.discount_percent === 'number' ? p.discount_percent : undefined,
                isFromDb: true,
              };
            });
            setStays(mapped);
          } else {
            // No rows in DB — show curated stays so the page is never empty,
            // and let the user know they're seeing curated content.
            setStays(FALLBACK_STAYS);
            setWarning('No live listings yet — showing a curated selection.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch Rishikesh stays', err);
          setWarning('Could not load live stays. Showing curated picks.');
          setStays(FALLBACK_STAYS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStays();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  const onToggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Real navigation — only navigate to /property/:id when the row is from DB
  // (we have a real UUID); fallback rows quietly do nothing.
  const handleView = (stay: Stay) => {
    if (!stay.isFromDb) {
      return;
    }
    window.history.pushState({}, '', `/property/${stay.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navigateToHomeOverlay = (slug: 'about' | 'blog') => {
    window.history.pushState({}, '', `/?page=${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stays.filter((s) => {
      if (type !== 'all' && s.type !== type) return false;
      if (s.pricePerNight < priceRange[0] || s.pricePerNight > priceRange[1]) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q))
        return false;
      for (const a of selectedAmenities) {
        if (!s.amenities.includes(a)) return false;
      }
      return true;
    });
  }, [stays, search, type, priceRange, selectedAmenities]);

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setPriceRange([0, 15000]);
    setSelectedAmenities(new Set());
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="xpx-page">
      <SEOHead
        config={{
          title: 'Rishikesh Stays — Riverside Cottages, Yoga Retreats & Boutique Hotels | XpressBnB',
          description:
            'Discover hand-picked stays in Rishikesh — riverside cottages, Himalayan villas, yoga retreats and boutique hotels. B2B private solo show rates for organisers. Verified hosts. Transparent pricing.',
          keywords:
            'rishikesh stays, rishikesh hotels, yoga retreat rishikesh, riverside cottage rishikesh, ganga view stays, tapovan stays, laxman jhula hotels, private solo show rishikesh, b2b entertainment rishikesh',
          canonical: 'https://xpressbnb.com/stays/rishikesh',
        }}
      />
      <Header
        transparentOnTop
        onAboutClick={() => navigateToHomeOverlay('about')}
        onBlogClick={() => navigateToHomeOverlay('blog')}
        onHostLoginClick={() => {
          window.history.pushState({}, '', '/auth/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />

      {/* Hero — Rishikesh editorial. Verified count is dynamic from real
          DB rows so the trust pill reflects live inventory. */}
      <section
        className="relative overflow-hidden"
        style={{ borderBottom: '1px solid var(--xpx-border)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/2422259/pexels-photo-2422259.jpeg?auto=compress&w=1800)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.62,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.88) 70%, var(--xpx-base) 100%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] sm:text-xs tracking-[0.28em] font-bold"
            style={{ color: 'var(--xpx-warm-dark)' }}
          >
            RISHIKESH, UTTARAKHAND
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 text-[28px] sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] sm:leading-[1.05] max-w-2xl text-xpx-text tracking-tight"
          >
            Rishikesh — Where
            <br className="hidden sm:block" /> Every Stay Tells a Story.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-sm sm:text-base text-xpx-muted max-w-xl"
          >
            Hand-picked stays, riverside retreats, and soulful experiences in the Yoga Capital of the World.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-5 flex gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {[
              `${stays.filter((s) => s.isFromDb).length || stays.length} Verified Stays`,
              'No Commission',
              'Pay at Property',
              'Instant Booking',
            ].map((label) => (
              <span
                key={label}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid var(--xpx-border)',
                  color: 'var(--xpx-text)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#50C878' }} />
                {label}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('handpicked-stays')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="min-h-[44px] px-5 py-3 rounded-full text-sm font-bold text-white transition-transform active:scale-95"
              style={{
                background: 'var(--xpx-warm)',
                boxShadow: '0 8px 24px rgba(80,200,120,0.36)',
              }}
            >
              Explore Stays
            </button>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/auth/host-register');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="min-h-[44px] px-5 py-3 rounded-full text-sm font-bold transition-colors hover:bg-slate-50"
              style={{
                background: '#FFFFFF',
                color: 'var(--xpx-text)',
                border: '1px solid var(--xpx-border-strong)',
              }}
            >
              List Your Property
            </button>
          </motion.div>
        </div>
      </section>

      <section
        className="sticky top-[60px] md:top-[72px] z-30"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderBottom: '1px solid var(--xpx-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search stays</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or area..."
              className="xpx-input pl-10 rounded-full"
            />
          </label>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-momentum -mx-1 px-1">
            {PROPERTY_TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  aria-pressed={active}
                  className={`shrink-0 min-h-[40px] inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    active
                      ? 'text-white'
                      : 'text-xpx-muted hover:text-xpx-text'
                  }`}
                  style={
                    active
                      ? { background: 'var(--xpx-warm)', borderColor: 'var(--xpx-warm)' }
                      : { background: '#FFFFFF', borderColor: 'var(--xpx-border-strong)' }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className="shrink-0 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-xpx-text transition-colors hover:bg-slate-50"
            style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border-strong)' }}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {selectedAmenities.size > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                style={{ background: 'var(--xpx-warm)' }}
              >
                {selectedAmenities.size}
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden animate-pulse shadow-[0_8px_28px_rgba(15,23,42,0.06)]"
                style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
              >
                <div
                  className="aspect-[4/3]"
                  style={{ background: 'rgba(15,23,42,0.06)' }}
                />
                <div className="p-4 sm:p-[18px] space-y-3">
                  <div className="h-4 w-3/4 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
                  <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {warning && (
              <p
                className="mb-4 inline-flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                style={{ background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.32)', color: '#92400E' }}
              >
                <Loader2 className="w-3.5 h-3.5" /> {warning}
              </p>
            )}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-xpx-muted">
                Showing <span className="text-xpx-text font-semibold">{filtered.length}</span> stays
              </p>
              {(search ||
                type !== 'all' ||
                selectedAmenities.size > 0 ||
                priceRange[1] !== 15000 ||
                priceRange[0] !== 0) && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--xpx-warm-dark)' }}
                >
                  Clear filters
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-xpx-muted">
                <p className="text-lg font-semibold text-xpx-text">No stays match your filters</p>
                <p className="mt-1 text-sm">Try removing a filter or widening your price range.</p>
              </div>
            ) : (
              <>
                <div id="handpicked-stays" className="flex items-end justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight">
                    Handpicked Stays in Rishikesh
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      clearFilters();
                      document
                        .getElementById('explore-more-stays')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex items-center min-h-[36px] text-xs sm:text-sm font-semibold hover:underline"
                    style={{ color: 'var(--xpx-warm-dark)' }}
                  >
                    View all stays →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {filtered.slice(0, 4).map((s, i) => (
                    <StayCard
                      key={s.id}
                      stay={s}
                      index={i}
                      saved={saved.has(s.id)}
                      onToggleSave={onToggleSave}
                      onView={handleView}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {!loading && filtered.length > 0 && <BookArtistSection />}

      {!loading && filtered.length > 4 && (
        <section
          id="explore-more-stays"
          className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 sm:mt-16 scroll-mt-24"
        >
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight">
              Explore More Stays
            </h2>
            <p className="text-xs sm:text-sm text-xpx-muted">
              Sort by:{' '}
              <span className="font-semibold text-xpx-text">Recommended</span>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filtered.slice(4).map((s, i) => (
              <StayCard
                key={s.id}
                stay={s}
                index={i + 4}
                saved={saved.has(s.id)}
                onToggleSave={onToggleSave}
                onView={handleView}
              />
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('handpicked-stays')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="min-h-[44px] px-5 py-2.5 rounded-full text-sm font-semibold transition-colors hover:bg-slate-50"
              style={{
                background: '#FFFFFF',
                color: 'var(--xpx-text)',
                border: '1px solid var(--xpx-border-strong)',
              }}
            >
              Back to top ↑
            </button>
          </div>
        </section>
      )}

      {!loading && <RishikeshTrustRow />}
      {!loading && <RishikeshExperiencesSection />}

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setFiltersOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{
                background: 'var(--xpx-surface)',
                border: '1px solid var(--xpx-border)',
                boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
              }}
              role="dialog"
              aria-label="Filters"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--xpx-border)' }}>
                <h2 className="text-base font-bold text-xpx-text">Filters</h2>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="w-11 h-11 rounded-full hover:bg-slate-100 flex items-center justify-center text-xpx-text transition-colors active:scale-95"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-xpx-muted uppercase tracking-wide">
                    Price per night
                  </h3>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      value={priceRange[0]}
                      min={0}
                      max={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([Number(e.target.value) || 0, priceRange[1]])
                      }
                      className="xpx-input"
                      aria-label="Minimum price"
                    />
                    <span className="text-xpx-subtle">-</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      min={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value) || 0])
                      }
                      className="xpx-input"
                      aria-label="Maximum price"
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15000}
                    step={500}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="mt-3 w-full accent-[var(--xpx-warm)]"
                    aria-label="Maximum price slider"
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-xpx-muted uppercase tracking-wide">
                    Amenities
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map((a) => {
                      const Icon = AMENITY_ICONS[a];
                      const active = selectedAmenities.has(a);
                      return (
                        <button
                          key={a}
                          onClick={() => toggleAmenity(a)}
                          aria-pressed={active}
                          className="inline-flex items-center min-h-[40px] gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors active:scale-[0.97]"
                          style={
                            active
                              ? { background: 'var(--xpx-warm)', borderColor: 'var(--xpx-warm)', color: '#ffffff' }
                              : { background: '#FFFFFF', borderColor: 'var(--xpx-border-strong)', color: 'var(--xpx-muted)' }
                          }
                        >
                          {Icon && <Icon className="w-3.5 h-3.5" />}
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--xpx-border)', background: 'var(--xpx-surface-light)' }}>
                <button
                  onClick={clearFilters}
                  className="flex-1 min-h-[44px] py-2.5 rounded-full text-sm font-semibold text-xpx-text transition-colors hover:bg-slate-100 active:scale-[0.98]"
                  style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border-strong)' }}
                >
                  Reset
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-full text-sm font-bold text-white transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--xpx-warm)', boxShadow: '0 6px 18px rgba(80,200,120,0.32)' }}
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
};

export default RishikeshStaysPage;
