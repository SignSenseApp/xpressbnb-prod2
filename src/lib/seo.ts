import { xpLogoAbsoluteUrl } from './branding';

// Loose JSON-LD payload: schema.org documents contain arbitrarily nested
// strings/numbers/arrays/objects, so we model it as a JSON-shaped record.
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined };
export type JsonLdRecord = { [key: string]: JsonLdValue | undefined };

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  structuredData?: JsonLdRecord;
}

export const defaultSEO: SEOConfig = {
  title: 'XpressBnB - Couple Friendly Hourly Stays in Delhi NCR | Safe & Private',
  description: 'Book couple-friendly hourly stays in Delhi NCR. Safe, private, and verified properties perfect for couples. Flexible hourly bookings starting from ₹499. Available in Delhi, Gurgaon, Noida.',
  keywords: 'couple friendly stays, couple safe stays, hourly stays, hourly hotels delhi, couple hotels delhi ncr, private stays delhi, couple friendly hotels gurgaon, hourly booking noida, safe stays for couples',
  canonical: 'https://xpressbnb.com',
  ogType: 'website',
  twitterCard: 'summary_large_image',
};

export function updateMetaTags(config: Partial<SEOConfig>) {
  const seo = { ...defaultSEO, ...config };

  document.title = seo.title;

  updateOrCreateMetaTag('name', 'description', seo.description);
  if (seo.keywords) {
    updateOrCreateMetaTag('name', 'keywords', seo.keywords);
  }

  updateOrCreateMetaTag('property', 'og:title', seo.ogTitle || seo.title);
  updateOrCreateMetaTag('property', 'og:description', seo.ogDescription || seo.description);
  updateOrCreateMetaTag('property', 'og:type', seo.ogType || 'website');
  updateOrCreateMetaTag('property', 'og:url', seo.canonical || window.location.href);

  if (seo.ogImage) {
    updateOrCreateMetaTag('property', 'og:image', seo.ogImage);
  }

  updateOrCreateMetaTag('name', 'twitter:card', seo.twitterCard || 'summary_large_image');
  updateOrCreateMetaTag('name', 'twitter:title', seo.ogTitle || seo.title);
  updateOrCreateMetaTag('name', 'twitter:description', seo.ogDescription || seo.description);
  if (seo.ogImage) {
    updateOrCreateMetaTag('name', 'twitter:image', seo.ogImage);
  }

  if (seo.canonical) {
    updateOrCreateLink('canonical', seo.canonical);
  }

  if (seo.structuredData) {
    updateStructuredData(seo.structuredData);
  }
}

function updateOrCreateMetaTag(attribute: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function updateOrCreateLink(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function updateStructuredData(data: JsonLdRecord) {
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// Property here is intentionally a loose record — different callers pass
// rows from Supabase, manually composed objects, or partial cached data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generatePropertyStructuredData(property: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: property.title,
    description: property.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      addressCountry: 'IN',
    },
    geo: property.latitude && property.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    } : undefined,
    image: property.images || [],
    priceRange: `₹${property.price_per_day || property.price_full_day}`,
    aggregateRating: property.rating ? {
      '@type': 'AggregateRating',
      ratingValue: property.rating,
      reviewCount: property.review_count || 1,
    } : undefined,
    amenityFeature: property.amenities?.map((amenity: string) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
    })),
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'XpressBnB',
    url: 'https://xpressbnb.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://xpressbnb.com/favicon-192.png',
      width: 192,
      height: 192,
    },
    description: 'Leading platform for couple-friendly hourly stays in Delhi NCR. Safe, verified, and private properties for flexible short-term bookings.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-XXXXXXXXXX',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: [
      'https://www.facebook.com/xpressbnb',
      'https://www.instagram.com/xpressbnb',
      'https://twitter.com/xpressbnb',
    ],
  };
}

export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'XpressBnB',
    url: 'https://xpressbnb.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://xpressbnb.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
