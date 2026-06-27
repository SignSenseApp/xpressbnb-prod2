# XpressBNB — Project Memory (Handoff)

> One-page internal reference. No secrets. Last updated: 2026-06-13.

---

## What the product is

**XpressBNB** is a couple-friendly / hourly-stay rental marketplace for India (Delhi NCR + Rishikesh). Guests browse listings and submit **inquiries** (phone OTP verified). Hosts manage properties and inquiries in a dashboard; payment happens **directly** between guest and host (WhatsApp/UPI/cash). XpressBNB monetizes via optional **host subscriptions** (Razorpay), not guest booking commission.

**Live site:** https://xpressbnb.com  
**Repo root:** `d:/xpx/project/`

---

## What is already built

- **Public site:** Homepage, explore, city listings (`/stays/:city`), property pages, Rishikesh page
- **Booking flow:** Inquiry form → OTP → booking row → confirmation page → WhatsApp host link
- **Auth:** Login, register, forgot/reset password, Google OAuth
- **Host dashboard:** Overview, properties, calendar, inquiries, earnings, analytics, reviews, subscription, settings, support
- **Payments:** Host subscription Razorpay checkout (edge functions)
- **Backend:** Supabase Postgres (40+ migrations), RLS, storage, OTP + WhatsApp edge functions
- **Polish:** PWA, cookie consent, Vercel analytics, SEO meta, mobile bottom nav, promo codes
- **Inquiry security:** Cloudflare Turnstile on guest submit (kept); IP rate limits via Supabase edge functions

---

## What is not built

- Guest accounts / guest dashboard
- Platform guest payment (Razorpay guest checkout disabled — 410)
- Real admin panel (orphaned `AdminDashboard.tsx`)
- Saved/wishlist persistence
- Calendar ICS export API (`/api/calendar/*.ics` is a dead link)
- Real listing import or support tickets (mock `setTimeout` UIs)
- Model-backed AI pricing/coach (synthetic data only)

---

## How to run locally

```bash
cd d:/xpx/project
npm install          # if node_modules missing
npm run dev          # http://localhost:5173
```

Create `project/.env` (gitignored) with at minimum:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=         # required for inquiry submit in production
VITE_GOOGLE_MAPS_API_KEY=      # optional — map views degrade without it
VITE_RAZORPAY_KEY_ID_HOST=     # optional — host subscription checkout only
```

See `.env.example` and `README.md` for the full list. Supabase edge functions need server secrets in the Supabase dashboard (Turnstile secret, MSG91/Twilio, Razorpay, WhatsApp, etc.).

---

## Important commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript check (~109 known errors) |
| `npm run lint` | ESLint |
| `npm run generate:favicon` | Regenerate favicon assets |

---

## Important accounts / env notes (safe)

- **Supabase project** — URL pattern `*.supabase.co`; anon key is public by design; service role **never** in frontend
- **Vercel** — `vercel.json` configures SPA rewrites; framework preset Vite; **production frontend host** (not Cloudflare Pages)
- **Turnstile** — Guest inquiry CAPTCHA; `VITE_TURNSTILE_SITE_KEY` (browser) + `TURNSTILE_SECRET_KEY` (edge function). Security product only — not CDN/hosting.
- **Razorpay** — Host subscriptions only; public key in `VITE_RAZORPAY_KEY_ID_HOST`; secrets in edge functions
- **Twilio** — Booking OTP via Verify service
- **WhatsApp Business API** — Inquiry notifications via `send-inquiry-notification`
- **Google Maps** — Restrict API key to xpressbnb.com + localhost referrers

Do not commit `.env`. Do not paste keys into docs or chat.

---

## Architecture in 30 seconds

```
Browser (React/Vite SPA)
  ├── Supabase JS client (auth, queries, storage)
  └── Edge Functions (OTP, Razorpay orders, WhatsApp)
        └── Postgres + RLS + triggers
```

Routing: custom `AppRouter.tsx` (not React Router).  
Auth: `AuthContext` loads `hosts` row for logged-in user; auto-creates via RPC if missing.

---

## Next best prompt to continue development

> **Recommended starting prompt:**
>
> "Read `docs/XPRESSBNB_RECOVERY_REPORT.md` and `docs/XPRESSBNB_PROJECT_MEMORY.md`. Fix P1 issue: implement a working Saved listings flow for the mobile bottom nav (localStorage or Supabase `rishikesh_saved_properties` pattern), or remove the Saved tab until ready. Do not change payment model or delete files."

Alternative high-value prompts:
- "Add `.env.example` and document all required env vars without values."
- "Fix TypeScript errors in `PropertyPage.tsx` and `RishikeshStaysPage.tsx` only."
- "Implement Supabase edge function for ICS calendar export or remove broken calendar-sync URL from UI."

---

## Key files to read first

| File | Why |
|------|-----|
| `src/AppRouter.tsx` | All routes |
| `src/contexts/AuthContext.tsx` | Auth + host profile |
| `src/components/BookingForm.tsx` | Guest inquiry flow |
| `src/pages/host/BookingsPage.tsx` | Host inquiry management |
| `src/lib/database.types.ts` | DB contract |
| `supabase/migrations/` | Schema truth |
| `WEBSITE_AUDIT_AND_STABILIZATION_REPORT.md` | Recent shipped fixes + roadmap |
