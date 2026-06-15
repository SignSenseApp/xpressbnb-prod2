# XpressBNB Recovery Report

> Generated: 2026-06-13  
> Purpose: Rebuild working context after loss of prior chat/history.  
> Source of truth: **this repository only** — no invented requirements.

---

## Project summary

**XpressBNB** (`xpressbnb.com` / `www.xpressbnb.com`) is an India-focused vacation-rental marketplace emphasizing **couple-friendly, hourly, and full-day stays** in Delhi NCR and select destinations (notably Rishikesh). The product positions itself as a low-commission alternative to OTAs: guests submit **inquiries** (with phone OTP), hosts accept/reject/counter-offer, then payment is coordinated **directly** (WhatsApp, UPI, cash) rather than through platform escrow.

The codebase lives under `d:/xpx/project/`. The workspace root `d:/xpx/` also contains MCP config (`.mcp.json`) and deploy scratch artifacts; the app itself is entirely in `project/`.

**Business model (from code/copy):**
- Guest bookings: inquiry-first, 0% commission on guest payouts
- Host revenue: optional **host subscription** (Razorpay) for premium listing features
- Geographic focus: Delhi, Gurgaon, Noida, Greater Noida, Rishikesh (config-driven)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | Custom SPA router (`history.pushState`) — **not** React Router |
| Styling | Tailwind CSS 3 + CSS variables (`--xpx-*` theme) |
| Animation | Framer Motion, Lenis smooth scroll |
| Icons | Lucide React |
| Backend / DB | Supabase (Postgres, Auth, Storage, Edge Functions, RLS) |
| Auth | Supabase Auth (email/password, Google OAuth) |
| Payments | Razorpay — **host subscriptions only**; guest checkout edge function returns 410 |
| OTP / SMS | Twilio Verify (edge functions `send-booking-otp`, `verify-booking-otp`) |
| Notifications | WhatsApp via Meta API (edge function `send-inquiry-notification`) + DB queue |
| Maps | Google Maps JS API (`VITE_GOOGLE_MAPS_API_KEY`) |
| Analytics | Vercel Web Analytics + Speed Insights (cookie-consent gated) |
| PWA | Service worker (`public/sw.js`), install prompt, web manifest |
| Hosting (assumed) | Vercel (`vercel.json` SPA rewrites → `dist/`) |
| Package name | `vite-react-typescript-starter` (legacy Bolt.new scaffold name) |

---

## Current folder structure

```
d:/xpx/
├── .mcp.json                    # MCP server config (workspace level)
└── project/                     # ★ Main application
    ├── docs/                    # Project documentation (this file)
    ├── public/                  # Static assets, favicons, sw.js, site.webmanifest
    ├── scripts/                 # Favicon generator, doc generators (ajeeb/siddhart — unrelated products)
    ├── src/
    │   ├── components/          # Shared UI (homepage, booking, property, premium, auth shells)
    │   ├── config/              # exploreCities, propertyDefaults
    │   ├── contexts/            # AuthContext (user + host profile)
    │   ├── lib/                 # Supabase client, offers, OTP, Razorpay loader, SEO, PWA, types
    │   ├── pages/               # Route-level pages (property, city, host dashboard, auth)
    │   ├── App.tsx              # Root: AppRouter + Vercel analytics
    │   ├── AppRouter.tsx        # ★ Central route table
    │   └── main.tsx             # Entry + AuthProvider
    ├── supabase/
    │   ├── migrations/          # 40+ SQL migrations (schema evolution)
    │   └── functions/           # Edge functions (OTP, Razorpay, WhatsApp)
    ├── dist/                    # Production build output
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── vercel.json
    ├── README.md                # Minimal (Bolt.new link only)
    ├── HOMEPAGE_REDESIGN.md     # Design/feature notes
    └── WEBSITE_AUDIT_AND_STABILIZATION_REPORT.md  # Prior audit (Phase 1 shipped)
```

**Dead / unused modules (present but not routed):**
- `src/components/AdminDashboard.tsx` — client-side password gate, not imported by router
- `src/Router.tsx`, `src/PublicSite.tsx` — legacy
- `src/components/PropertyModal.tsx` — not imported

---

## Existing routes / pages

Routing is manual in `src/AppRouter.tsx` via `window.location.pathname`.

### Public / guest

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `NewHomepage` | Hero search, city sections, testimonials |
| `/?page=about` | `AboutPage` | Query overlay |
| `/?page=blog` | `BlogPage` | Query overlay |
| `/?page=privacy` | `PrivacyPolicyPage` | Query overlay |
| `/?page=terms` | `TermsPage` | Query overlay |
| `/explore` | `ExploreCitiesPage` | City picker (live + coming soon) |
| `/stays/:city` | `CityListingPage` | Filters, map/list toggle |
| `/stays/rishikesh` | `RishikeshStaysPage` | Dedicated Rishikesh UX |
| `/property/:id` | `PropertyPage` | Gallery, booking form, host card |
| `/booking/:id` | `BookingConfirmationPage` | Post-inquiry confirmation |

### Auth

| Path | Screen |
|------|--------|
| `/auth/login` | Login |
| `/auth/register`, `/auth/host-register` | Host registration |
| `/auth/forgot` | Forgot password |
| `/auth/reset-password` | Password recovery (Supabase `PASSWORD_RECOVERY`) |

### Host dashboard

Pattern: `/host/:hostId/dashboard/:page`

| Page slug | Component | In sidebar nav? |
|-----------|-----------|-----------------|
| `overview` | `OverviewPage` | Yes |
| `properties` | `PropertiesPage` | Yes |
| `calendar` | `CalendarPage` | Yes |
| `bookings` | `BookingsPage` | Yes (labeled "Inquiries") |
| `earnings` | `EarningsPage` | Yes |
| `realtime` | `AnalyticsPage` | Yes (labeled "Analytics") |
| `reviews` | `ReviewsPage` | Yes |
| `subscription` | `SubscriptionPage` | Yes |
| `settings` | `SettingsPage` | Yes |
| `support` | `SupportPage` | Yes |
| `calendar-sync` | `CalendarSyncPage` | **No** — reachable via Overview quick link or direct URL |
| `import` | `ImportPage` | **No** — reachable via Overview quick link or direct URL |

**Auth redirect behavior:** Logged-in hosts with a loaded profile are auto-redirected from `/`, `/auth/*`, and `/host` to `/host/:id/dashboard/overview` (except during password reset).

---

## Existing features (implemented in code)

### Guest / public
- Mobile-first homepage with functional hero search → city listing with query params
- City listing pages with filters (couple-friendly, hourly, verified, etc.), sort, map view
- Property detail: gallery, amenities, reviews, booking calendar, promo codes
- **Inquiry-first booking** with guest phone OTP verification
- Offer / discount system (`src/lib/offers.ts`) — static promo codes + property-level discounts
- Booking confirmation page with WhatsApp deep links to host
- SEO meta tags + JSON-LD (`src/lib/seo.ts`, `SEOHead` component)
- Cookie consent banner (analytics opt-in)
- PWA install prompt + service worker
- Mobile bottom nav (Home, Explore, Saved stub, Profile/Dashboard)

### Host
- Registration/login (email + Google OAuth)
- Auto host profile creation via RPC (`ensure_host_profile`) with duplicate handling
- Property CRUD (`PropertyListingForm`, image upload to Supabase Storage)
- Availability calendar (`property_calendar` table, `HostCalendarManager`)
- Inquiry management: accept, reject, counter-offer, WhatsApp guest contact
- Earnings view (filters `payment_status === 'paid'`)
- External reviews display
- Host subscription checkout (Razorpay) + per-property premium upgrades
- Premium feature gating (`has_premium_access` RPC)
- Realtime toast notifications on new inquiries

### Backend (Supabase)
- 40+ migrations defining full schema
- RLS policies for hosts, properties, bookings, subscriptions
- Edge functions: OTP send/verify, host subscription orders, inquiry WhatsApp notifications
- Storage bucket for property images
- DB triggers for notification queue, premium plan sync, catalog visibility

---

## Partially implemented features

| Feature | Status |
|---------|--------|
| **Guest payments (Razorpay)** | Edge function `create-razorpay-order` returns **410 Gone** — intentionally disabled; inquiry/offline payment model |
| **Calendar ICS export** | UI copies `/api/calendar/:id.ics` but **no backend handler** in this Vite SPA |
| **Calendar sync (import)** | Page exists; claims auto-sync but no real iCal import pipeline found |
| **Listing import** | `ImportPage` uses `setTimeout` + random counts — mock only |
| **Support ticketing** | `SupportPage` form uses `setTimeout` — no backend persistence |
| **Saved / wishlist** | Bottom nav "Saved" tab navigates to `/` — no persistence |
| **Live chat** | Support page button is non-functional UI |
| **Premium AI features** | `AIHostCoach`, `SmartPricing`, `DemandForecast`, etc. — synthetic/rule-based data |
| **Admin panel** | `AdminDashboard.tsx` exists with hardcoded client password; **not wired to routes**; `admin_users` table in DB |
| **TypeScript strictness** | `npm run build` passes; `npm run typecheck` reports **~109 errors** (mostly Json/null narrowing in legacy files) |
| **Guest dashboard** | No guest auth role or `/guest/*` routes — guests are anonymous + phone OTP |

---

## Missing features

Features mentioned in industry expectations or partially in docs but **not implemented** as real systems:

- Dedicated **guest account/dashboard** (trip history, saved listings)
- Platform-mediated **guest payment checkout** (deprecated in code)
- Automated **payout** processing (hosts collect directly; `payout_details` JSON field only)
- In-app **messaging/chat** (WhatsApp deep links only)
- Real **support ticket** system
- **Admin panel** integrated into routing with secure server-side auth
- **ICS calendar API** endpoint
- OTA **listing import** (Airbnb/Booking.com)
- DB-backed **promo_codes** admin (codes are hardcoded in `offers.ts`)
- `.env.example` file for onboarding

---

## User roles and dashboard status

| Role | Exists? | Implementation |
|------|---------|----------------|
| **Guest** | Implicit | No login required; books via inquiry + phone OTP; confirmation via `/booking/:id` |
| **Host** | Yes | Supabase auth user → `hosts` row; full dashboard at `/host/:id/dashboard/*` |
| **Admin** | Partial | `admin_users` table; `AdminDashboard.tsx` component orphaned with client-side password |
| **Vendor / Partner** | No | Not found in repo |

---

## Database / schema status

**Primary migration:** `supabase/migrations/20251027083121_create_xpressbnb_schema.sql`  
**Latest migrations (Jun 2026):** host deduplication, RLS recursion fix, `ensure_host_profile` RPC

### Tables (from `src/lib/database.types.ts`)

| Table | Purpose |
|-------|---------|
| `properties` | Listings (geo, pricing, amenities, badges, host_id) |
| `bookings` | Inquiries/reservations (status, payment_status, inquiry_type, dates) |
| `hosts` | Host profiles (KYC, subscription, payout_details) |
| `property_calendar` | Per-date availability |
| `property_subscriptions` | Per-property premium plans |
| `subscriptions` | Host-level subscriptions |
| `external_reviews` | Imported/display reviews |
| `homepage_testimonials` | Marketing testimonials |
| `otp_sessions` / `otp_requests` / `booking_otp_verifications` | OTP flow |
| `booking_notification_queue` | Async WhatsApp notifications |
| `notifications` | In-app notification records |
| `property_analytics`, `view_events` | Analytics |
| `property_growth_scores`, `property_demand_forecast`, `property_price_suggestions`, `property_ab_tests` | Premium intelligence (mostly UI-fed) |
| `import_jobs` | Schema exists; UI import is mock |
| `integration_settings` | External integrations |
| `rishikesh_artist_bookings`, `rishikesh_saved_properties` | Rishikesh-specific features |
| `expert_requests` | Expert/consultation requests |
| `admin_users` | Admin emails |

### RPC functions (sample)
- `ensure_host_profile`, `create_pending_booking`, `create_make_offer_inquiry`
- `consume_booking_inquiry_otp`, `attach_booking_razorpay_order`
- `has_premium_access`, `is_property_available`, `host_contact_json_for_host`

### Edge functions
| Function | Purpose |
|----------|---------|
| `send-booking-otp` | Twilio Verify SMS |
| `verify-booking-otp` | OTP validation + verify token |
| `send-inquiry-notification` | WhatsApp to host/guest |
| `create-host-subscription-order` | Razorpay order for host plan |
| `verify-host-subscription` | Payment signature verification |
| `create-razorpay-order` | **Deprecated** (410) |
| `verify-razorpay-payment` | Guest payment verify (legacy) |

---

## Auth / security status

### Working
- Supabase Auth with session persistence and OAuth hash cleanup
- Host-scoped RLS (recent fixes for recursion Jun 2026)
- Booking OTP rate limiting (edge functions)
- CORS allowlist for production + localhost in edge functions
- Cookie consent before Vercel analytics

### Risks

| Risk | Detail |
|------|--------|
| **Hardcoded admin password** | `AdminDashboard.tsx` contains `ADMIN_PASSWORD` in client source — anyone can read bundle |
| **No `.env.example`** | New developers lack documented required vars |
| **`.env` gitignored but present locally** | Contains live keys; must never commit |
| **Edge functions `verify_jwt: false`** | Some deploy payloads show JWT verification disabled — confirm production config |
| **Guest booking without account** | By design, but limits fraud prevention to OTP |
| **Live Razorpay key in frontend** | `VITE_RAZORPAY_KEY_ID_HOST` is expected (public key) but must pair with server secret in edge functions |
| **Google Maps API key** | Exposed via `VITE_*` — restrict by HTTP referrer in Google Cloud |

### Environment variables (names only — no values)

**Frontend (Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_RAZORPAY_KEY_ID_HOST`

**Supabase Edge Functions (server-side):**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_PHONE_NUMBER`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_DEV_MODE`
- `NOTIFICATION_DISPATCH_SECRET`, `HOST_DASHBOARD_URL`

---

## Known risks

1. **Payment model mismatch** — Copy on some pages may imply Razorpay guest checkout; code explicitly disabled it (inquiry + direct host payment).
2. **Calendar sync URL** — `/api/calendar/*.ics` has no implementation; hosts get broken export links.
3. **Mock modules presented as real** — Import, Support, AI coach, smart pricing.
4. **109 TypeScript errors** — Build succeeds because Vite does not enforce `tsc`; regressions possible.
5. **Dead code accumulation** — AdminDashboard, Router.tsx, PropertyModal increase maintenance cost.
6. **Recent RLS migration** — Jun 2026 fixes suggest production had host login/dashboard breakage; monitor after deploys.
7. **Deploy scratch files** — Many `.mcp-*`, `.deploy-*` JSON files in repo root (gitignored patterns exist but some may linger).

---

## Requirements checklist (from repo/docs search)

| Requirement | Found? | Notes |
|-------------|--------|-------|
| Property listings | **Yes** | Full CRUD + public browse |
| Property management | **Yes** | Host dashboard Properties page |
| Booking/reservation system | **Yes** | Inquiry-first, not instant paid booking |
| Availability calendar | **Yes** | `property_calendar` + host UI |
| Guest dashboard | **No** | Not found — needs confirmation if planned |
| Host dashboard | **Yes** | Full multi-page dashboard |
| Admin panel | **Partial** | DB table + dead component; `scripts/generate-ajeeb-prd.cjs` references unrelated "Ajeeb" admin |
| Payments | **Partial** | Host subscription Razorpay only |
| Payouts | **Partial** | Direct to host; `payout_details` field, no automation |
| Messaging/chat | **Partial** | WhatsApp deep links, not in-app chat |
| Reviews and ratings | **Yes** | Property reviews + external_reviews + host reviews page |
| Notifications | **Yes** | WhatsApp queue, realtime toasts, OTP SMS |
| Analytics/reports | **Partial** | Host Analytics page + Vercel analytics; premium widgets simulated |
| Pricing management | **Partial** | Host sets prices; smart pricing is mock |
| Search and filters | **Yes** | Homepage search, city filters, explore page |
| Maps/location | **Yes** | Google Maps on listing pages (key required) |
| Mobile responsiveness | **Yes** | Mobile-first design, bottom nav, PWA |
| SEO requirements | **Yes** | `seo.ts`, structured data, city canonical URLs |
| Future roadmap items | **Yes** | See `WEBSITE_AUDIT_AND_STABILIZATION_REPORT.md` P0–P2 |

Items not found: **guest dashboard**, full **admin panel**, automated **payouts**, in-app **chat** — needs confirmation.

---

## Next recommended milestones

### P0 — Trust & revenue integrity
1. Align all UI copy with inquiry-first / direct-payment model (remove any Razorpay guest checkout references).
2. Verify production edge functions have correct secrets (Twilio, WhatsApp, Razorpay).
3. Smoke-test host login → dashboard after latest RLS migrations.

### P1 — UX completeness
1. Implement Saved/wishlist or remove bottom-nav tab.
2. Build ICS export endpoint (Supabase edge function or Vercel serverless) or remove calendar-sync copy URL.
3. Wire `calendar-sync` and `import` into sidebar or mark clearly as beta/mock.

### P2 — Maintainability
1. Fix TypeScript errors incrementally (start with `PropertyPage.tsx`, `RishikeshStaysPage.tsx`).
2. Remove or quarantine dead modules (`AdminDashboard`, `Router.tsx`, `PropertyModal`).
3. Add `.env.example` with variable names and setup notes.
4. Replace mock Support/Import with real backends or explicit "coming soon" states.

### P3 — Growth
1. DB-backed promo codes + admin tooling.
2. Guest trip lookup by phone/booking ID (lightweight, no full account system).
3. Label premium AI features as simulated until model-backed.

---

## Build / test status (2026-06-13)

| Command | Result |
|---------|--------|
| `npm run build` | **Passes** (~979 KB JS bundle; chunk size warning) |
| `npm run typecheck` | **Fails** (~109 TS errors) |
| `npm run lint` | Not run in this audit |
| `npm run dev` | Standard Vite dev server on port 5173 |

---

## Git history (recent)

```
f71c5e7 fix: restore host login and dashboard after RLS recursion
0a75621 feat: add PWA install prompt and home-screen support
de0fa0a docs: Siddhart update docx - 19 May 2026 full audit
6110bec feat: inquiry-first guest flow, OTP verification, and host-only subscriptions
477f0a9 fix: Razorpay booking flow and host phone after payment
```

Remote: `prod2/main` tracked.

---

## Related internal docs

- `WEBSITE_AUDIT_AND_STABILIZATION_REPORT.md` — Phase 1 stabilization log (May–Jun 2026)
- `HOMEPAGE_REDESIGN.md` — Homepage/city page design spec
- `docs/XPRESSBNB_PROJECT_MEMORY.md` — One-page handoff summary
