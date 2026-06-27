# Deployment guide

Production stack: **Vercel** (SPA) + **Supabase** (Postgres, Auth, Edge Functions).

## Prerequisites

- GitHub repo connected to Vercel
- Supabase project with migrations applied
- Domain `xpressbnb.com` pointed to Vercel (DNS at your registrar)

## 1. Deploy frontend (Vercel)

1. Import repository; framework **Vite**.
2. Confirm `vercel.json`:
   - `buildCommand`: `npm run build`
   - `outputDirectory`: `dist`
3. Set environment variables (Production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Optional: maps, Razorpay public key, VAPID public key
4. Deploy. Redeploy after any `VITE_*` change.

## 2. Deploy backend (Supabase)

### Migrations

```bash
supabase link --project-ref <your-ref>
supabase db push
```

Or apply `supabase/migrations/*.sql` in order via SQL editor.

### Edge functions

Deploy critical functions:

- `submit-booking-inquiry` — guest inquiries (honeypot, timing, IP rate limits)
- `send-inquiry-notification` — host/guest notifications
- `ops-console` — inquiry review queue

```bash
supabase functions deploy submit-booking-inquiry
```

Or use Supabase Dashboard → Edge Functions.

### Secrets

Dashboard → Edge Functions → Secrets:

- Razorpay, MSG91/Twilio, WhatsApp per `docs/ENVIRONMENT.md`

## 3. Post-deploy verification

```bash
npm run typecheck
npm run build
npm test
```

Manual smoke test:

1. Homepage loads (no layout shift on sticky search)
2. Property page → inquiry form → submit (no CAPTCHA step)
3. Guest ID on success screen
4. `/track-inquiry` with reference + email
5. Mobile PWA safe areas (bottom nav, modals)

## 4. Rollback

- **Vercel:** promote previous deployment in dashboard
- **Edge functions:** redeploy prior function bundle from git tag
- **Database:** migrations are forward-only; avoid destructive rollback without ops review

## IP extraction (edge functions)

All functions use `supabase/functions/_shared/client-ip.ts`:

1. `x-forwarded-for` (Vercel)
2. `x-real-ip`
3. `forwarded` (RFC 7239)
4. `cf-connecting-ip` (legacy proxy fallback only)

No Cloudflare CDN is assumed for hosting.
