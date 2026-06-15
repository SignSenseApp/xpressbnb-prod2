import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Property } from '../lib/database.types';
import {
  getSavedListingsServerSnapshot,
  getSavedListingsStoreSnapshot,
  isListingSaved,
  parseSavedListingsFromStore,
  removeSavedListing,
  saveListing,
  snapshotFromProperty,
  snapshotFromStayLike,
  subscribeSavedListings,
  toggleSavedListing,
  type SavedListingSnapshot,
} from '../lib/savedListingsStorage';

export function useSavedListings() {
  const storeSnapshot = useSyncExternalStore(
    subscribeSavedListings,
    getSavedListingsStoreSnapshot,
    getSavedListingsServerSnapshot,
  );

  const savedList = useMemo(
    () => parseSavedListingsFromStore(storeSnapshot),
    [storeSnapshot],
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
