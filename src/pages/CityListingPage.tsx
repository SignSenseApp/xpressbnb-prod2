import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, SlidersHorizontal, X, MapPin, CheckCircle, Clock, Zap, Shield, Star, MessageCircle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ConversionPropertyCard from '../components/ConversionPropertyCard';
import SEOHead from '../components/SEOHead';
import type { Property } from '../lib/database.types';
import { theme } from '../lib/theme';
import { buildTeamWhatsAppLink } from '../lib/team';
import { parseTripFromSearch, formatTripChip } from '../lib/tripSearch';

interface CityListingPageProps {
  city: string;
}

const CITY_DISPLAY_NAMES: Record<string, string> = {
  'delhi': 'Delhi',
  'gurgaon': 'Gurgaon',
  'noida': 'Noida',
  'greater-noida': 'Greater Noida',
  'rishikesh': 'Rishikesh',
};

const CITY_META: Record<string, { tagline: string; bg: string }> = {
  'Delhi': { tagline: 'Capital stays at unbeatable prices', bg: 'from-slate-200 to-amber-100' },
  'Gurgaon': { tagline: 'Modern living in Millennium City', bg: 'from-blue-100 to-slate-100' },
  'Noida': { tagline: 'Tech city verified stays', bg: 'from-teal-100 to-slate-100' },
  'Greater Noida': { tagline: 'Spacious homes, serene surroundings', bg: 'from-green-100 to-slate-100' },
  'Rishikesh': { tagline: 'Yoga capital riverside retreats', bg: 'from-orange-100 to-slate-100' },
};

const QUICK_FILTERS = [
  { key: 'coupleFriendly', label: 'Couple Friendly', icon: Shield },
  { key: 'hourlyStay', label: 'Hourly Stay', icon: Clock },
  { key: 'verified', label: 'Verified', icon: CheckCircle },
  { key: 'instantBooking', label: 'Instant Book', icon: Zap },
  { key: 'privateSpace', label: 'Private Space', icon: Star },
] as const;

type FilterKey = typeof QUICK_FILTERS[number]['key'];

interface Filters {
  coupleFriendly: boolean;
  hourlyStay: boolean;
  verified: boolean;
  instantBooking: boolean;
  privateSpace: boolean;
  minPrice: number;
  maxPrice: number;
}

const DEFAULT_FILTERS: Filters = {
  coupleFriendly: false,
  hourlyStay: false,
  verified: false,
  instantBooking: false,
  privateSpace: false,
  minPrice: 0,
  maxPrice: 50000,
};

const RISHIKESH_EXPERIENCE_RATES = [
  { duration: '15 mins', price: '₹1,500' },
  { duration: '30 mins', price: '₹2,500' },
  { duration: '45 mins', price: '₹3,500' },
  { duration: '60 mins', price: '₹4,500' },
] as const;

export default function CityListingPage({ city }: CityListingPageProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-low' | 'price-high' | 'rating'>('recommended');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [urlSearch, setUrlSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : ''
  );

  const cityName = CITY_DISPLAY_NAMES[city] || city;
  const cityMeta = CITY_META[cityName];
  const rishikeshExperienceWhatsappUrl = buildTeamWhatsAppLink(
    'Hi — I want to book a Private Solo show in Rishikesh. Please share availability and next steps.'
  );

  useEffect(() => {
    loadProperties();
  }, [city]);

  useEffect(() => {
    const sync = () => setUrlSearch(window.location.search);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const trip = useMemo(() => parseTripFromSearch(urlSearch), [urlSearch]);
  const tripChipLabel = useMemo(() => {
    if (!trip.checkin && !trip.checkout && trip.guests == null) return null;
    const g = trip.guests != null && trip.guests > 0 ? trip.guests : 2;
    return formatTripChip(trip.checkin ?? '', trip.checkout ?? '', g);
  }, [trip]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [properties, filters, sortBy, trip.guests]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      // ilike is case/whitespace tolerant — protects against rows where the
      // city was entered as "rishikesh", " Delhi ", etc.
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .ilike('city', cityName)
        .order('is_verified', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...properties];

    const guestMin = trip.guests;
    if (guestMin != null && guestMin > 0) {
      filtered = filtered.filter(p => (p.max_guests ?? 0) >= guestMin);
    }

    if (filters.coupleFriendly) filtered = filtered.filter(p => p.is_couple_friendly);
    if (filters.hourlyStay) filtered = filtered.filter(p => p.hourly_stay_available);
    if (filters.verified) filtered = filtered.filter(p => p.is_verified);
    if (filters.instantBooking) filtered = filtered.filter(p => p.instant_booking);
    if (filters.privateSpace) filtered = filtered.filter(p => p.is_private_space);

    filtered = filtered.filter(p => {
      const price = p.price_per_day || p.price_full_day || 0;
      return price >= filters.minPrice && price <= filters.maxPrice;
    });

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.price_per_day || 0) - (b.price_per_day || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price_per_day || 0) - (a.price_per_day || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    setFilteredProperties(filtered);
  };

  const toggleQuickFilter = (key: FilterKey) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFilterCount = QUICK_FILTERS.filter(f => filters[f.key]).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="xpx-page">
      <SEOHead
        config={{
          title: `Verified Stays in ${cityName} | Couple Friendly, No Brokerage | XpressBnB`,
          description: `Book verified homes and apartments in ${cityName}. Couple-friendly, hourly stays available. No commission, pay at property. Best prices guaranteed.`,
          keywords: `stays in ${cityName}, couple friendly ${cityName}, verified properties ${cityName}, no brokerage ${cityName}, apartments ${cityName}`,
          canonical: `https://xpressbnb.com/stays/${city}`,
        }}
      />

      {/* Sticky Header — frosted-white glass with subtle border */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderBottom: '1px solid var(--xpx-border)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-1 hover:bg-slate-100 rounded-full transition-colors active:scale-95 text-xpx-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-xpx-text leading-tight">Stays in {cityName}</h1>
            <div className="flex items-center gap-1 text-xs text-xpx-muted mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>
                {loading ? 'Loading...' : `${filteredProperties.length} of ${properties.length} properties`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-all whitespace-nowrap"
            style={
              hasActiveFilters
                ? { background: theme.warm, color: '#ffffff', border: `1px solid ${theme.warm}` }
                : { background: '#FFFFFF', color: 'var(--xpx-text)', border: '1px solid var(--xpx-border-strong)' }
            }
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span
                className="w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center"
                style={{ background: '#FFFFFF', color: theme.warm }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {tripChipLabel && (
          <div
            className="px-4 pb-2 flex items-center gap-2 text-xs font-medium"
            style={{ color: 'var(--xpx-muted)' }}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: theme.accent }} aria-hidden />
            <span>{tripChipLabel}</span>
          </div>
        )}

        {/* Quick filter chips + sort — momentum-scroll horizontally on mobile */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide scroll-momentum">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="flex-shrink-0 px-3 py-2 rounded-full text-sm font-semibold cursor-pointer focus:outline-none"
            style={{
              background: '#FFFFFF',
              color: 'var(--xpx-text)',
              border: '1px solid var(--xpx-border-strong)',
            }}
          >
            <option value="recommended">Recommended</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>

          <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--xpx-border)' }} />

          {QUICK_FILTERS.map(({ key, label, icon: Icon }) => {
            const active = filters[key];
            return (
              <button
                key={key}
                onClick={() => toggleQuickFilter(key)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                style={
                  active
                    ? { background: theme.warm, color: '#ffffff', border: `1px solid ${theme.warm}` }
                    : { background: '#FFFFFF', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border-strong)' }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {/* City hero banner */}
      {!loading && properties.length > 0 && (
        <div
          className="px-4 py-5"
          style={{
            background:
              'linear-gradient(120deg, rgba(80,200,120,0.16) 0%, var(--xpx-surface-light) 60%, var(--xpx-base) 100%)',
            borderBottom: '1px solid var(--xpx-border)',
          }}
        >
          <p className="xpx-eyebrow mb-1">{cityName}</p>
          <p className="text-xpx-text font-extrabold text-xl leading-tight tracking-tight">{cityMeta?.tagline}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#FFFFFF', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border)' }}
            >
              {properties.length} properties
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#FFFFFF', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border)' }}
            >
              No commission
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#FFFFFF', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border)' }}
            >
              Pay at property
            </span>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 pt-5 pb-28">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/3] rounded-2xl animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
                <div className="h-3.5 w-3/4 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
                <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
                <div className="h-3.5 w-1/3 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
              </div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(80,200,120,0.12)' }}
            >
              <MapPin className="w-8 h-8" style={{ color: theme.accentDark }} />
            </div>
            <h3 className="text-lg font-bold text-xpx-text mb-2">No stays found</h3>
            <p className="text-xpx-muted text-sm mb-5 max-w-xs leading-relaxed">
              {hasActiveFilters
                ? 'Try removing some filters to see more results.'
                : `We don't have listings in ${cityName} yet. Check back soon!`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
                style={{ background: theme.warm, color: '#ffffff', boxShadow: '0 6px 18px rgba(80,200,120,0.28)' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-xpx-muted mb-4">
              Showing <span className="font-semibold text-xpx-text">{filteredProperties.length}</span> stays
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="ml-2 font-semibold hover:underline"
                  style={{ color: theme.accentDark }}
                >
                  Clear filters
                </button>
              )}
            </p>
            {/* Single-column on the smallest phones so the cards breathe;
                two columns from sm: up. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProperties.map(property => (
                <ConversionPropertyCard
                  key={property.id}
                  property={property}
                  tripQuery={urlSearch}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && filteredProperties.length > 0 && cityName === 'Rishikesh' && (
        <section
          className="relative overflow-hidden rounded-3xl mx-4 mt-10 md:mx-10 md:mt-[60px] px-5 py-8 lg:p-12"
          style={{ background: '#0f0f1a' }}
        >
          <p
            className="mb-3 text-[11px] font-extrabold uppercase"
            style={{ letterSpacing: '3px', color: '#f59e0b' }}
          >
            For organisers
          </p>
          <h2
            className="mb-2 text-[22px] lg:text-[32px] font-extrabold"
            style={{ color: '#FFFFFF', lineHeight: 1.2 }}
          >
            Experiences in Rishikesh
          </h2>
          <p className="mb-10 text-[15px] max-w-[560px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Guitar sessions · Yoga retreats · River rafting · Live music
          </p>

          <div
            className="w-full max-w-[480px] rounded-2xl overflow-hidden relative z-10"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="px-6 py-3.5 flex items-center justify-between text-[11px] font-bold uppercase"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '2px',
              }}
            >
              <span>Duration</span>
              <span>Rate</span>
            </div>
            {RISHIKESH_EXPERIENCE_RATES.map((rate) => (
              <div
                key={rate.duration}
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {rate.duration}
                </span>
                <span className="text-base font-extrabold" style={{ color: '#FFFFFF' }}>
                  {rate.price}
                </span>
              </div>
            ))}
          </div>

          <a
            href={rishikeshExperienceWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mt-7 inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-bold transition-opacity"
            style={{ background: '#25D366', color: '#FFFFFF' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.88';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
            Book on WhatsApp
          </a>

          <img
            src="https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&w=1200"
            alt="Live concert performance"
            className="hidden lg:block absolute right-0 top-0 bottom-0 w-[38%] object-cover"
            style={{ opacity: 0.35 }}
            loading="lazy"
          />
          <div
            className="hidden lg:block absolute right-0 top-0 bottom-0 w-[38%]"
            style={{
              background: 'linear-gradient(to right, #0f0f1a 0%, transparent 100%)',
            }}
          />
        </section>
      )}

      {/* Filters Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />

          <div
            className="relative w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col"
            style={{
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border)',
              boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
            }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(15,23,42,0.18)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 xpx-divider">
              <h2 className="text-xl font-bold text-xpx-text">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-xpx-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Property type */}
              <div>
                <p className="xpx-eyebrow mb-3">Property type</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {QUICK_FILTERS.map(({ key, label, icon: Icon }) => {
                    const active = filters[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleQuickFilter(key)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all text-left"
                        style={
                          active
                            ? { background: theme.warm, color: '#ffffff', border: `1px solid ${theme.warm}` }
                            : { background: 'var(--xpx-surface-light)', color: 'var(--xpx-text)', border: '1px solid var(--xpx-border)' }
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price range */}
              <div>
                <p className="xpx-eyebrow mb-1">Price range</p>
                <p className="text-xs text-xpx-subtle mb-4">Per night in INR</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-xpx-muted mb-1.5">Min price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xpx-subtle text-sm font-medium">₹</span>
                      <input
                        type="number"
                        value={filters.minPrice || ''}
                        onChange={e => setFilters({ ...filters, minPrice: Number(e.target.value) || 0 })}
                        className="xpx-input pl-7"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-xpx-muted mb-1.5">Max price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xpx-subtle text-sm font-medium">₹</span>
                      <input
                        type="number"
                        value={filters.maxPrice || ''}
                        onChange={e => setFilters({ ...filters, maxPrice: Number(e.target.value) || 50000 })}
                        className="xpx-input pl-7"
                        placeholder="50,000"
                      />
                    </div>
                  </div>
                </div>

                {/* Price presets */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[
                    { label: 'Under ₹1k', min: 0, max: 1000 },
                    { label: '₹1k–3k', min: 1000, max: 3000 },
                    { label: '₹3k–8k', min: 3000, max: 8000 },
                    { label: '₹8k+', min: 8000, max: 50000 },
                  ].map(preset => {
                    const active = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => setFilters({ ...filters, minPrice: preset.min, maxPrice: preset.max })}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={
                          active
                            ? { background: theme.warm, color: '#ffffff', border: `1px solid ${theme.warm}` }
                            : { background: 'var(--xpx-surface-light)', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border)' }
                        }
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 flex gap-3"
              style={{ borderTop: '1px solid var(--xpx-border)', background: 'var(--xpx-surface-light)' }}
            >
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="flex-1 px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all text-xpx-text"
                style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border-strong)' }}
              >
                Clear all
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all"
                style={{ background: theme.warm, color: '#ffffff', boxShadow: '0 8px 24px rgba(80,200,120,0.28)' }}
              >
                Show {filteredProperties.length} stays
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
