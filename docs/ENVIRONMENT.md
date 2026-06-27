# Environment variables

Frontend (Vite) variables are prefixed with `VITE_` and ship to the browser. Server secrets live only in **Supabase Edge Function secrets**.

Copy `.env.example` to `.env.local` for local development.

## Required — guest marketplace

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Public anon key (RLS enforced) |

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
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | OTP (when `OTP_PROVIDER=msg91`) | Legacy booking OTP |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Host payments | Subscriptions |
| `NOTIFICATION_DISPATCH_SECRET` | Notifications | Internal dispatch |
| `OPS_ALLOWED_EMAILS` | `ops-console` | Ops console access |

## Validation at startup

The app calls `reportClientEnvIssues()` in `main.tsx`:

- **Errors** (missing Supabase URL/key) → `console.error` with fix hints
- **Warnings** (optional maps key) → `console.warn`

Secrets are never logged.

## Hosting independence

| Layer | Provider |
|-------|----------|
| Frontend | Vercel |
| API / DB | Supabase |
| Inquiry abuse protection | Edge function (honeypot, timing, IP limits) + Ops review |

No Cloudflare Pages, Workers, R2, or DNS configuration exists in this repository.
