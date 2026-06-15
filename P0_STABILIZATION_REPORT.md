# XpressBNB P0 Stabilization Report

> Date: 2026-06-15  
> Scope: Build/run safety only — no new features, no saved-listings work, no payment changes.

---

## 1. Baseline Status

| Command           | Result Before Fix | Notes |
| ----------------- | ----------------- | ----- |
| npm run build     | **Pass**          | Vite production build succeeded (~27s). Chunk size warning only. |
| npm run lint      | **Pass**          | 0 errors, 16 warnings (react-hooks/exhaustive-deps, react-refresh). |
| npm run typecheck | **Fail**          | **109** TypeScript errors (pre-existing debt; `tsc` not in build pipeline). |

**Package manager:** npm (`package.json` scripts confirmed: `dev`, `build`, `preview`, `typecheck`, `lint`).

---

## 2. Error Classification

| Category | Errors Found | Blocking? | Files |
| -------- | ------------ | --------- | ----- |
| Build-blocking errors | 0 | No | — |
| Runtime-crash errors | 2 issues | **Yes (latent)** | `PropertyReviews.tsx` (query to dropped `reviews` table), `MapView.tsx` / `PropertyMapView.tsx` (null lat/lng) |
| Import/export errors | 0 | No | — |
| Environment variable issues | 0 build-time | Partial runtime | `supabase.ts` throws if `VITE_SUPABASE_*` missing (required); Maps/Razorpay public keys already degrade gracefully |
| TypeScript-only debt | ~109 | No (build) | `PropertyPage.tsx`, `AdminDashboard.tsx`, `BookingForm.tsx`, Json/null narrowing across legacy files |
| Lint-only issues | 16 warnings | No | Host dashboard hooks, `AuthContext`, `MapView` deps |
| Dead links / product gaps | Several | No | `/api/calendar/*.ics`, mock support/import, orphaned `AdminDashboard.tsx` |

---

## 3. Fixes Applied

| File | Issue | Fix | Why Safe |
| ---- | ----- | --- | -------- |
| `src/components/property/PropertyReviews.tsx` | Queried dropped `reviews` table — always failed at runtime, reviews never loaded | Switched to `external_reviews` with field mapping to existing `Review` UI shape | Uses real schema from `database.types.ts`; same UI, no booking/auth changes |
| `src/lib/propertyCoords.ts` | **Created** — shared coord guard | `isMappableProperty` / `mappableProperties` helpers | Pure filter; no API/schema changes |
| `src/components/MapView.tsx` | Null `latitude`/`longitude` caused invalid map centers and marker positions | Plot only mappable properties; fallback pins skip invalid coords | City listing map degrades instead of NaN positions |
| `src/components/PropertyMapView.tsx` | Map init with null coords | Skip init + show “coordinates not available” fallback | Property page no longer passes invalid coords to Google Maps |

---

## 4. Files Changed

- `src/lib/propertyCoords.ts` (new)
- `src/components/property/PropertyReviews.tsx`
- `src/components/MapView.tsx`
- `src/components/PropertyMapView.tsx`
- `P0_STABILIZATION_REPORT.md` (this file)

**Not changed:** booking flow, OTP, WhatsApp, auth, host dashboard, Razorpay, migrations, saved listings code (left as-is from prior work), UI redesign.

---

## 5. Business Flow Safety

| Flow | Touched? |
| ---- | -------- |
| Guest inquiry form | **No** |
| OTP verification | **No** |
| Booking row creation | **No** |
| Confirmation page | **No** |
| WhatsApp host link | **No** |
| AuthContext | **No** |
| Host dashboard inquiries | **No** |
| Host subscription Razorpay | **No** |
| Guest Razorpay disabled (410) | **No** |

---

## 6. Final Command Results

| Command           | Result After Fix | Notes |
| ----------------- | ---------------- | ----- |
| npm run build     | **Pass**         | 8.01s; bundle ~986 KB |
| npm run lint      | **Pass**         | 0 errors, 16 warnings (unchanged) |
| npm run typecheck | **Fail**         | **95 errors** (down from 109) |

### Typecheck delta

- **Baseline:** 109 errors  
- **After fix:** 95 errors  
- **Fixed (14):** `PropertyReviews.tsx` (legacy `reviews` table query + types), `MapView.tsx` (null lat/lng TS errors)  
- **Remaining:** Unrelated legacy debt — `PropertyPage.tsx` Json/null, `AdminDashboard.tsx`, `BookingForm.tsx`, `NewHomepage.tsx` image indexing, `host/ReviewsPage.tsx`, etc. None block `npm run build`.

---

## 7. Remaining Known Issues

### Build blockers remaining

None — `npm run build` passes.

### Runtime blockers remaining

- App still **requires** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` at startup (`src/lib/supabase.ts` throws if missing). Documented external setup dependency, not a code defect.
- `PropertyReviews` depends on `external_reviews` RLS allowing public read for property pages — verify in Supabase if reviews still empty in production.

### TypeScript debt remaining

~95 errors across legacy modules. Vite does not run `tsc` on build. Recommend incremental fixes starting with `PropertyPage.tsx` and `BookingForm.tsx` when those files are next touched.

### Product gaps not touched

- Saved listings (deferred per milestone scope)
- Calendar ICS export dead link
- Mock support/import flows
- Orphaned admin panel
- Guest dashboard
- `.env.example`

---

## 8. Recommended Next Milestone

**Implement Saved Listings mobile nav flow** — build passes and the two latent runtime issues on property/city map views are patched; safe to proceed with the saved-listings milestone already scoped in `SAVED_LISTINGS_IMPLEMENTATION_REPORT.md` (or add `.env.example` first if onboarding is the priority).
