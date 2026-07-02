/**
 * Property-page editorial discovery — `/property/*` only.
 * Do not import from marketplace browsing surfaces.
 */

export { default as DiscoveryPropertyWindow } from './DiscoveryPropertyWindow';
export type { DiscoveryWindowVariant } from './DiscoveryPropertyWindow';

export {
  DiscoveryCuratedCollection,
  DiscoveryEditorialPause,
  DiscoveryFeatureChapter,
  DiscoveryJournalPause,
  DiscoveryJournalSkeleton,
  DiscoveryPortraitPair,
  DiscoveryWeekendSelection,
  DiscoveryWideChapter,
} from './EditorialDiscoveryModules';
