import { lazy, Suspense, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import type { Property } from '../../lib/database.types';
import ConversionPropertyCard from '../ConversionPropertyCard';
import { trackXpressEvent } from '../../lib/analytics';

const MapView = lazy(() => import('../MapView'));

type NearbyMapDiscoveryProps = {
  properties: Property[];
  distanceByPropertyId?: Record<string, number>;
  userCity?: string | null;
  onClose: () => void;
};

/**
 * Airbnb-style map discovery — split desktop, bottom sheet mobile.
 */
export default function NearbyMapDiscovery({
  properties,
  distanceByPropertyId,
  userCity,
  onClose,
}: NearbyMapDiscoveryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = properties.find((p) => p.id === selectedId) ?? null;

  const handlePropertyClick = useCallback((property: Property) => {
    setSelectedId(property.id);
    trackXpressEvent('map_property_clicked', {
      property_id: property.id,
      city: property.city,
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row bg-white" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
        aria-label="Close map"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Cards — left on desktop, bottom sheet on mobile */}
      <div
        className="order-2 lg:order-1 lg:w-[min(480px,42vw)] lg:shrink-0 border-t lg:border-t-0 lg:border-r overflow-y-auto max-h-[45vh] lg:max-h-none flex-1 lg:flex-none"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-extrabold text-xpx-text">
            {userCity ? `Stays near ${userCity}` : 'Explore on map'}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {properties.slice(0, 20).map((property) => (
              <div
                key={property.id}
                onMouseEnter={() => setSelectedId(property.id)}
                className={
                  selectedId === property.id
                    ? 'ring-2 ring-[#059669] rounded-2xl'
                    : ''
                }
              >
                <ConversionPropertyCard
                  property={property}
                  className="max-w-none w-full"
                  nearbyDistanceKm={distanceByPropertyId?.[property.id]}
                  nearbySource="map_discovery"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="order-1 lg:order-2 flex-1 min-h-[55vh] lg:min-h-0 relative">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-xpx-muted">
              Loading map…
            </div>
          }
        >
          <MapView
            properties={properties}
            selectedProperty={selected}
            onPropertyClick={handlePropertyClick}
          />
        </Suspense>
      </div>
    </div>
  );
}
