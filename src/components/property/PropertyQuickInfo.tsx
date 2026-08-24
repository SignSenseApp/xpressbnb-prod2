import { Users, Bed, Bath } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Property } from '../../lib/database.types';
import { getAmenityIcon, listPropertyAmenities } from '../../lib/amenities';

interface PropertyQuickInfoProps {
  property: Property;
  className?: string;
}

const QUICK_AMENITY_MATCHERS = [
  { match: /wifi|wi-fi/i, label: 'Wi-Fi' },
  { match: /kitchen/i, label: 'Kitchen' },
  { match: /air conditioning|ac\b/i, label: 'AC' },
  { match: /washer|washing/i, label: 'Washing machine' },
  { match: /parking/i, label: 'Parking' },
  { match: /workspace|desk/i, label: 'Workspace' },
] as const;

type QuickAmenityChip = {
  label: (typeof QUICK_AMENITY_MATCHERS)[number]['label'];
  icon: LucideIcon;
};

/**
 * Horizontal quick-facts strip — guests, beds, baths, and top amenities
 * that exist on the property row (no invented data).
 */
export default function PropertyQuickInfo({ property, className = '' }: PropertyQuickInfoProps) {
  const amenities = listPropertyAmenities(property.amenities);
  const quickAmenities = QUICK_AMENITY_MATCHERS.flatMap(({ match, label }): QuickAmenityChip[] => {
    const found = amenities.find((a) => match.test(a));
    if (!found) return [];
    return [{ label, icon: getAmenityIcon(found) }];
  });

  const stats = [
    {
      key: 'guests',
      icon: Users,
      label: `${property.max_guests} ${property.max_guests === 1 ? 'guest' : 'guests'}`,
    },
    {
      key: 'bedrooms',
      icon: Bed,
      label: `${property.bedrooms} ${property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`,
    },
    {
      key: 'baths',
      icon: Bath,
      label: `${property.bathrooms} ${property.bathrooms === 1 ? 'bath' : 'baths'}`,
    },
  ];

  const items = [
    ...stats.map((s) => ({ key: s.key, icon: s.icon, label: s.label })),
    ...quickAmenities.map((a) => ({ key: a.label, icon: a.icon, label: a.label })),
  ];

  return (
    <ul
      className={`flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2.5 text-[13px] sm:text-sm text-xpx-muted ${className}`}
      aria-label="Property quick facts"
    >
      {items.map(({ key, icon: Icon, label }) => (
        <li key={key} className="inline-flex items-center gap-1.5 min-w-0">
          <Icon className="w-4 h-4 shrink-0 text-xpx-subtle" aria-hidden />
          <span className="truncate">{label}</span>
        </li>
      ))}
    </ul>
  );
}
