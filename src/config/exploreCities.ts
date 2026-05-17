export type ExploreCityStatus = 'live' | 'coming_soon';

export interface ExploreCity {
  id: string;
  name: string;
  slug: string;
  status: ExploreCityStatus;
  tagline: string;
  vibe: string;
  image: string;
  /** Short line that resonates with Indian travellers */
  hook: string;
}

/** Live destinations — map to `/stays/:slug` (Rishikesh uses dedicated page). */
export const LIVE_EXPLORE_CITIES: ExploreCity[] = [
  {
    id: 'delhi',
    name: 'Delhi',
    slug: 'delhi',
    status: 'live',
    tagline: 'Couple-friendly stays in the capital',
    vibe: 'Metro & business',
    hook: 'Hourly & full-day — no brokerage',
    image:
      'https://images.pexels.com/photos/3759129/pexels-photo-3759129.jpeg?auto=compress&w=1200',
  },
  {
    id: 'gurgaon',
    name: 'Gurgaon',
    slug: 'gurgaon',
    status: 'live',
    tagline: 'Premium homes across Gurgaon',
    vibe: 'Corporate · nightlife',
    hook: 'Verified homes in Sector corridors',
    image:
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&w=1200',
  },
  {
    id: 'noida',
    name: 'Noida',
    slug: 'noida',
    status: 'live',
    tagline: 'Modern verified apartments',
    vibe: 'Modern · spacious',
    hook: 'Direct from hosts — best price',
    image:
      'https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg?auto=compress&w=1200',
  },
  {
    id: 'greater-noida',
    name: 'Greater Noida',
    slug: 'greater-noida',
    status: 'live',
    tagline: 'Spacious stays for families',
    vibe: 'Family · weekend',
    hook: 'Spacious flats & retreats',
    image:
      'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&w=1200',
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    slug: 'rishikesh',
    status: 'live',
    tagline: 'Riverside retreats & yoga stays',
    vibe: 'Spiritual · nature',
    hook: 'Riverside cottages & boutique hotels',
    image:
      'https://images.pexels.com/photos/2422259/pexels-photo-2422259.jpeg?auto=compress&w=1200',
  },
];

export const COMING_SOON_EXPLORE_CITIES: ExploreCity[] = [
  {
    id: 'mumbai',
    name: 'Mumbai',
    slug: 'mumbai',
    status: 'coming_soon',
    tagline: 'Maximum city',
    vibe: 'Coastal · finance',
    hook: 'Launching soon',
    image:
      'https://images.pexels.com/photos/3584916/pexels-photo-3584916.jpeg?auto=compress&w=1200',
  },
  {
    id: 'bangalore',
    name: 'Bengaluru',
    slug: 'bangalore',
    status: 'coming_soon',
    tagline: 'Garden City stays',
    vibe: 'Startup · cafes',
    hook: 'Launching soon',
    image:
      'https://images.pexels.com/photos/2673966/pexels-photo-2673966.jpeg?auto=compress&w=1200',
  },
  {
    id: 'goa',
    name: 'Goa',
    slug: 'goa',
    status: 'coming_soon',
    tagline: 'Beach & villas',
    vibe: 'Holiday · groups',
    hook: 'Launching soon',
    image:
      'https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&w=1200',
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    slug: 'jaipur',
    status: 'coming_soon',
    tagline: 'Pink City heritage',
    vibe: 'Wedding · culture',
    hook: 'Launching soon',
    image:
      'https://images.pexels.com/photos/3581361/pexels-photo-3581361.jpeg?auto=compress&w=1200',
  },
  {
    id: 'chandigarh',
    name: 'Chandigarh',
    slug: 'chandigarh',
    status: 'coming_soon',
    tagline: 'Planned city comfort',
    vibe: 'Clean · premium',
    hook: 'Launching soon',
    image:
      'https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&w=1200',
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    slug: 'hyderabad',
    status: 'coming_soon',
    tagline: 'Pearl City',
    vibe: 'Food · IT corridors',
    hook: 'Launching soon',
    image:
      'https://images.pexels.com/photos/2571203/pexels-photo-2571203.jpeg?auto=compress&w=1200',
  },
];

export function cityStaysPath(city: ExploreCity): string {
  return `/stays/${city.slug}`;
}
