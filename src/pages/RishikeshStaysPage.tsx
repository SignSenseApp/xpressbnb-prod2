import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Search,
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
  CheckCircle,
} from 'lucide-react';
import { getPublicListingsByCity, invalidatePublicListingsCache } from '../lib/publicListings';
import type { Property } from '../lib/database.types';
import ConversionPropertyCard from '../components/ConversionPropertyCard';
import Header from '../components/Header';
import BookArtistSection from '../components/BookArtistSection';
import RishikeshTrustRow from '../components/RishikeshTrustRow';
import RishikeshExperiencesSection from '../components/RishikeshExperiencesSection';
import SEOHead from '../components/SEOHead';
import { warmPublicHostCache } from '../lib/hostPublicCache';

type PropertyType = 'all' | 'hotel' | 'guesthouse' | 'resort' | 'villa' | 'cottage' | 'hostel';

type ListingType = Exclude<PropertyType, 'all'>;

const VALID_STAY_TYPES = new Set<ListingType>([
  'hotel',
  'guesthouse',
  'resort',
  'villa',
  'cottage',
  'hostel',
]);

function listingAmenities(property: Property): string[] {
  if (!Array.isArray(property.amenities)) return [];
  return property.amenities.filter((a): a is string => typeof a === 'string');
}

function normalizeListingType(raw: string | null | undefined): ListingType {
  const t = (raw ?? 'hotel').toLowerCase();
  return VALID_STAY_TYPES.has(t as ListingType) ? (t as ListingType) : 'hotel';
}

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

const RishikeshStaysPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PropertyType>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000]);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchStays = async (forceRefresh = false) => {
      setLoading(true);
      setListingsError(null);
      try {
        const result = await getPublicListingsByCity('Rishikesh', { forceRefresh });
        if (cancelled) return;

        if (result.status === 'error') {
          setProperties([]);
          setListingsError("We couldn't load stays right now. Please try again.");
          return;
        }

        setProperties(result.listings);
        warmPublicHostCache(result.listings.map((listing) => listing.host_id));
      } catch (err) {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            console.error('Failed to fetch Rishikesh stays', err);
          }
          setProperties([]);
          setListingsError("We couldn't load stays right now. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchStays();
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

  const navigateToHomeOverlay = (slug: 'about' | 'blog') => {
    window.history.pushState({}, '', `/?page=${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      const price = p.price_per_day || p.price_full_day || 0;
      const amenities = listingAmenities(p);
      const location = `${p.address ?? ''} ${p.city ?? ''}`.toLowerCase();
      if (type !== 'all' && normalizeListingType(p.property_type) !== type) return false;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (q && !p.title.toLowerCase().includes(q) && !location.includes(q)) return false;
      for (const a of selectedAmenities) {
        if (!amenities.includes(a)) return false;
      }
      return true;
    });
  }, [properties, search, type, priceRange, selectedAmenities]);

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
            'Discover hand-picked stays in Rishikesh — riverside cottages, Himalayan villas, yoga retreats and boutique hotels. Direct host pricing. Zero guest commission.',
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
              `${properties.length} listings`,
              'No guest commission',
              'Pay at property',
              'Direct inquiries',
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
        className="sticky top-[var(--xpx-chrome-height)] z-30"
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
          <div className="xpx-marketplace-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="xpx-card-media rounded-2xl animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
                <div className="h-3.5 w-3/4 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
                <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
                <div className="h-3.5 w-1/3 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
              </div>
            ))}
          </div>
        ) : listingsError ? (
          <div className="text-center py-20 px-4">
            <p className="text-lg font-semibold text-xpx-text mb-2">We couldn&apos;t load stays right now</p>
            <p className="text-sm text-xpx-muted mb-5">{listingsError}</p>
            <button
              type="button"
              onClick={() => {
                invalidatePublicListingsCache();
                setLoading(true);
                setListingsError(null);
                void getPublicListingsByCity('Rishikesh', { forceRefresh: true }).then((result) => {
                  if (result.status === 'success') {
                    setProperties(result.listings);
                    warmPublicHostCache(result.listings.map((listing) => listing.host_id));
                  } else {
                    setListingsError("We couldn't load stays right now. Please try again.");
                  }
                  setLoading(false);
                });
              }}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: 'var(--xpx-warm)' }}
            >
              Retry
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 text-xpx-muted">
            <p className="text-lg font-semibold text-xpx-text">No stays found</p>
            <p className="mt-1 text-sm">We don&apos;t have live Rishikesh listings right now. Check back soon.</p>
          </div>
        ) : (
          <>
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
                <div className="xpx-marketplace-grid">
                  {filtered.slice(0, 4).map((property) => (
                    <ConversionPropertyCard key={property.id} property={property} />
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
          <div className="xpx-marketplace-grid">
            {filtered.slice(4).map((property) => (
              <ConversionPropertyCard key={property.id} property={property} />
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
