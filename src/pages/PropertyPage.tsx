import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Users,
  Bed,
  Bath,
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
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import PropertyGallery from '../components/property/PropertyGallery';
import DeferredMount from '../components/property/DeferredMount';
import { supabase } from '../lib/supabase';
import { getPublicPropertyById } from '../lib/publicListings';
import { fetchPublicHost } from '../lib/hostPublicCache';
import { getAmenityIcon, listPropertyAmenities } from '../lib/amenities';
import { listPropertyImages } from '../lib/propertyImages';
import { generatePropertyStructuredData, generateBreadcrumbStructuredData } from '../lib/seo';
import { listFeaturedPromoCodes } from '../lib/offers';
import {
  inferStateFromCity,
  inferSubtitle,
  inferFeatureHighlights,
  WHY_LOVE_DEFAULTS,
  getNearbyPlaces,
  getHouseRules,
  getTrustPillsForProperty,
  getMapEmbedUrl,
  getMapLinkUrl,
} from '../config/propertyDefaults';
import { calculateBookingTotal } from '../lib/pricingUtils';
import { safeHostDisplayName } from '../lib/host';
import { parseTripFromSearch } from '../lib/tripSearch';
import { navigateTo } from '../lib/navigation';
import { orchestratedScrollTo, orchestratedScrollToId } from '../lib/scrollOrchestrator';
import { scrollToElement } from '../lib/smoothScroll';
import { recordRecentlyViewed } from '../lib/recentlyViewed';
import { trackXpressEvent } from '../lib/analytics';
import PropertySocialProofBand from '../components/property/PropertySocialProofBand';
import PropertyGuestsAlsoViewed from '../components/property/PropertyGuestsAlsoViewed';
import SaveListingButton from '../components/SaveListingButton';
import PropertyTrustLine from '../components/PropertyTrustLine';
import { snapshotFromProperty } from '../lib/savedListingsStorage';
import { useInViewport } from '../hooks/useGalleryMotion';

/** Preload sidebar chunk + calendar when the booking column nears the viewport. */
const SIDEBAR_MOUNT_ROOT_MARGIN = '400px 0px';

const BookingForm = lazy(() => import('../components/BookingForm'));
const OfferModal = lazy(() => import('../components/OfferModal'));
const HostCard = lazy(() => import('../components/HostCard'));
const PropertyReviews = lazy(() => import('../components/property/PropertyReviews'));
const NearbyPropertiesSection = lazy(
  () => import('../components/property/NearbyPropertiesSection'),
);
const PropertySidebar = lazy(() => import('../components/property/PropertySidebar'));

function SidebarFallback() {
  return (
    <div
      className="rounded-3xl min-h-[480px] lg:min-h-[520px]"
      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      aria-hidden
    />
  );
}

/**
 * PropertyPage — redesigned around an Apple / Expedia-grade reading flow:
 *   gallery → title + stats → trust pills → about → amenities → host →
 *   why-guests-love → location & nearby → reviews → house rules.
 *
 * The right column hosts a sticky booking sidebar with the existing
 * BookingCalendar / BookingForm / OfferModal pipelines wired in.
 * PropertySidebar (and its calendar fetch) mount only when the booking
 * column nears the viewport or the user starts a booking flow — same gate
 * on desktop and mobile. SidebarFallback preserves layout until then.
 */
export default function PropertyPage() {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);
  const [sidebarForced, setSidebarForced] = useState(false);
  const [numGuests, setNumGuests] = useState(2);
  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );

  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarNearView = useInViewport(sidebarRef, 0, SIDEBAR_MOUNT_ROOT_MARGIN);
  const mountSidebar = sidebarForced || sidebarNearView || showBooking || isMobileLayout;

  const tripFromSearch = useMemo(() => parseTripFromSearch(window.location.search), []);

  const hasValidDates = useMemo(() => {
    if (!selectedCheckIn || !selectedCheckOut) return false;
    return selectedCheckOut > selectedCheckIn;
  }, [selectedCheckIn, selectedCheckOut]);

  const bookingNights = useMemo(() => {
    if (!hasValidDates || !selectedCheckIn || !selectedCheckOut) return 0;
    return Math.max(
      1,
      Math.round(
        (selectedCheckOut.getTime() - selectedCheckIn.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
  }, [hasValidDates, selectedCheckIn, selectedCheckOut]);

  const tripBreakdown = useMemo(
    () =>
      property
        ? calculateBookingTotal(totalPrice, bookingNights, numGuests, property)
        : {
            baseTotal: 0,
            fees: 0,
            taxes: 0,
            grandTotal: 0,
            cleaningFee: 0,
            serviceFee: 0,
          },
    [totalPrice, bookingNights, numGuests, property],
  );

  useEffect(() => {
    if (!hasValidDates && showBooking) {
      setShowBooking(false);
    }
  }, [hasValidDates, showBooking]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobileLayout(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!property) return;
    const cap = Math.max(1, property.max_guests || 1);
    const fromTrip = tripFromSearch.guests;
    if (fromTrip != null) {
      setNumGuests(Math.min(Math.max(1, fromTrip), cap));
    } else {
      setNumGuests((current) => Math.min(Math.max(1, current), cap));
    }
  }, [property, tripFromSearch.guests]);

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
    navigateTo('/');
  };

  const navigateBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateHome();
    }
  };

  const navigateToPage = (page: string) => {
    navigateTo(page);
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
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    try {
      const result = await getPublicPropertyById(propertyId);
      if (result.status === 'success') {
        const data = result.property;
        setProperty(data);
        recordRecentlyViewed(data);
        trackPropertyView(propertyId, data.listing_type ?? '');
        trackXpressEvent('property_view', {
          property_id: data.id,
          property_slug: data.slug ?? undefined,
          city: data.city,
        });
        if (data.host_id) {
          loadHostName(data.host_id);
        }
        return;
      }

      if (result.status === 'not_found') {
        setNotFound(true);
        trackXpressEvent('property_load_failed', {
          property_id: propertyId,
          error_category: 'not_found',
        });
        return;
      }

      setLoadError(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading property:', error);
      }
      setLoadError(true);
      trackXpressEvent('property_load_failed', {
        property_id: propertyId,
        error_category: 'load_failed',
      });
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
      const row = await fetchPublicHost(hostId);
      if (row?.name) {
        setHostName(safeHostDisplayName(row.name, 'Verified Host'));
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

  const handleDateRangeSelect = useCallback(
    (checkIn: Date | null, checkOut: Date | null, price: number) => {
      setSelectedCheckIn(checkIn);
      setSelectedCheckOut(checkOut);
      setTotalPrice(price);
      if (checkIn && checkOut) {
        trackXpressEvent('booking_step_completed', { booking_step: 'dates' });
        requestAnimationFrame(() => {
          orchestratedScrollTo('booking_guests', { skipIfVisible: true, highlight: true });
        });
      }
    },
    [],
  );

  // Smooth-scroll the user from the mobile bottom action bar down to the
  // booking sidebar so they immediately land on the calendar / Reserve
  // section. Falls back to no-op if the sidebar isn't yet rendered.
  const scrollToSidebar = useCallback(() => {
    scrollToElement(document.getElementById('booking-sidebar'), {
      offset: -80,
      duration: 0.35,
    });
  }, []);

  const scrollToBookingCalendar = useCallback(() => {
    setSidebarForced(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          scrollToSidebar();
        }
        orchestratedScrollToId('booking-step-calendar', { highlight: true });
      });
    });
  }, [scrollToSidebar]);

  const handleCheckAvailability = useCallback(() => {
    setSidebarForced(true);
    if (property) {
      trackXpressEvent('check_availability_click', {
        property_id: property.id,
        property_slug: property.slug ?? undefined,
        city: property.city,
      });
    }
    scrollToBookingCalendar();
  }, [property, scrollToBookingCalendar]);

  const handleOpenBookingForm = useCallback(() => {
    if (!hasValidDates) return;
    setSidebarForced(true);
    if (property) {
      trackXpressEvent('request_to_book_click', {
        property_id: property.id,
        property_slug: property.slug ?? undefined,
        city: property.city,
        inquiry_type: 'book_pay_later',
      });
      trackXpressEvent('booking_form_started', {
        property_id: property.id,
        property_slug: property.slug ?? undefined,
        city: property.city,
        inquiry_type: 'book_pay_later',
        booking_step: 'contact',
      });
      const nearbySource = new URLSearchParams(window.location.search).get('nearby');
      if (nearbySource) {
        trackXpressEvent('nearby_booking_started', {
          property_id: property.id,
          nearby_source: nearbySource,
        });
      }
    }
    setShowBooking(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          scrollToSidebar();
        }
        orchestratedScrollTo('booking_contact', { highlight: true, skipIfVisible: true });
      });
    });
  }, [hasValidDates, property, scrollToSidebar]);

  const handlePrimaryBookingCta = useCallback(() => {
    if (hasValidDates) {
      handleOpenBookingForm();
    } else {
      handleCheckAvailability();
    }
  }, [hasValidDates, handleOpenBookingForm, handleCheckAvailability]);

  const handleEditDates = useCallback(() => {
    scrollToBookingCalendar();
  }, [scrollToBookingCalendar]);

  const handleGuestsChange = useCallback((guests: number) => {
    setNumGuests(guests);
    trackXpressEvent('booking_step_completed', { booking_step: 'guests' });
  }, []);

  useEffect(() => {
    if (!property || loading || !isMobileLayout) return;
    if (!tripFromSearch.checkin || !tripFromSearch.checkout) return;
    setSidebarForced(true);
    const timer = window.setTimeout(() => {
      scrollToBookingCalendar();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    property,
    loading,
    isMobileLayout,
    tripFromSearch.checkin,
    tripFromSearch.checkout,
    scrollToBookingCalendar,
  ]);

  const renderBookingColumn = () => (
    <>
      {mountSidebar ? (
        <>
          <Suspense fallback={<SidebarFallback />}>
            <PropertySidebar
              property={property!}
              checkIn={selectedCheckIn}
              checkOut={selectedCheckOut}
              nightlyTotal={totalPrice}
              onDateRangeSelect={handleDateRangeSelect}
              numGuests={numGuests}
              onGuestsChange={handleGuestsChange}
              hasValidDates={hasValidDates}
              onCheckAvailability={handleCheckAvailability}
              onRequestToBook={handleOpenBookingForm}
              hideBookingCtas={showBooking}
              onMakeOffer={() => setShowOfferModal(true)}
              promoCode={featuredPromo?.code ?? null}
              promoLabel={featuredPromo?.label ?? null}
              initialCalendarCheckIn={tripFromSearch.checkin ?? null}
              initialCalendarCheckOut={tripFromSearch.checkout ?? null}
            />
          </Suspense>
          {showBooking && hasValidDates && (
            <div
              className="mt-5 rounded-3xl p-5 sm:p-6"
              style={{
                background: 'var(--xpx-surface)',
                border: '1px solid var(--xpx-border-strong)',
                boxShadow: '0 18px 56px rgba(15,23,42,0.10)',
              }}
            >
              <p className="xpx-eyebrow mb-3">Request to book</p>
              <Suspense
                fallback={
                  <div className="flex justify-center py-12" aria-hidden>
                    <div className="w-10 h-10 border-4 border-xpx-warm border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              >
                <BookingForm
                  property={property!}
                  onSuccess={() => {
                    /* Success UI stays inline in BookingForm */
                  }}
                  checkInDate={selectedCheckIn}
                  checkOutDate={selectedCheckOut}
                  calculatedPrice={totalPrice}
                  numGuests={numGuests}
                  onEditDates={handleEditDates}
                />
              </Suspense>
            </div>
          )}
        </>
      ) : (
        <SidebarFallback />
      )}
    </>
  );

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

  if (loadError) {
    return (
      <div className="xpx-page">
        <Header
          onAboutClick={() => navigateToPage('/?page=about')}
          onBlogClick={() => navigateToPage('/?page=blog')}
          onHostLoginClick={() => navigateToPage('/auth/login')}
        />
        <div className="flex flex-col items-center justify-center h-96 px-4 text-center">
          <h1 className="text-lg font-bold text-xpx-text mb-2">We couldn&apos;t load this stay</h1>
          <p className="text-sm text-xpx-muted max-w-md mb-5">
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => {
              const match = window.location.pathname.match(/^\/property\/([a-f0-9-]+)$/);
              if (match) void loadProperty(match[1]);
            }}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-xpx-warm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="xpx-page">
        <Header
          onAboutClick={() => navigateToPage('/?page=about')}
          onBlogClick={() => navigateToPage('/?page=blog')}
          onHostLoginClick={() => navigateToPage('/auth/login')}
        />
        <div className="flex flex-col items-center justify-center h-96 px-4 text-center">
          <h1 className="text-lg font-bold text-xpx-text mb-2">Stay not found</h1>
          <p className="text-sm text-xpx-muted max-w-md mb-5">
            This listing may have been removed or is no longer available.
          </p>
          <button
            type="button"
            onClick={navigateBack}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-xpx-warm"
          >
            Go back
          </button>
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
  const amenitiesAll = listPropertyAmenities(property.amenities);
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
          ogImage: listPropertyImages(property.images)[0],
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 xpx-property-page-main flex flex-col">
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

          <div className="flex items-center gap-1">
            <SaveListingButton
              propertyId={property.id}
              variant="inline"
              getSnapshot={() => snapshotFromProperty(property)}
            />

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
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 via-emerald-700 to-orange-500 rounded-full flex items-center justify-center">
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
        </div>

        {/* Image gallery — first on mobile (below header); before content grid on desktop */}
        <div className="order-1 lg:order-1 mt-4 sm:mt-5 lg:mt-3">
          <PropertyGallery images={property.images ?? []} title={propertyTitle} />
        </div>

        {/* Two-column content + sticky sidebar — after gallery on mobile */}
        <div className="order-2 lg:order-2 mt-5 sm:mt-7 lg:mt-10 grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-10 xl:gap-12 items-start">
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
                <li>
                  <PropertyTrustLine property={property} variant="page" />
                </li>
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
              <PropertySocialProofBand propertyId={property.id} city={property.city} />
            </header>

            <DeferredMount rootMargin="400px 0px">
            {/* 2. TRUST PILLS ROW */}
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {getTrustPillsForProperty(property).map((pill) => (
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

            <PropertyGuestsAlsoViewed property={property} placement="amenities" />

            {/* 5. MEET YOUR HOST */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text mb-5">
                Meet your host
              </h2>
              <Suspense fallback={null}>
                <HostCard
                  hostId={property.host_id}
                  fallbackCity={property.city}
                  propertyTitle={property.title}
                  onRequestToBook={handlePrimaryBookingCta}
                />
              </Suspense>
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
            <Suspense fallback={null}>
              <PropertyReviews property={property} />
            </Suspense>

            {/* 8b. SIMILAR STAYS NEARBY */}
            <Suspense fallback={null}>
              <NearbyPropertiesSection originProperty={property} />
            </Suspense>

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
            </DeferredMount>
          </div>

          {/* Sticky booking sidebar (desktop) / below main content on mobile. */}
          <aside
            ref={sidebarRef}
            id="booking-sidebar"
            className={`xpx-booking-sidebar-sticky scroll-mt-24 lg:self-start${
              showBooking ? ' pb-28 lg:pb-0' : ''
            }`}
          >
            {renderBookingColumn()}
          </aside>
        </div>
      </main>

      {/* Mobile-only fixed bottom action bar — replaces the global
          MobileBottomNav (which auto-hides on /property/* routes). Keeps
          the user one tap away from the booking sidebar at all times. */}
      {!showBooking && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 xpx-mobile-booking-bar"
          style={{
            background: 'rgba(255,255,255,0.96)',
            borderTop: '1px solid var(--xpx-border)',
            boxShadow: '0 -4px 20px rgba(15,23,42,0.08)',
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
            <div className="min-w-0">
              {hasValidDates ? (
                <>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-lg font-extrabold text-xpx-text tabular-nums">
                      ₹{tripBreakdown.grandTotal.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-xpx-muted">total</span>
                  </div>
                  <p className="text-[10.5px] text-xpx-subtle leading-tight">
                    {bookingNights} {bookingNights === 1 ? 'night' : 'nights'} · incl. fees · no GST from us
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-xpx-text tabular-nums">
                      ₹{basePrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-xpx-muted">/ night</span>
                  </div>
                  <p className="text-[10.5px] text-xpx-subtle leading-tight">
                    Starting price · host sets the rate
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handlePrimaryBookingCta}
              className="shrink-0 px-5 py-3 rounded-full font-bold text-sm text-white transition-transform motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.97] min-h-[48px] min-w-[44px]"
              style={{
                background: 'var(--xpx-cta)',
                boxShadow: '0 4px 16px rgba(255,56,92,0.28)',
              }}
            >
              {hasValidDates ? 'Request to book' : 'Check availability'}
            </button>
          </div>
        </div>
      )}

      {showOfferModal && property && (
        <Suspense fallback={null}>
          <OfferModal
            open={showOfferModal}
            onClose={() => setShowOfferModal(false)}
            property={property}
            checkInDate={selectedCheckIn}
            checkOutDate={selectedCheckOut}
          />
        </Suspense>
      )}
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
