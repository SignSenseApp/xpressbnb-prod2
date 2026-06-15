import { useCallback, useSyncExternalStore } from 'react';
import type { Property } from '../lib/database.types';
import {
  getSavedListingsSnapshot,
  isListingSaved,
  removeSavedListing,
  saveListing,
  snapshotFromProperty,
  snapshotFromStayLike,
  subscribeSavedListings,
  toggleSavedListing,
  type SavedListingSnapshot,
} from '../lib/savedListingsStorage';

export function useSavedListings() {
  const savedList = useSyncExternalStore(
    subscribeSavedListings,
    getSavedListingsSnapshot,
    () => [] as SavedListingSnapshot[],
  );

  const isSaved = (propertyId: string) => isListingSaved(propertyId);

  const toggleFromProperty = useCallback((property: Property) => {
    return toggleSavedListing(snapshotFromProperty(property));
  }, []);

  const toggleFromStay = useCallback(
    (stay: {
      id: string;
      name: string;
      city?: string;
      images?: string[];
      pricePerNight: number;
      rating?: number;
      isVerified?: boolean;
    }) => toggleSavedListing(snapshotFromStayLike(stay)),
    [],
  );

  const toggleSnapshot = useCallback((snapshot: SavedListingSnapshot) => {
    return toggleSavedListing(snapshot);
  }, []);

  const remove = useCallback((propertyId: string) => {
    removeSavedListing(propertyId);
  }, []);

  const save = useCallback((property: Property) => {
    saveListing(snapshotFromProperty(property));
  }, []);

  return {
    savedList,
    savedCount: savedList.length,
    isSaved,
    toggleFromProperty,
    toggleFromStay,
    toggleSnapshot,
    remove,
    save,
  };
}
