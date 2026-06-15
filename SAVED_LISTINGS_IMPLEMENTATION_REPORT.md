# Saved Listings Implementation Report

> Date: 2026-06-15  
> Milestone: Production-safe Saved Listings for mobile bottom nav (anonymous, no login).

---

## 1. Audit Summary

* **Existing saved/wishlist code found:**
  * `MobileBottomNav.tsx` — Saved tab previously pointed to `/` (dead). Now routes to `/saved`.
  * `ConversionPropertyCard.tsx` — had decorative heart; now wired to `SaveListingButton`.
  * `NewHomepage.tsx` `FeaturedCard` — static heart; now functional save toggle.
  * `RishikeshStaysPage.tsx` — had ephemeral `useState<Set>`; now uses shared localStorage hook (DB rows only).
  * `PropertyPage.tsx` — inline Save button beside Share.
  * `rishikesh_saved_properties` Supabase table exists in migrations/types but is **not used** in frontend (session_id pattern; would need auth/session sync).
  * `bookingConfirmationStorage.ts` — unrelated sessionStorage for booking confirmations (contains guest email; not reused).

* **Mobile bottom nav file:** `src/components/MobileBottomNav.tsx`

* **Saved route before changes:** `/` (same as Home — tab was dead)

* **Listing/property components used:**
  | Surface | Component | Save UI |
  | ------- | --------- | ------- |
  | Homepage featured rows | `FeaturedCard` in `NewHomepage.tsx` | `SaveListingButton` (left align) |
  | City listings `/stays/:city` | `ConversionPropertyCard` | `SaveListingButton` |
  | Rishikesh page | `StayCard` | `SaveListingButton` (DB stays only) |
  | Property detail | `PropertyPage.tsx` | `SaveListingButton` (inline toolbar) |
  | Saved page | `ConversionPropertyCard` | inherits heart from card |

* **Stable listing identifier used:** Property UUID (`properties.id`) — used in routes as `/property/:id`.

* **Storage approach chosen:** `localStorage` key `xpressbnb_saved_listings` (with one-time migration from legacy `xpressbnb_saved_listings_v1`).

* **Why this approach was chosen:**
  * Guest accounts are not built; anonymous device-local persistence is required.
  * No new Supabase migration or RLS changes.
  * `rishikesh_saved_properties` would require session management without guest auth.
  * Matches existing device-local pattern (`bookingConfirmationStorage.ts`) but stores only public listing metadata — no PII.

---

## 2. Files Changed

| File | Change Made | Why Safe |
| ---- | ----------- | -------- |
| `src/lib/savedListingsStorage.ts` | localStorage CRUD, snapshots, subscribe, legacy key migration | No server writes; no PII; public listing fields only |
| `src/hooks/useSavedListings.ts` | `useSyncExternalStore` hook for cross-component sync | Read-only Supabase usage elsewhere; local state only |
| `src/components/SaveListingButton.tsx` | Reusable heart/save toggle (`card` + `inline` variants) | `stopPropagation` on cards; no booking/auth coupling |
| `src/pages/SavedListingsPage.tsx` | `/saved` page: grid, empty state, unavailable section | Refresh via existing anon Supabase client; graceful error handling |
| `src/AppRouter.tsx` | Route `/saved` → `SavedListingsPage` | Minimal addition to custom router |
| `src/components/MobileBottomNav.tsx` | Saved tab → `/saved`; active tab state | Nav-only change |
| `src/components/ConversionPropertyCard.tsx` | Functional heart | Replaces non-functional button |
| `src/components/NewHomepage.tsx` | Functional heart on featured cards | Same pattern |
| `src/pages/RishikeshStaysPage.tsx` | Shared save state; removed local `Set` | Only `isFromDb` stays get save button |
| `src/pages/PropertyPage.tsx` | Inline Save in toolbar | Does not touch booking sidebar/form |

---

## 3. User Flow Implemented

* **How user saves a listing:** Tap heart on listing card (homepage, city grid, Rishikesh DB stay) or **Save** on property page. Minimal snapshot written to localStorage.

* **How user unsaves a listing:** Tap filled heart / Save again, or **Remove** on unavailable rows on `/saved`.

* **How persistence works:** Key `xpressbnb_saved_listings`. Custom event + `storage` event sync all mounted components. Survives refresh. Device-local only.

* **How Saved tab/page works:** Bottom nav **Saved** → `/saved`. Page fetches live rows by saved UUIDs, renders `ConversionPropertyCard` grid. Inactive/removed IDs listed separately.

* **Empty state behavior:** “No saved stays yet”, short explanation, CTAs to **Explore cities** (`/explore`) and **Browse Rishikesh stays** (`/stays/rishikesh`).

* **Missing/deleted saved listing behavior:** Shown under “No longer available” with Remove action; page does not crash if Supabase refresh fails.

---

## 4. Data & Security

* **No PII stored** — only property UUID + public fields (title, city, image URL, price, rating, verified flag).
* **No secrets touched** — no `.env` changes.
* **No payment behavior changed** — guest Razorpay remains disabled; host subscription untouched.
* **No Supabase migration added** — read-only refresh query on `properties`.
* **Works without login** — no auth gate on save or `/saved`.

---

## 5. Build/Lint/Typecheck Results

| Command           | Before | After | Notes |
| ----------------- | ------ | ----- | ----- |
| npm run build     | Pass   | **Pass** | ~9s; chunk size warning only |
| npm run lint      | Pass (0 errors, 16 warnings) | **Pass** (0 errors, 16 warnings) | Unchanged warnings |
| npm run typecheck | Fail (95 errors) | **Fail (95 errors)** | No new errors in saved-listings files |

---

## 6. Acceptance Criteria Checklist

* Saved bottom nav works — **Pass**
* Save/unsave works — **Pass**
* Refresh persistence works — **Pass**
* Empty state works — **Pass**
* Public routes still work — **Pass**
* Booking untouched — **Pass**
* OTP untouched — **Pass**
* WhatsApp untouched — **Pass**
* Payments untouched — **Pass**
* No secrets committed — **Pass**
* No broad redesign/refactor — **Pass**

---

## 7. Remaining Known Issues

* **TypeScript debt:** ~95 legacy errors (Json/null narrowing in `PropertyPage`, `BookingForm`, etc.) — unrelated to saved listings.
* **Product gaps:** Saved listings are device-local only (no cross-device sync without guest accounts). Rishikesh curated fallback stays cannot be saved (no real UUID). Calendar ICS dead link, admin panel, `.env.example` not addressed.
* **Saved-listings limitations:** If user clears browser data, saved list is lost. Supabase refresh on `/saved` requires network; snapshots used only for unavailable messaging.

---

## 8. Recommended Next Milestone

**Add `.env.example`** documenting required `VITE_*` variables and Supabase edge-function secret names (values omitted) so developers can onboard without hunting through code.
