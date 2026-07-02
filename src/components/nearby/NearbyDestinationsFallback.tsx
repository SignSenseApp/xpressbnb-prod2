/**
 * Property-page destination fallback with editorial layout.
 * Also used on homepage nearby when inventory is thin — shared regression risk (MP-Freeze).
 * Marketplace listing grids must continue using ConversionPropertyCard.
 */
import type { NearestServicedCity } from '../../lib/nearbyInventory';
import { formatDistanceKm } from '../../lib/nearbyInventory';
import {
  EditorialChapter,
  EditorialEyebrow,
  EditorialHeadline,
  EditorialProse,
  OffsetLeft,
  PortraitComposition,
} from '../editorial/EditorialLayouts';

type NearbyDestinationsFallbackProps = {
  title?: string;
  subtitle?: string;
  nearestCities: NearestServicedCity[];
  onExploreCity: (slug: string) => void;
};

export default function NearbyDestinationsFallback({
  title = 'More places to discover',
  subtitle = "We're curating more remarkable places nearby.",
  nearestCities,
  onExploreCity,
}: NearbyDestinationsFallbackProps) {
  if (nearestCities.length === 0) return null;

  return (
    <EditorialChapter aria-labelledby="discovery-destinations-heading">
      <OffsetLeft>
        <EditorialEyebrow>The wider map</EditorialEyebrow>
        <EditorialHeadline id="discovery-destinations-heading" size="lg">
          {title}
        </EditorialHeadline>
        <EditorialProse className="mt-6 text-base">{subtitle}</EditorialProse>
      </OffsetLeft>
      <PortraitComposition className="xpx-ed-portrait-composition--pair mt-12">
        {nearestCities.map((city) => (
          <button
            key={city.slug}
            type="button"
            onClick={() => onExploreCity(city.slug)}
            className="xpx-editorial-destination-card group w-full text-left"
          >
            <div className="xpx-editorial-destination-media">
              {city.exploreImage ? (
                <img
                  src={city.exploreImage}
                  alt=""
                  className="xpx-editorial-destination-image"
                  loading="lazy"
                />
              ) : (
                <div className="xpx-editorial-destination-image xpx-editorial-destination-image--empty" />
              )}
            </div>
            <div className="xpx-editorial-destination-body">
              <p className="xpx-editorial-destination-distance">
                {formatDistanceKm(city.distanceKm)} away
              </p>
              <p className="xpx-editorial-destination-city">{city.city}</p>
              {city.tagline && (
                <p className="xpx-editorial-destination-tagline">{city.tagline}</p>
              )}
              <span className="xpx-editorial-destination-link">Open the collection</span>
            </div>
          </button>
        ))}
      </PortraitComposition>
    </EditorialChapter>
  );
}
