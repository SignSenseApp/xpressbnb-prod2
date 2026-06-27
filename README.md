# XpressBnB

Production marketplace for direct host stays in Delhi NCR and Rishikesh.

**Live:** https://xpressbnb.com

## Stack

| Layer | Provider |
|--------|-----------|
| Frontend SPA | **Vercel** (`vercel.json`, Vite build → `dist/`) |
| Database, Auth, Storage | **Supabase** |
| Guest inquiry bot protection | **Cloudflare Turnstile** (CAPTCHA service — not hosting) |
| Host subscriptions | Razorpay |
| Guest OTP (legacy paths) | MSG91 / Twilio via edge functions |

There is **no** Cloudflare Pages, Workers, R2, Images, or DNS configuration in this repository. Frontend deploys to Vercel; API logic runs on Supabase Edge Functions.

## Local development

```bash
cd project
npm install
cp .env.example .env.local   # fill VITE_* values
npm run dev                    # http://localhost:5173
```

Required browser env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY` (use Turnstile test keys or dev bypass — see `.env.example`).

## Production deployment

### 1. Vercel (frontend)

1. Connect the GitHub repo; framework preset **Vite**.
2. Build command: `npm run build` (default from `vercel.json`).
3. Output directory: `dist`.
4. Set **Environment Variables** (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TURNSTILE_SITE_KEY` — Turnstile **site** key (public)
   - Optional: `VITE_GOOGLE_MAPS_API_KEY`, `VITE_RAZORPAY_KEY_ID_HOST`, `VITE_VAPID_PUBLIC_KEY`

Redeploy after changing any `VITE_*` variable.

### 2. Supabase (backend)

1. Apply migrations: `supabase db push` (or run SQL from `supabase/migrations/` in order).
2. Deploy edge functions (CLI or Dashboard). Critical for inquiries:
   - `submit-booking-inquiry`
3. Set **Edge Function secrets** (Dashboard → Edge Functions → Secrets):
   - `SUPABASE_SERVICE_ROLE_KEY` (auto-injected in hosted Supabase)
   - `TURNSTILE_SECRET_KEY` — Turnstile **secret** key (required for production inquiries)
   - OTP, Razorpay, WhatsApp secrets per `.env.example` comments

### 3. Turnstile (keep in production)

Guest booking inquiries require Turnstile. Do **not** remove `TurnstileWidget`, `VITE_TURNSTILE_SITE_KEY`, or `TURNSTILE_SECRET_KEY` unless replacing bot protection with an explicit alternative.

Create keys at [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) — this is independent of where the SPA is hosted.

### 4. Verify

```bash
npm run typecheck
npm run build
npm test
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit tests |
| `npm run generate:favicon` | Regenerate PWA favicon assets |

## Internal docs

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel + Supabase deploy steps
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — all env vars and secrets
- `docs/XPRESSBNB_PROJECT_MEMORY.md` — product handoff summary
