/** XpressBnB premium homepage design tokens — Apple × Airbnb × Linear */

export const premiumBrand = {
  forest: '#0B8A5A',
  forestDark: '#087A4F',
  forestLight: '#E8F5EF',
  ivory: '#FAF8F4',
  stone: '#F1F3F2',
  charcoal: '#111827',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  gold: '#D4AF37',
  goldSoft: 'rgba(212, 175, 55, 0.14)',
  white: '#FFFFFF',
  border: 'rgba(17, 24, 39, 0.08)',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassStrong: 'rgba(255, 255, 255, 0.92)',
} as const;

export const premiumShadows = {
  float: '0 20px 50px rgba(17, 24, 39, 0.12), 0 4px 14px rgba(17, 24, 39, 0.06)',
  card: '0 12px 32px rgba(17, 24, 39, 0.10), 0 2px 8px rgba(17, 24, 39, 0.04)',
  chip: '0 8px 24px rgba(17, 24, 39, 0.08)',
  dock: '0 16px 48px rgba(17, 24, 39, 0.14), 0 4px 12px rgba(17, 24, 39, 0.06)',
  search: '0 18px 44px rgba(17, 24, 39, 0.16), 0 4px 12px rgba(17, 24, 39, 0.06)',
} as const;

export type LocalDestination = {
  id: string;
  city: string;
  slug: string;
  emoji: string;
  tagline: string;
  stays: number;
  image: string;
  pastel: string;
};

export const LOCAL_DESTINATIONS: LocalDestination[] = [
  {
    id: 'rishikesh',
    city: 'Rishikesh',
    slug: 'rishikesh',
    emoji: '🏞',
    tagline: 'Riverside bliss & mountain vibes',
    stays: 312,
    image: '/images/home/dest-rishikesh.png',
    pastel: '#E8F4EC',
  },
  {
    id: 'gurgaon',
    city: 'Gurgaon',
    slug: 'gurgaon',
    emoji: '🏙',
    tagline: 'Luxury living in the skyline',
    stays: 245,
    image: '/images/home/dest-gurgaon.png',
    pastel: '#F0EDE8',
  },
  {
    id: 'delhi',
    city: 'Delhi NCR',
    slug: 'delhi',
    emoji: '🌆',
    tagline: 'Curated city experiences',
    stays: 408,
    image: '/images/home/dest-delhi.png',
    pastel: '#F3EDE6',
  },
  {
    id: 'noida',
    city: 'Noida',
    slug: 'noida',
    emoji: '🏢',
    tagline: 'Modern work-friendly stays',
    stays: 198,
    image: '/images/home/dest-noida.png',
    pastel: '#EEF2F0',
  },
  {
    id: 'weekend',
    city: 'Weekend Escapes',
    slug: 'greater-noida',
    emoji: '🌿',
    tagline: 'Hidden gems nearby',
    stays: 156,
    image: '/images/home/dest-weekend.png',
    pastel: '#EDF3EA',
  },
];

export const TRUST_CHIPS = [
  {
    id: 'fees',
    title: 'Zero Guest Fees',
    sub: 'Book at host-listed prices',
    icon: 'percent' as const,
  },
  {
    id: 'direct',
    title: 'Direct Host Communication',
    sub: 'Human-first, no middlemen',
    icon: 'chat' as const,
  },
  {
    id: 'verified',
    title: 'Verified Properties',
    sub: 'Quality-reviewed listings',
    icon: 'shield' as const,
  },
  {
    id: 'pricing',
    title: 'Transparent Pricing',
    sub: 'Total shown before you inquire',
    icon: 'tag' as const,
  },
] as const;
