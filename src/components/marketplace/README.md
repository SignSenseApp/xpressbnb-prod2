# Marketplace Architecture (FROZEN — Phase MP-Freeze)

## Locked surfaces

These browsing experiences must **never** receive editorial card styling or story-first layouts:

- Homepage featured stays (`HomepageBelowFold`, `FeaturedStaysCarousel`)
- City listing pages (`CityListingPage`, `RishikeshStaysPage`)
- Search / trip results (hero search → city routes)
- Saved listings (`SavedListingsPage`)
- Nearby map cards (`NearbyMapDiscovery`)
- Personalized home feed carousels (`PersonalizedHomeFeed`, `NearbyStaysSection`)

## Frozen presentation components

| Component | Role |
|-----------|------|
| `ConversionPropertyCard` | Comparison-first property card (price, save, host, specs, score) |
| `FeaturedStaysCarousel` | Marketplace carousel for listing grids |
| `ListingPropertyCardSkeleton` | Layout-matched loading shell |
| `PropertyCardGallery` | In-card image swipe (marketplace only) |
| `PropertyCardHostRow` | Host metadata on marketplace cards |

**Do not** redesign, strip metadata, or replace these with editorial components.

## Shared logic (allowed)

- `lib/publicListings.ts` — inventory fetch
- `lib/propertyImages.ts` — responsive URLs
- `lib/propertyPrefetch.ts` — navigation warm-up
- `lib/nearbyRanking.ts` — distance sort

Logic may be shared. **Visual components may not** cross between marketplace and editorial.

## Editorial work belongs elsewhere

All luxury / magazine experimentation is restricted to `/property/*`:

- `components/property/editorial/` — discovery journal modules
- `components/property/PropertyEditorialIntro.tsx` — opening spread
- `components/editorial/EditorialLayouts.tsx` — story layouts
- Property hero, concierge sidebar styling on the property page

Editorial surfaces must **never** import `ConversionPropertyCard`.
