/**
 * EDITORIAL SURFACE — property-page discovery journal only.
 *
 * This component is editorial UI. Do not convert it into marketplace UI.
 * Editorial discovery belongs exclusively to `/property/*`.
 *
 * Marketplace browsing (homepage, city pages, search, saved, map) must use
 * `ConversionPropertyCard` + `FeaturedStaysCarousel` — see `marketplace/README.md`.
 */

import type { Property } from '../../../lib/database.types';
import type { DiscoveryChapterCopy } from '../../../lib/discoveryEditorial';
import {
  CenteredEssay,
  CollectionRow,
  EditorialChapter,
  EditorialEyebrow,
  EditorialHeadline,
  FullBleed,
  LandscapeComposition,
  OffsetLeft,
  OffsetRight,
  PortraitComposition,
  PullQuote,
  QuietPause,
  WideColumn,
} from '../../editorial/EditorialLayouts';
import DiscoveryPropertyWindow from './DiscoveryPropertyWindow';

type ChapterHeaderProps = {
  copy: DiscoveryChapterCopy;
  id: string;
  layout?: 'offset' | 'wide' | 'center';
};

function DiscoveryChapterHeader({ copy, id, layout = 'offset' }: ChapterHeaderProps) {
  const layoutClass =
    layout === 'wide'
      ? 'xpx-ed-discovery-header--wide'
      : layout === 'center'
        ? 'xpx-ed-discovery-header--center'
        : 'xpx-ed-discovery-header--offset';

  return (
    <header className={`xpx-ed-chapter-intro ${layoutClass}`}>
      <EditorialEyebrow>{copy.eyebrow}</EditorialEyebrow>
      <EditorialHeadline id={id} size={layout === 'center' ? 'lg' : 'display'}>
        {copy.headline}
      </EditorialHeadline>
      {copy.lead && <p className="xpx-ed-chapter-lead">{copy.lead}</p>}
    </header>
  );
}

export function DiscoveryJournalPause({ children }: { children: string }) {
  return <PullQuote size="hero">{children}</PullQuote>;
}

export function DiscoveryFeatureChapter({
  property,
  copy,
  id = 'discovery-feature',
}: {
  property: Property;
  copy: DiscoveryChapterCopy;
  id?: string;
}) {
  return (
    <EditorialChapter aria-labelledby={id}>
      <OffsetLeft>
        <DiscoveryChapterHeader copy={copy} id={id} layout="offset" />
      </OffsetLeft>
      <FullBleed>
        <LandscapeComposition>
          <DiscoveryPropertyWindow
            property={property}
            variant="feature"
            headingLevel="h3"
            ctaLabel="Open this story"
          />
        </LandscapeComposition>
      </FullBleed>
    </EditorialChapter>
  );
}

export function DiscoveryPortraitPair({
  properties,
  copy,
  nearbyDistanceById,
  nearbySource,
  id = 'discovery-portrait-pair',
}: {
  properties: [Property, Property] | [Property];
  copy: DiscoveryChapterCopy;
  nearbyDistanceById?: Record<string, number>;
  nearbySource?: string;
  id?: string;
}) {
  return (
    <EditorialChapter aria-labelledby={id}>
      <OffsetRight>
        <DiscoveryChapterHeader copy={copy} id={id} layout="wide" />
      </OffsetRight>
      <PortraitComposition className="xpx-ed-portrait-composition--pair">
        {properties.map((property) => (
          <DiscoveryPropertyWindow
            key={property.id}
            property={property}
            variant="portrait"
            nearbyDistanceKm={nearbyDistanceById?.[property.id]}
            nearbySource={nearbySource}
            ctaLabel="View stay"
          />
        ))}
      </PortraitComposition>
    </EditorialChapter>
  );
}

export function DiscoveryWideChapter({
  property,
  copy,
  nearbyDistanceKm,
  nearbySource,
  id = 'discovery-wide',
}: {
  property: Property;
  copy: DiscoveryChapterCopy;
  nearbyDistanceKm?: number;
  nearbySource?: string;
  id?: string;
}) {
  return (
    <EditorialChapter aria-labelledby={id}>
      <WideColumn>
        <DiscoveryChapterHeader copy={copy} id={id} layout="center" />
      </WideColumn>
      <FullBleed>
        <DiscoveryPropertyWindow
          property={property}
          variant="wide"
          nearbyDistanceKm={nearbyDistanceKm}
          nearbySource={nearbySource}
          ctaLabel="Continue reading"
        />
      </FullBleed>
    </EditorialChapter>
  );
}

export function DiscoveryWeekendSelection({
  properties,
  copy,
  nearbyDistanceById,
  nearbySource,
  id = 'discovery-weekend',
}: {
  properties: Property[];
  copy: DiscoveryChapterCopy;
  nearbyDistanceById?: Record<string, number>;
  nearbySource?: string;
  id?: string;
}) {
  const trio = properties.slice(0, 3);
  if (trio.length === 0) return null;

  return (
    <EditorialChapter aria-labelledby={id}>
      <CenteredEssay>
        <DiscoveryChapterHeader copy={copy} id={id} layout="center" />
      </CenteredEssay>
      <CollectionRow className="xpx-ed-collection-row xpx-discovery-weekend-grid">
        {trio.map((property) => (
          <DiscoveryPropertyWindow
            key={property.id}
            property={property}
            variant="quiet"
            nearbyDistanceKm={nearbyDistanceById?.[property.id]}
            nearbySource={nearbySource}
            ctaLabel="Open"
          />
        ))}
      </CollectionRow>
    </EditorialChapter>
  );
}

export function DiscoveryCuratedCollection({
  properties,
  copy,
  nearbyDistanceById,
  nearbySource,
  id = 'discovery-collection',
}: {
  properties: Property[];
  copy: DiscoveryChapterCopy;
  nearbyDistanceById?: Record<string, number>;
  nearbySource?: string;
  id?: string;
}) {
  if (properties.length === 0) return null;

  return (
    <EditorialChapter aria-labelledby={id}>
      <OffsetLeft>
        <DiscoveryChapterHeader copy={copy} id={id} layout="offset" />
      </OffsetLeft>
      <ul className="xpx-discovery-collection">
        {properties.map((property) => (
          <li key={property.id}>
            <DiscoveryPropertyWindow
              property={property}
              variant="quiet"
              nearbyDistanceKm={nearbyDistanceById?.[property.id]}
              nearbySource={nearbySource}
              ctaLabel="Open"
            />
          </li>
        ))}
      </ul>
    </EditorialChapter>
  );
}

export function DiscoveryJournalSkeleton() {
  return (
    <div className="xpx-discovery-journal" aria-hidden>
      <div className="xpx-ed-chapter">
        <div className="xpx-discovery-skeleton-line xpx-discovery-skeleton-line--short" />
        <div className="xpx-discovery-skeleton-line xpx-discovery-skeleton-line--title" />
        <div className="xpx-discovery-feature-placeholder" />
      </div>
      <div className="xpx-ed-quiet-pause">
        <div className="xpx-discovery-skeleton-line" />
      </div>
      <div className="xpx-ed-portrait-composition xpx-ed-portrait-composition--pair">
        <div className="xpx-discovery-portrait-placeholder" />
        <div className="xpx-discovery-portrait-placeholder" />
      </div>
    </div>
  );
}

export { QuietPause as DiscoveryEditorialPause };
