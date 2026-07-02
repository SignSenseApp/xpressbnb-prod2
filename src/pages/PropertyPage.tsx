import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import PropertyEditorialIntro from '../components/property/PropertyEditorialIntro';
import DeferredMount from '../components/property/DeferredMount';
import { supabase } from '../lib/supabase';
import { getPublicPropertyById } from '../lib/publicListings';
import {
  getGroupedAmenitiesBeyondPreview,
  groupPropertyAmenitiesByCategory,
  listPropertyAmenities,
  splitGroupedAmenitiesForPreview,
} from '../lib/amenities';
import type { GroupedPropertyAmenities } from '../lib/amenities';
import { listPropertyImages } from '../lib/propertyImages';
import { generatePropertyStructuredData, generateBreadcrumbStructuredData } from '../lib/seo';
import { listFeaturedPromoCodes } from '../lib/offers';
import {
  inferStateFromCity,
  inferFeatureHighlights,
  WHY_LOVE_DEFAULTS,
  getNearbyPlaces,
  getHouseRules,
  getMapEmbedUrl,
  getMapLinkUrl,
} from '../config/propertyDefaults';
import { buildGuestPricingQuote, formatInr } from '../lib/guestPricingEngine';
import { GUEST_PRICING_TRIP_HINT } from '../lib/guestPricingCopy';
import { inquiryCtaLabel, openingArrivalCtaLabel } from '../lib/inquiryCopy';
import { isArrivalRevealed } from '../lib/arrivalReveal';
import { parseTripFromSearch } from '../lib/tripSearch';
import { navigateTo } from '../lib/navigation';
import { orchestratedScrollTo, orchestratedScrollToId } from '../lib/scrollOrchestrator';
import { scrollToElement } from '../lib/smoothScroll';
import { recordRecentlyViewed } from '../lib/recentlyViewed';
import { trackXpressEvent } from '../lib/analytics';
import {
  CenteredEssay,
  EditorialChapter,
  EditorialColumn,
  EditorialEyebrow,
  EditorialHeadline,
  EditorialProse,
  EditorialStoryFlow,
  OffsetLeft,
  OffsetRight,
  PullQuote,
  QuietPause,
  SplitEssay,
  WideColumn,
} from '../components/editorial/EditorialLayouts';
import PropertyGuestsAlsoViewed from '../components/property/PropertyGuestsAlsoViewed';
import SaveListingButton from '../components/SaveListingButton';
import { snapshotFromProperty } from '../lib/savedListingsStorage';
import { useInViewport } from '../hooks/useGalleryMotion';
import {
  PropertyPageSkeletonBody,
  PropertySidebarSkeleton,
} from '../components/property/PropertyPageSkeleton';

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
  return <PropertySidebarSkeleton className="min-h-[480px] lg:min-h-[520px]" />;
}

function AmenityDirectory({ groups }: { groups: GroupedPropertyAmenities[] }) {
  return (
    <div>
      {groups.map((group) => (
        <div key={group.categoryName} className="xpx-lux-amenity-category">
          <h3 className="xpx-lux-category-title">{group.categoryName}</h3>
          <ul className="xpx-lux-list" role="list">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name} className="xpx-lux-list-item">
                  <Icon className="xpx-lux-icon-inline mt-0.5" strokeWidth={1.25} aria-hidden />
                  <span>{item.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
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
  const [copied, setCopied] = useState(false);
  const [arrivalRevealed, setArrivalRevealed] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
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

  const tripQuote = useMemo(
    () =>
      property
        ? buildGuestPricingQuote({
            property,
            accommodationSubtotal: totalPrice,
            nights: bookingNights,
            numGuests,
          })
        : null,
    [totalPrice, bookingNights, numGuests, property],
  );

  useEffect(() => {
    if (!hasValidDates && showBooking) {
      setShowBooking(false);
    }
  }, [hasValidDates, showBooking]);

  useEffect(() => {
    const onScroll = () => setArrivalRevealed(isArrivalRevealed());
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
            <div className="xpx-concierge-inquiry">
              <p className="xpx-lux-eyebrow">Your inquiry</p>
              <h3 className="xpx-lux-heading text-xl sm:text-2xl">Guest details</h3>
              <div className="xpx-lux-section-body">
              <Suspense
                fallback={
                  <div className="flex justify-center py-12" aria-hidden>
                    <div
                      className="h-10 w-10 rounded-full border-2 border-lux-divider border-t-lux-accent animate-spin"
                    />
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
      <div className="xpx-page min-h-screen" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading property</span>
        <Header
          onAboutClick={() => navigateToPage('/?page=about')}
          onBlogClick={() => navigateToPage('/?page=blog')}
          onHostLoginClick={() => navigateToPage('/auth/login')}
        />
        <PropertyPageSkeletonBody />
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
  const editorialLocation =
    stateLabel && property.city ? `${property.city}, ${stateLabel}` : propertyLocation;

  const featureHighlights = inferFeatureHighlights(property);
  const nearbyPlaces = getNearbyPlaces(property);
  const houseRules = getHouseRules();
  const featuredPromo = listFeaturedPromoCodes()[0];

  const basePrice = property.price_per_day || property.price_full_day || 0;
  const amenitiesAll = listPropertyAmenities(property.amenities);
  const amenityGroups = groupPropertyAmenitiesByCategory(amenitiesAll);
  const { preview: amenityPreviewGroups, hasOverflow: hasMoreAmenities } =
    splitGroupedAmenitiesForPreview(amenityGroups);
  const amenityOverflowGroups = hasMoreAmenities
    ? getGroupedAmenitiesBeyondPreview(amenityGroups)
    : [];

  const HouseRuleIcon: Record<ReturnType<typeof getHouseRules>[number]['icon'], typeof Clock> = {
    clock: Clock,
    'no-smoking': Cigarette,
    'no-parties': Music,
    paw: PawPrint,
  };

  return (
    <div className="xpx-page xpx-property-page">
      <SEOHead
        config={{
          title: `${propertyTitle} - Couple Friendly Stay in ${propertyLocation} | XpressBnB`,
          description: `Inquire about ${propertyTitle} in ${propertyLocation}. ${property.description.substring(0, 150)}. Couple-friendly, private stays — send an inquiry and hear from the host directly.`,
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

      <Header
        arrivalMode
        onAboutClick={() => navigateToPage('/?page=about')}
        onBlogClick={() => navigateToPage('/?page=blog')}
        onHostLoginClick={() => navigateToPage('/auth/login')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xpx-property-page-main xpx-arrival-main flex flex-col">
        <div className="xpx-ed-opening-spread xpx-ed-opening-spread--arrival">
          <nav
            className={`xpx-ed-arrival-utilities-bar${arrivalRevealed ? ' xpx-ed-arrival-revealed' : ''}`}
            aria-label="Page utilities"
            aria-hidden={!arrivalRevealed}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xpx-ed-magazine-utilities">
              <button
                type="button"
                onClick={navigateBack}
                className="xpx-ed-magazine-link"
                tabIndex={arrivalRevealed ? undefined : -1}
              >
                Back to results
              </button>

              <div className="xpx-ed-magazine-utilities-group">
                <SaveListingButton
                  propertyId={property.id}
                  variant="inline"
                  presentation="editorial"
                  className="xpx-ed-magazine-link xpx-ed-arrival-save"
                  getSnapshot={() => snapshotFromProperty(property)}
                />

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="xpx-ed-magazine-link xpx-ed-arrival-share"
                  aria-label={copied ? 'Link copied' : 'Copy link to share'}
                  tabIndex={arrivalRevealed ? undefined : -1}
                >
                  {copied ? 'Link copied' : 'Share'}
                </button>
              </div>
            </div>
          </nav>

          <PropertyGallery images={property.images ?? []} title={propertyTitle} />

          <PropertyEditorialIntro
            property={property}
            title={propertyTitle}
            locationLabel={editorialLocation}
            primaryCtaLabel={openingArrivalCtaLabel(hasValidDates)}
            onPrimaryAction={handlePrimaryBookingCta}
          />
        </div>

        <div className="mt-16 sm:mt-20 lg:mt-24 grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-10 xl:gap-12 items-start">
          <div className="min-w-0">
            <EditorialStoryFlow>
            <DeferredMount rootMargin="400px 0px">
            <EditorialChapter aria-labelledby="about-this-stay-heading">
              <OffsetRight>
                <EditorialEyebrow>The residence</EditorialEyebrow>
                <EditorialHeadline id="about-this-stay-heading" size="lg">
                  About this stay
                </EditorialHeadline>
              </OffsetRight>
              <EditorialProse className="mt-8 whitespace-pre-line">
                {property.description}
              </EditorialProse>
              {featureHighlights.length > 0 && (
                <ul className="mt-12 xpx-lux-prose-list space-y-2.5 max-w-[42rem]">
                  {featureHighlights.map((h) => (
                    <li key={h}>
                      <span className="mr-3 text-lux-faint" aria-hidden>
                        —
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </EditorialChapter>

            {amenitiesAll.length > 0 && (
              <EditorialChapter aria-labelledby="amenities-heading">
                <WideColumn>
                  <EditorialEyebrow>Comforts &amp; conveniences</EditorialEyebrow>
                  <EditorialHeadline id="amenities-heading" size="md">
                    Amenities
                  </EditorialHeadline>
                </WideColumn>
                <div className="mt-10">
                  <AmenityDirectory groups={amenityPreviewGroups} />
                  {hasMoreAmenities && (
                    <details id="all-amenities" className="xpx-lux-disclosure group mt-10">
                      <summary>
                        <span>Show all {amenitiesAll.length} amenities</span>
                        <span className="xpx-lux-disclosure-chevron" aria-hidden>
                          ▾
                        </span>
                      </summary>
                      <div className="mt-8">
                        <AmenityDirectory groups={amenityOverflowGroups} />
                      </div>
                    </details>
                  )}
                </div>
              </EditorialChapter>
            )}

            <PropertyGuestsAlsoViewed property={property} placement="amenities" />

            <QuietPause>
              Some places ask you to stay longer.
            </QuietPause>

            <EditorialChapter aria-labelledby="host-heading">
              <EditorialEyebrow>Your host</EditorialEyebrow>
              <EditorialHeadline id="host-heading" size="md">
                Meet your host
              </EditorialHeadline>
              <div className="mt-10">
                <Suspense fallback={null}>
                  <HostCard
                    hostId={property.host_id}
                    fallbackCity={property.city}
                    propertyTitle={property.title}
                    onRequestToBook={handlePrimaryBookingCta}
                  />
                </Suspense>
              </div>
            </EditorialChapter>

            <EditorialChapter aria-labelledby="why-love-heading">
              <CenteredEssay>
                <EditorialEyebrow>Guest impressions</EditorialEyebrow>
                <EditorialHeadline id="why-love-heading" size="sm">
                  Why guests love staying here
                </EditorialHeadline>
              </CenteredEssay>
              <PullQuote size="hero" cite={WHY_LOVE_DEFAULTS[0]?.title}>
                {WHY_LOVE_DEFAULTS[0]?.subcopy}
              </PullQuote>
              <div className="xpx-ed-collection-row xpx-ed-collection-row--duo mt-4">
                {WHY_LOVE_DEFAULTS.slice(1, 3).map((item) => (
                  <PullQuote key={item.title} size="supporting" cite={item.title}>
                    {item.subcopy}
                  </PullQuote>
                ))}
              </div>
            </EditorialChapter>

            <EditorialChapter aria-labelledby="location-heading">
              <OffsetLeft>
                <EditorialEyebrow>The setting</EditorialEyebrow>
                <EditorialHeadline id="location-heading" size="lg">
                  {property.city}
                </EditorialHeadline>
                <p className="xpx-ed-chapter-lead">
                  The map is a reference. The feeling of a place is what brings guests here.
                </p>
              </OffsetLeft>
              <SplitEssay
                ratio="60-40"
                primary={
                  <ul className="xpx-ed-location-notes" role="list">
                    {nearbyPlaces.slice(0, 5).map((place) => (
                      <li key={place.name} className="xpx-ed-location-note">
                        <strong>{place.name}</strong>
                        <span>
                          {place.category}
                          <span className="tabular-nums"> · {place.distance}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                }
                secondary={
                  <div className="xpx-ed-map-quiet">
                    <div className="xpx-lux-map-frame">
                      <iframe
                        title={`Map of ${propertyTitle}`}
                        src={getMapEmbedUrl(property)}
                        className="absolute inset-0 h-full w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                        style={{ border: 0 }}
                      />
                    </div>
                    <a
                      href={getMapLinkUrl(property)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="xpx-lux-link mt-6 inline-flex items-center gap-1.5 text-sm"
                    >
                      Open in Google Maps
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.25} aria-hidden />
                    </a>
                  </div>
                }
              />
            </EditorialChapter>

            <Suspense fallback={null}>
              <PropertyReviews property={property} />
            </Suspense>

            <Suspense fallback={null}>
              <NearbyPropertiesSection originProperty={property} />
            </Suspense>

            <EditorialChapter aria-labelledby="house-rules-heading">
              <EditorialColumn className="mx-auto">
                <EditorialEyebrow>Courtesy</EditorialEyebrow>
                <EditorialHeadline id="house-rules-heading" size="sm">
                  A few things to know
                </EditorialHeadline>
              </EditorialColumn>
              <ul className="mt-10 xpx-lux-list max-w-[42rem] mx-auto" role="list">
                {houseRules.map((rule) => {
                  const Icon = HouseRuleIcon[rule.icon];
                  return (
                    <li key={rule.label} className="xpx-lux-list-item">
                      <Icon
                        className="xpx-lux-icon-inline mt-1"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <span className="xpx-lux-list-item-label">{rule.label}</span>
                        <span className="xpx-lux-list-item-detail">{rule.detail}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </EditorialChapter>
            </DeferredMount>
            </EditorialStoryFlow>
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
        <div className="xpx-mobile-concierge-bar lg:hidden fixed bottom-0 left-0 right-0 z-40 xpx-mobile-booking-bar">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              {hasValidDates ? (
                <>
                  <p className="xpx-concierge-price-label">Estimated stay</p>
                  <p className="text-base font-medium tabular-nums" style={{ color: 'var(--lux-ink)' }}>
                    {formatInr(tripQuote?.guestTotal ?? 0)}
                  </p>
                  <p className="xpx-concierge-hint">
                    {GUEST_PRICING_TRIP_HINT(bookingNights)}
                  </p>
                </>
              ) : (
                <>
                  <p className="xpx-concierge-price-label">From</p>
                  <p className="text-base font-medium tabular-nums" style={{ color: 'var(--lux-ink)' }}>
                    ₹{basePrice.toLocaleString('en-IN')}
                    <span className="ml-1 text-sm font-normal text-lux-muted">per night</span>
                  </p>
                  <p className="xpx-concierge-hint">
                    Host sets the rate · taxes after dates
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handlePrimaryBookingCta}
              className="xpx-concierge-cta shrink-0 px-6 min-w-[44px]"
            >
              {hasValidDates
                ? inquiryCtaLabel('property_with_dates')
                : inquiryCtaLabel('property_no_dates')}
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
