import type { Property } from './database.types';

/** Properties with finite lat/lng suitable for Google Maps markers. */
export function isMappableProperty(
  property: Pick<Property, 'latitude' | 'longitude'>,
): property is Property & { latitude: number; longitude: number } {
  return (
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude)
  );
}

export function mappableProperties(
  properties: Property[],
): Array<Property & { latitude: number; longitude: number }> {
  return properties.filter(isMappableProperty);
}
