import { createContext, useContext, type ReactNode } from 'react';
import { useNearbyStays, type UseNearbyStaysReturn } from '../hooks/useNearbyStays';

const NearbyLocationContext = createContext<UseNearbyStaysReturn | null>(null);

export function NearbyLocationProvider({
  children,
  autoPrompt = true,
}: {
  children: ReactNode;
  autoPrompt?: boolean;
}) {
  const value = useNearbyStays({ autoPrompt });
  return (
    <NearbyLocationContext.Provider value={value}>{children}</NearbyLocationContext.Provider>
  );
}

export function useNearbyLocation(): UseNearbyStaysReturn {
  const ctx = useContext(NearbyLocationContext);
  if (!ctx) {
    throw new Error('useNearbyLocation must be used within NearbyLocationProvider');
  }
  return ctx;
}

/** Safe hook for optional integration — returns null outside provider. */
export function useNearbyLocationOptional(): UseNearbyStaysReturn | null {
  return useContext(NearbyLocationContext);
}
