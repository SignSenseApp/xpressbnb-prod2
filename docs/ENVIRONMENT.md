# Environment variables

Frontend (Vite) variables are prefixed with `VITE_` and ship to the browser. Server secrets live only in **Supabase Edge Function secrets**.

Copy `.env.example` to `.env.local` for local development.

## Required — guest marketplace

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Public anon key (RLS enforced) |
| `VITE_TURNSTILE_SITE_KEY` | Vercel + `.env.local` | Cloudflare Turnstile **site** key (bot protection on inquiry submit) |

Without `VITE_TURNSTILE_SITE_KEY` in production, the inquiry form fails closed (security check unavailable).

## Optional — frontend

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_MAPS_API_KEY` | Map pins and city views |
| `VITE_RAZORPAY_KEY_ID_HOST` | Host subscription checkout (public key) |
| `VITE_VAPID_PUBLIC_KEY` | Web push for inquiry updates |

## Supabase Edge Function secrets (never `VITE_*`)

Set in **Supabase Dashboard → Edge Functions → Secrets**.

| Secret | Used by | Required for |
|--------|---------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Most functions | Server-side RPC / admin |
| `TURNSTILE_SECRET_KEY` | `submit-booking-inquiry` | Turnstile siteverify (production inquiries) |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | OTP (when `OTP_PROVIDER=msg91`) | Legacy booking OTP |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Host payments | Subscriptions |
| `NOTIFICATION_DISPATCH_SECRET` | Notifications | Internal dispatch |
| `OPS_ALLOWED_EMAILS` | `ops-console` | Ops console access |

Turnstile keys are created at [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile). This is **not** Cloudflare hosting — only anti-bot verification.

## Validation at startup

The app calls `reportClientEnvIssues()` in `main.tsx`:

- **Errors** (missing Supabase URL/key, missing Turnstile in production) → `console.error` with fix hints
- **Warnings** (optional maps key, dev Turnstile bypass) → `console.warn`

Secrets are never logged.

## Hosting independence

| Layer | Provider |
|-------|----------|
| Frontend | Vercel |
| API / DB | Supabase |
| Bot protection | Cloudflare Turnstile (third-party service) |

No Cloudflare Pages, Workers, R2, or DNS configuration exists in this repository.
