/** Shared dynamic imports — AppRouter lazy + hero search prefetch resolve to one Vite chunk each. */

let cityListingChunkPromise: Promise<unknown> | null = null;
let rishikeshStaysChunkPromise: Promise<unknown> | null = null;

export function loadCityListingPageModule() {
  return import('../pages/CityListingPage');
}

export function loadRishikeshStaysPageModule() {
  return import('../pages/RishikeshStaysPage');
}

/** Warm stays listing route chunk before navigation — no listing API calls. */
export function prefetchStaysListingRouteChunk(citySlug: string): void {
  const slug = citySlug.trim().toLowerCase();
  if (slug === 'rishikesh') {
    if (rishikeshStaysChunkPromise) return;
    rishikeshStaysChunkPromise = loadRishikeshStaysPageModule().catch(() => {
      rishikeshStaysChunkPromise = null;
    });
    return;
  }
  if (cityListingChunkPromise) return;
  cityListingChunkPromise = loadCityListingPageModule().catch(() => {
    cityListingChunkPromise = null;
  });
}
