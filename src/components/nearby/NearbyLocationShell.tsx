import { lazy, Suspense } from 'react';
import { NearbyLocationProvider } from '../../contexts/NearbyLocationContext';

const LocationPermissionSheet = lazy(() => import('./LocationPermissionSheet'));

type NearbyLocationShellProps = {
  children: React.ReactNode;
  /** Disable auto-prompt on host/ops routes */
  autoPrompt?: boolean;
};

/**
 * App-level shell: context + permission sheet for guest marketplace routes.
 */
export default function NearbyLocationShell({
  children,
  autoPrompt = true,
}: NearbyLocationShellProps) {
  return (
    <NearbyLocationProvider autoPrompt={autoPrompt}>
      {children}
      <Suspense fallback={null}>
        <LocationPermissionSheet />
      </Suspense>
    </NearbyLocationProvider>
  );
}
