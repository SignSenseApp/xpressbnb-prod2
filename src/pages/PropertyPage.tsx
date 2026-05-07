import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Users,
  Bed,
  Bath,
  Star,
  CheckCircle,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  Shield,
  Sparkles,
  Heart,
  Leaf,
  Clock,
  Cigarette,
  Music,
  PawPrint,
  ExternalLink,
} from 'lucide-react';
import type { Property } from '../lib/database.types';
import BookingForm from '../components/BookingForm';
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import HostCard from '../components/HostCard';
import OfferModal from '../components/OfferModal';
import PropertyGallery from '../components/property/PropertyGallery';
import PropertyReviews from '../components/property/PropertyReviews';
import PropertySidebar from '../components/property/PropertySidebar';
import { supabase } from '../lib/supabase';
import { getAmenityIcon } from '../lib/amenities';
import { generatePropertyStructuredData, generateBreadcrumbStructuredData } from '../lib/seo';
import { listFeaturedPromoCodes } from '../lib/offers';
import {
  inferStateFromCity,
  inferSubtitle,
  inferFeatureHighlights,
  WHY_LOVE_DEFAULTS,
  getNearbyPlaces,
  getHouseRules,
  TRUST_PILLS,
  getMapEmbedUrl,
  getMapLinkUrl,
} from '../config/propertyDefaults';
import { safeHostDisplayName } from '../lib/host';

/**
 * PropertyPage — redesigned around an Apple / Expedia-grade reading flow:
 *   gallery → title + stats → trust pills → about → amenities → host →
 *   why-guests-love → location & nearby → reviews → house rules.
 *
 * The right column hosts a sticky booking sidebar with the existing
 * BookingCalendar / BookingForm / OfferModal pipelines wired in. None of
 * the existing handlers were removed; all pricing, calendar and booking
 * inserts continue to flow through the original components.
 */
export default function PropertyPage() {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/property\/([a-f0-9-]+)$/);
    if (match) {
      loadProperty(match[1]);
    } else {
      navigateHome();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navigateBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateHome();
    }
  };

  const navigateToPage = (page: string) => {
    window.history.pushState({}, '', page);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const getOrCreateSessionId = () => {
    let sessionId = sessionStorage.getItem('visitor_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('visitor_session_id', sessionId);
    }
    return sessionId;
  };

  const trackPropertyView = async (propertyId: string, listingType: string) => {
    if (listingType !== 'paid') return;
    try {
      const sessionId = getOrCreateSessionId();
      const viewedKey = `property_viewed_${propertyId}`;
      if (sessionStorage.getItem(viewedKey)) return;

      const { error } = await supabase.from('view_events').insert({
        entity_type: 'property',
        entity_id: propertyId,
        session_id: sessionId,
        referrer: document.referrer || null,
      });
      if (error) {
        console.error('Error tracking view:', error);
        return;
      }
      sessionStorage.setItem(viewedKey, 'true');
    } catch (error) {
      console.error('Error tracking property view:', error);
    }
  };

  const loadProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigateHome();
        return;
      }

      setProperty(data);
      trackPropertyView(propertyId, data.listing_type);
      if (data.host_id) {
        loadHostName(data.host_id);
      }
    } catch (error) {
      console.error('Error loading property:', error);
      navigateHome();
    } finally {
      setLoading(false);
    }
  };

  // Tiny separate query for the title block's "Hosted by …" line. The
  // HostCard performs its own (richer) fetch for the host section further
  // down — the duplicate select is intentional so the two surfaces remain
  // independently re-renderable.
  const loadHostName = async (hostId: string) => {
    try {
      const { data, error } = await supabase
        .from('hosts')
        .select('name')
        .eq('id', hostId)
        .maybeSingle();
      if (error) {
        console.error('PropertyPage: failed to load host name', error);
        return;
      }
      if (data?.name) {
        setHostName(safeHostDisplayName(data.name, 'Verified Host'));
      }
    } catch (err) {
      console.error('PropertyPage: host name fetch threw', err);
    }
  };

  const getPropertyUrl = () => window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPropertyUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this property: ${property?.title}\n${getPropertyUrl()}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleInstagramShare = () => {
    handleCopyLink();
    alert('Link copied! Open Instagram and paste the link in your story or post.');
    setShowShareMenu(false);
  };

  const handleDateRangeSelect = (
    checkIn: Date | null,
    checkOut: Date | null,
    price: number
  ) => {
    setSelectedCheckIn(checkIn);
    setSelectedCheckOut(checkOut);
    setTotalPrice(price);
  };

  // Smooth-scroll the user from the mobile bottom action bar down to the
  // booking sidebar so they immediately land on the calendar / Reserve
  // section. Falls back to no-op if the sidebar isn't yet rendered.
  const scrollToSidebar = () => {
    const target = document.getElementById('booking-sidebar');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBookNow = () => {
    setShowBooking(true);
    // On mobile the sidebar lives at the bottom of the flow; bring it into
    // view so the user doesn't have to scroll manually after tapping Book.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        scrollToSidebar();
      });
    }
  };

  if (loading) {
    return (
      <div className="xpx-page">
        <Header
          onAboutClick={() => navigateToPage('/?page=about')}
          onBlogClick={() => navigateToPage('/?page=blog')}
          onHostLoginClick={() => navigateToPage('/auth/login')}
        />
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-xpx-warm border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!property) return null;

  const propertyTitle = property.title;
  const stateLabel = property.state || inferStateFromCity(property.city);
  const propertyLocation = stateLabel ? `${property.city}, ${stateLabel}` : property.city;

  const subtitle = inferSubtitle(property);
  const featureHighlights = inferFeatureHighlights(property);
  const nearbyPlaces = getNearbyPlaces(property);
  const houseRules = getHouseRules();
  const featuredPromo = listFeaturedPromoCodes()[0];

  const basePrice = property.price_per_day || property.price_full_day || 0;
  const ratingValue = Number(property.rating) || 0;
  const reviewsCount = Number(property.total_reviews) || 0;
  const amenitiesAll = property.amenities ?? [];
  const amenitiesPreview = amenitiesAll.slice(0, 9);
  const moreAmenities = Math.max(0, amenitiesAll.length - amenitiesPreview.length);

  // Why-love icon resolution (we map config keys → Lucide components so
  // propertyDefaults.ts stays free of React imports / dependencies).
  const WhyLoveIcon: Record<(typeof WHY_LOVE_DEFAULTS)[number]['icon'], typeof Sparkles> = {
    sparkles: Sparkles,
    shield: Shield,
    leaf: Leaf,
    heart: Heart,
  };
  const HouseRuleIcon: Record<ReturnType<typeof getHouseRules>[number]['icon'], typeof Clock> = {
    clock: Clock,
    'no-smoking': Cigarette,
    'no-parties': Music,
    paw: PawPrint,
  };

  return (
    <div className="xpx-page">
      <SEOHead
        config={{
          title: `${propertyTitle} - Couple Friendly Stay in ${propertyLocation} | XpressBnB`,
          description: `Book ${propertyTitle} in ${propertyLocation}. ${property.description.substring(0, 150)}. Couple-friendly, safe, and private. Flexible hourly booking available.`,
          keywords: `${propertyTitle}, couple friendly stay ${property.city}, hourly booking ${property.city}, couple safe hotel ${property.city}, private stay ${property.city}`,
          canonical: `https://xpressbnb.com/property/${property.id}`,
          ogTitle: `${propertyTitle} - ${propertyLocation}`,
          ogDescription: property.description.substring(0, 200),
          ogImage: property.images?.[0],
          structuredData: {
            '@context': 'https://schema.org',
            '@graph': [
              generatePropertyStructuredData(property),
              generateBreadcrumbStructuredData([
                { name: 'Home', url: 'https://xpressbnb.com' },
                { name: property.city, url: `https://xpressbnb.com?location=${property.city}` },
                {
                  name: propertyTitle,
                  url: `https://xpressbnb.com/property/${property.id}`,
                },
              ]),
            ],
          },
        }}
      />

      {/* Solid frosted-white header — the gallery sits below it, so we don't
          want a transparent-on-top variant here. */}
      <Header
        onAboutClick={() => navigateToPage('/?page=about')}
        onBlogClick={() => navigateToPage('/?page=blog')}
        onHostLoginClick={() => navigateToPage('/auth/login')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-24 lg:pb-16">
        {/* Top action row — Back link on the left, Share menu on the right. */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={navigateBack}
            className="inline-flex items-center gap-1.5 -ml-1 px-2.5 py-2 rounded-full text-sm font-semibold text-xpx-muted hover:text-xpx-text hover:bg-slate-100 transition-colors"
            style={{ minHeight: 44 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShareMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-xpx-text hover:bg-slate-100 transition-colors"
              style={{ minHeight: 44 }}
              aria-label="Share property"
              aria-expanded={showShareMenu}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {showShareMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowShareMenu(false)}
                  aria-hidden
                />
                <div
                  className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl py-2 z-50"
                  style={{
                    background: 'var(--xpx-surface)',
                    border: '1px solid var(--xpx-border)',
                    boxShadow: '0 16px 40px rgba(15,23,42,0.14)',
                  }}
                >
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
                  >
                    <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <span className="font-medium text-xpx-text text-sm">Share on WhatsApp</span>
                  </button>
                  <button
                    onClick={handleInstagramShare}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </div>
                    <span className="font-medium text-xpx-text text-sm">Share on Instagram</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--xpx-surface-elevated)' }}
                    >
                      {copied ? (
                        <Check className="w-4 h-4" style={{ color: 'var(--xpx-verified)' }} />
                      ) : (
                        <Copy className="w-4 h-4 text-xpx-text" />
                      )}
                    </div>
                    <span className="font-medium text-xpx-text text-sm">
                      {copied ? 'Link copied!' : 'Copy link'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Image gallery */}
        <div className="mt-3 sm:mt-4">
          <PropertyGallery images={property.images ?? []} title={propertyTitle} />
        </div>

        {/* Two-column content + sticky sidebar */}
        <div className="mt-7 sm:mt-10 grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-10 xl:gap-12 items-start">
          <div className="min-w-0 space-y-9 sm:space-y-12">
            {/* 1. TITLE BLOCK */}
            <header>
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-xpx-text leading-[1.1]">
                {propertyTitle}
              </h1>
              {(subtitle || property.is_verified) && (
                <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                  {subtitle && (
                    <p className="text-base sm:text-lg text-xpx-muted">{subtitle}</p>
                  )}
                  {property.is_verified && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
                      style={{
                        background: 'var(--xpx-verified-bg)',
                        color: 'var(--xpx-verified)',
                        border: '1px solid rgba(80, 200, 120, 0.28)',
                      }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" fill="currentColor" />
                      Verified Stay
                    </span>
                  )}
                </div>
              )}

              <p className="mt-3 inline-flex items-center gap-1.5 text-sm sm:text-[15px] text-xpx-muted">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--xpx-trust)' }} />
                <span>
                  {[property.address, property.city, stateLabel].filter(Boolean).join(', ')}
                </span>
              </p>

              <p className="mt-4 text-[15px] sm:text-base text-xpx-muted leading-relaxed line-clamp-2">
                {firstParagraph(property.description)}
              </p>

              {/* Stats strip — uses inline dot separators on desktop, wraps to
                  a stacked layout on narrow phones. */}
              <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {ratingValue > 0 && (
                  <li className="inline-flex items-center gap-1.5">
                    <Star
                      className="w-4 h-4"
                      style={{ color: 'var(--xpx-rating)' }}
                      fill="currentColor"
                    />
                    <span className="font-bold text-xpx-text tabular-nums">
                      {ratingValue.toFixed(1)}
                    </span>
                    {reviewsCount > 0 && (
                      <span className="text-xpx-muted tabular-nums">
                        ({reviewsCount} reviews)
                      </span>
                    )}
                  </li>
                )}
                <li className="inline-flex items-center gap-1.5 text-xpx-muted">
                  <Users className="w-4 h-4 text-xpx-subtle" />
                  <span className="tabular-nums">Up to {property.max_guests} guests</span>
                </li>
                <li className="inline-flex items-center gap-1.5 text-xpx-muted">
                  <Bed className="w-4 h-4 text-xpx-subtle" />
                  <span className="tabular-nums">
                    {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                  </span>
                </li>
                <li className="inline-flex items-center gap-1.5 text-xpx-muted">
                  <Bath className="w-4 h-4 text-xpx-subtle" />
                  <span className="tabular-nums">
                    {property.bathrooms}{' '}
                    {property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                  </span>
                </li>
                <li className="inline-flex items-center gap-1.5 text-xpx-muted">
                  Hosted by{' '}
                  <span className="font-semibold text-xpx-text">
                    {hostName ?? 'Verified Host'}
                  </span>
                </li>
              </ul>
            </header>

            {/* 2. TRUST PILLS ROW */}
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {TRUST_PILLS.map((pill) => (
                  <div
                    key={pill.title}
                    className="rounded-2xl p-4 sm:p-5 flex items-start gap-3"
                    style={{
                      background: 'var(--xpx-surface)',
                      border: '1px solid var(--xpx-border)',
                      boxShadow: 'var(--xpx-shadow-card)',
                    }}
                  >
                    <div
                      className="shrink-0 mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-xl"
                      style={{
                        background:
                          pill.tone === 'verified' ? 'var(--xpx-verified-bg)' : 'var(--xpx-trust-bg)',
                      }}
                    >
                      {pill.tone === 'verified' ? (
                        <CheckCircle
                          className="w-4 h-4"
                          style={{ color: 'var(--xpx-verified)' }}
                          fill="rgba(80, 200, 120, 0.15)"
                        />
                      ) : (
                        <ShieldCheck
                          className="w-4 h-4"
                          style={{ color: 'var(--xpx-trust)' }}
                          fill="rgba(37, 99, 235, 0.12)"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] sm:text-sm text-xpx-text leading-snug">
                        {pill.title}
                      </p>
                      <p className="text-xs text-xpx-muted mt-0.5 leading-snug">
                        {pill.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. ABOUT THIS STAY */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
                About this stay
              </h2>
              <p className="mt-4 text-[15px] sm:text-base text-xpx-muted leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
              {featureHighlights.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {featureHighlights.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{
                        background: 'rgba(80,200,120,0.12)',
                        color: 'var(--xpx-warm-dark)',
                        border: '1px solid rgba(80,200,120,0.32)',
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* 4. AMENITIES */}
            {amenitiesAll.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
                    Amenities
                  </h2>
                  {moreAmenities > 0 && (
                    <a
                      href="#all-amenities"
                      className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
                      style={{ color: 'var(--xpx-warm-dark)' }}
                    >
                      View all amenities
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {amenitiesPreview.map((amenity) => {
                    const Icon = getAmenityIcon(amenity);
                    return (
                      <div
                        key={amenity}
                        className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                        style={{
                          background: 'var(--xpx-surface)',
                          border: '1px solid var(--xpx-border)',
                        }}
                      >
                        <div
                          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(80,200,120,0.12)' }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: 'var(--xpx-warm-dark)' }}
                          />
                        </div>
                        <span className="text-sm text-xpx-text font-medium truncate">
                          {amenity}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Hidden anchor target for "View all amenities" — full list. */}
                {moreAmenities > 0 && (
                  <details
                    id="all-amenities"
                    className="mt-4 group rounded-2xl px-4 py-3"
                    style={{
                      background: 'var(--xpx-surface-light)',
                      border: '1px solid var(--xpx-border)',
                    }}
                  >
                    <summary
                      className="cursor-pointer text-sm font-semibold text-xpx-text inline-flex items-center gap-2 list-none"
                    >
                      <span>Show all {amenitiesAll.length} amenities</span>
                      <span
                        className="ml-auto transition-transform group-open:rotate-180 text-xpx-muted text-xs"
                        aria-hidden
                      >
                        ▾
                      </span>
                    </summary>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {amenitiesAll.map((amenity) => {
                        const Icon = getAmenityIcon(amenity);
                        return (
                          <div
                            key={`all-${amenity}`}
                            className="flex items-center gap-2 text-xs text-xpx-text"
                          >
                            <Icon className="w-3.5 h-3.5 text-xpx-subtle" />
                            <span>{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </section>
            )}

            {/* 5. MEET YOUR HOST */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text mb-5">
                Meet your host
              </h2>
              <HostCard
                hostId={property.host_id}
                fallbackCity={property.city}
                propertyTitle={property.title}
              />
            </section>

            {/* 6. WHY GUESTS LOVE STAYING HERE */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
                Why guests love staying here
              </h2>
              <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {WHY_LOVE_DEFAULTS.map((item) => {
                  const Icon = WhyLoveIcon[item.icon];
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl p-4 sm:p-5"
                      style={{
                        background: 'var(--xpx-surface)',
                        border: '1px solid var(--xpx-border)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'rgba(80,200,120,0.14)',
                          color: 'var(--xpx-warm-dark)',
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="mt-3 text-[15px] font-bold text-xpx-text leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-[13px] text-xpx-muted leading-relaxed">
                        {item.subcopy}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 7. LOCATION & NEARBY INSIGHTS */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
                Location &amp; nearby insights
              </h2>
              <div className="mt-5 grid lg:grid-cols-[1fr_320px] gap-4 sm:gap-5 items-stretch">
                <div
                  className="relative rounded-2xl overflow-hidden aspect-[16/10] lg:aspect-auto lg:min-h-[340px]"
                  style={{
                    background: 'var(--xpx-surface-light)',
                    border: '1px solid var(--xpx-border)',
                  }}
                >
                  <iframe
                    title={`Map of ${propertyTitle}`}
                    src={getMapEmbedUrl(property)}
                    className="absolute inset-0 w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    style={{ border: 0 }}
                  />
                </div>
                <aside
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: 'var(--xpx-surface)',
                    border: '1px solid var(--xpx-border)',
                  }}
                >
                  <p className="xpx-eyebrow mb-3">Around the property</p>
                  <ul className="space-y-3">
                    {nearbyPlaces.slice(0, 5).map((place) => (
                      <li
                        key={place.name}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-xpx-text truncate">
                            {place.name}
                          </p>
                          <p className="text-xs text-xpx-muted truncate">{place.category}</p>
                        </div>
                        <span className="text-xs font-bold text-xpx-text tabular-nums shrink-0">
                          {place.distance}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={getMapLinkUrl(property)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white transition-transform active:scale-[0.97]"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 6px 18px rgba(80,200,120,0.28)',
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    View on Google Maps
                  </a>
                </aside>
              </div>
            </section>

            {/* 8. REVIEWS */}
            <PropertyReviews property={property} />

            {/* 9. HOUSE RULES */}
            <section>
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
                  House rules
                </h2>
                <a
                  href="#all-amenities"
                  className="text-sm font-semibold underline-offset-4 hover:underline"
                  style={{ color: 'var(--xpx-warm-dark)' }}
                >
                  View all house rules →
                </a>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {houseRules.map((rule) => {
                  const Icon = HouseRuleIcon[rule.icon];
                  return (
                    <div
                      key={rule.label}
                      className="rounded-2xl p-4 flex items-start gap-3"
                      style={{
                        background: 'var(--xpx-surface)',
                        border: '1px solid var(--xpx-border)',
                      }}
                    >
                      <div
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                        style={{
                          background: 'rgba(15,23,42,0.04)',
                          color: 'var(--xpx-text)',
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-xpx-text leading-snug">
                          {rule.label}
                        </p>
                        <p className="text-xs text-xpx-muted leading-snug mt-0.5">
                          {rule.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sticky booking sidebar (desktop) / inline (mobile). */}
          <aside
            id="booking-sidebar"
            className={!showBooking ? 'lg:sticky lg:top-24 scroll-mt-24' : 'scroll-mt-24'}
          >
            {!showBooking ? (
              <PropertySidebar
                property={property}
                checkIn={selectedCheckIn}
                checkOut={selectedCheckOut}
                nightlyTotal={totalPrice}
                onDateRangeSelect={handleDateRangeSelect}
                onBookNow={handleBookNow}
                onMakeOffer={() => setShowOfferModal(true)}
                promoCode={featuredPromo?.code ?? null}
                promoLabel={featuredPromo?.label ?? null}
              />
            ) : (
              <div
                className="rounded-3xl p-5 sm:p-6"
                style={{
                  background: 'var(--xpx-surface)',
                  border: '1px solid var(--xpx-border-strong)',
                  boxShadow: '0 18px 56px rgba(15,23,42,0.10)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowBooking(false)}
                  className="inline-flex items-center gap-1.5 mb-4 text-xs font-semibold text-xpx-muted hover:text-xpx-text transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to availability
                </button>
                <p className="xpx-eyebrow mb-3">Complete your booking</p>
                <BookingForm
                  property={property}
                  onSuccess={navigateHome}
                  checkInDate={selectedCheckIn}
                  checkOutDate={selectedCheckOut}
                  calculatedPrice={totalPrice}
                />
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Mobile-only fixed bottom action bar — replaces the global
          MobileBottomNav (which auto-hides on /property/* routes). Keeps
          the user one tap away from the booking sidebar at all times. */}
      {!showBooking && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            borderTop: '1px solid var(--xpx-border)',
            boxShadow: '0 -10px 32px rgba(15,23,42,0.10)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-xpx-text tabular-nums">
                  ₹{basePrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-xpx-muted">/ night</span>
              </div>
              <p className="text-[10.5px] text-xpx-subtle leading-tight">
                Starting price • taxes &amp; fees apply
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToSidebar}
              className="px-5 py-3 rounded-full font-bold text-sm text-white transition-transform active:scale-[0.97]"
              style={{
                background: 'var(--xpx-cta)',
                boxShadow: '0 8px 24px rgba(255,56,92,0.36)',
                minHeight: 48,
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              Reserve
            </button>
          </div>
        </div>
      )}

      <OfferModal
        open={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        property={property}
        checkInDate={selectedCheckIn}
        checkOutDate={selectedCheckOut}
      />
    </div>
  );
}

/**
 * Pull the first paragraph from a host-supplied description. We fall back
 * to the entire description if there are no blank-line breaks. Used in the
 * title block so the short blurb under the location stays meaningful.
 */
function firstParagraph(description: string): string {
  if (!description) return '';
  const trimmed = description.trim();
  const split = trimmed.split(/\n\s*\n/);
  return (split[0] ?? trimmed).trim();
}
