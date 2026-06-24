# MSG91 OTP Migration — Staging & Deployment Checklist

Operational guide for staging validation, production cutover, and rollback.  
**Do not enable `OTP_PROVIDER=msg91` in production until every staging step below passes.**

---

## 1. Deploy bundle (commit together)

These files form a single atomic migration. Partial deploys break OTP routing or leave provider contracts mismatched.

### Edge functions (modified)

| Path | Role |
|------|------|
| `supabase/functions/send-booking-otp/index.ts` | Send orchestration (rate limits, DB, provider dispatch) |
| `supabase/functions/verify-booking-otp/index.ts` | Verify orchestration (provider + `booking_otp_verifications`) |

### Shared modules (new)

| Path | Role |
|------|------|
| `supabase/functions/_shared/otp-constants.ts` | TTL, rate limits, `OTP_PROVIDER` resolution, `external_otp` marker |
| `supabase/functions/_shared/otp-provider.ts` | Provider router (`msg91` \| `twilio`) |
| `supabase/functions/_shared/msg91-otp.ts` | MSG91 send/verify (v5 API, `otp_expiry` parity) |
| `supabase/functions/_shared/twilio-otp.ts` | Twilio Verify / SMS fallback (rollback path) |
| `supabase/functions/_shared/otp-http.ts` | Telecom fetch timeout + structured error logs |
| `supabase/functions/_shared/otp-db.ts` | `otp_requests` helpers |
| `supabase/functions/_shared/otp-phone.ts` | India phone normalization (`91XXXXXXXXXX` for MSG91) |

### Client / config (modified)

| Path | Role |
|------|------|
| `src/lib/bookingOtp.ts` | Provider-neutral client errors |
| `.env.example` | Documents `OTP_PROVIDER`, MSG91, and Twilio secrets |

### Documentation (new)

| Path | Role |
|------|------|
| `docs/MSG91_STAGING_CHECKLIST.md` | This file |

### Privacy policy (cutover-gated — see §6)

| Path | Change at production cutover only |
|------|-----------------------------------|
| `src/components/PrivacyPolicyPage.tsx` | `SMS (Twilio)` → `SMS (MSG91)` |

**No database migrations required.** Existing `otp_requests`, `booking_otp_verifications`, and `consume_booking_inquiry_otp()` are provider-agnostic.

---

## 2. Required Supabase Edge Function secrets

Set in **Supabase Dashboard → Edge Functions → Secrets** (not in Vite `.env`).

### Always required (both providers)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `otp_requests` / `booking_otp_verifications` writes |

### MSG91 path (`OTP_PROVIDER=msg91`)

| Secret | Purpose |
|--------|---------|
| `OTP_PROVIDER` | Must be `msg91` |
| `MSG91_AUTH_KEY` | MSG91 control panel auth key |
| `MSG91_TEMPLATE_ID` | DLT-mapped OTP template ID in MSG91 |

### Twilio rollback path (`OTP_PROVIDER=twilio` or unset)

| Secret | Purpose |
|--------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_VERIFY_SERVICE_SID` | Preferred: Twilio Verify send/check |
| `TWILIO_PHONE_NUMBER` | Fallback: programmable SMS (requires DLT template on Twilio) |

---

## 3. `OTP_PROVIDER` usage

| Value | Behavior |
|-------|----------|
| *(unset)* | Defaults to `twilio` — preserves current production behavior |
| `twilio` | Twilio Verify when `TWILIO_VERIFY_SERVICE_SID` set; else local hash + programmable SMS |
| `msg91` | MSG91 OTP API v5 send + verify |

**Staging:** set `OTP_PROVIDER=msg91` only on the staging Supabase project.  
**Production:** flip only after staging E2E passes (§5).

Constants (single source of truth in `otp-constants.ts`):

- `OTP_TTL_MIN = 10` — used on MSG91 send **and** verify (`otp_expiry`)
- `VERIFY_TOKEN_TTL_MIN = 15` — `booking_otp_verifications` token lifetime
- `BOOKING_OTP_CODE_LENGTH = 4`

---

## 4. DLT readiness checklist

Complete **before** staging SMS tests. MSG91 returns code `203` (and related template errors) when DLT is not wired correctly.

- [ ] **Entity registered** on DLT portal (PE ID obtained)
- [ ] **Header / sender ID** approved and linked to MSG91 account
- [ ] **OTP template** registered on DLT with exact message body (4-digit OTP placeholder)
- [ ] **Template mapped in MSG91** dashboard; ID matches `MSG91_TEMPLATE_ID` secret
- [ ] **Template category** is transactional OTP (not promotional)
- [ ] **Test number** on MSG91 allowlist if account is in sandbox / restricted mode
- [ ] **MSG91 account funded** and India route enabled
- [ ] **Consent / opt-in** requirements met for your use case (guest-initiated inquiry OTP)

### Expected failure signals (pre-DLT)

| Signal | Meaning |
|--------|---------|
| MSG91 code `203` | DLT / template / scrub failure |
| `otp_provider_send_unexpected` log | Non-success response shape — inspect `body` in function logs |
| User message: *"Could not send verification SMS…"* | Mapped DLT/template error (502) |

---

## 5. Staging validation steps

Run against a **dedicated staging Supabase project** with `OTP_PROVIDER=msg91`.

### 5.1 Deploy

```bash
supabase functions deploy send-booking-otp --project-ref <staging-ref>
supabase functions deploy verify-booking-otp --project-ref <staging-ref>
```

Confirm all `_shared/*` modules are included in the deploy artifact.

### 5.2 Secret smoke test

- [ ] `OTP_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` set
- [ ] Twilio secrets remain present (rollback without redeploy)

### 5.3 Send path

- [ ] Open listing → start booking inquiry → enter valid 10-digit Indian mobile
- [ ] OTP SMS received within 60s
- [ ] SMS body matches DLT-approved template
- [ ] `otp_requests` row created with `code_hash = external_otp`
- [ ] Function log: `otp_provider_send` with `provider: msg91`, `ok: true`

### 5.4 Verify path (within 10 minutes)

- [ ] Enter correct 4-digit OTP → success
- [ ] Response includes `verification_token` and `expires_at`
- [ ] `booking_otp_verifications` row inserted
- [ ] Function log: `otp_provider_verify` with `ok: true`
- [ ] Complete inquiry flow → `consume_booking_inquiry_otp` succeeds
- [ ] Host notification fires (unchanged path)

### 5.5 Negative cases

- [ ] Wrong OTP → `Invalid OTP` (400), attempts tracked where applicable
- [ ] Expired OTP (>10 min) → `Invalid or expired code` or equivalent
- [ ] Rate limit: >3 sends/hour/phone → 429
- [ ] Invalid phone → 400

### 5.6 Unchanged surfaces (regression)

- [ ] `BookingForm` UX unchanged
- [ ] `OfferModal` unchanged
- [ ] Host login (email / Google) unaffected
- [ ] Supabase Auth sessions unaffected

### 5.7 Rollback drill on staging

- [ ] Set `OTP_PROVIDER=twilio` (or remove secret)
- [ ] Send + verify works via Twilio
- [ ] No code redeploy required for provider flip

**Record evidence:** screenshot of SMS, function log excerpts, and one successful inquiry completion. Attach to release ticket.

---

## 6. Privacy policy / provider cutover sequencing

**Rule:** Public privacy policy must name the SMS provider that is **actually in use**.

| Phase | `OTP_PROVIDER` (production) | `PrivacyPolicyPage.tsx` |
|-------|----------------------------|-------------------------|
| Pre-cutover (current) | `twilio` or unset | `SMS (Twilio)` |
| Post-cutover | `msg91` | `SMS (MSG91)` |

Deploy privacy policy wording change **in the same release** as production `OTP_PROVIDER=msg91`. Never ship MSG91 in the policy while Twilio is still live.

---

## 7. Production rollout procedure

1. Merge deploy bundle (§1) to `main`.
2. Deploy edge functions to production Supabase project.
3. Confirm production secrets: `MSG91_*` present, `OTP_PROVIDER` still `twilio` (or unset).
4. Complete staging validation (§5) on staging project — **gate**.
5. Schedule low-traffic window.
6. **Atomic cutover:**
   - Set `OTP_PROVIDER=msg91` in production Edge Function secrets.
   - Deploy frontend with `PrivacyPolicyPage` → `SMS (MSG91)`.
7. Send one real OTP to an internal test number; verify end-to-end.
8. Monitor for 30 minutes:
   - `otp_provider_send` / `otp_provider_verify` success rate
   - `otp_provider_*_unexpected` / `otp_provider_fetch_error` (should be zero)
   - User-reported SMS failures

---

## 8. Rollback procedure

**Fast rollback (no redeploy):**

1. Set `OTP_PROVIDER=twilio` (or delete the secret to default).
2. Revert frontend privacy policy to `SMS (Twilio)` if already changed.
3. Verify send + verify with internal test number.

**When to rollback:**

- Sustained `otp_provider_send` failures
- MSG91 code `203` / DLT errors in production logs
- Spike in `otp_provider_fetch_error` with `timed_out: true`

Twilio secrets must remain configured at all times until MSG91 is proven stable for ≥7 days.

---

## 9. Observability reference

Structured log events (Supabase Edge Function logs):

| Event | When |
|-------|------|
| `otp_provider_send` | Provider send completed |
| `otp_provider_verify` | Provider verify completed |
| `otp_provider_send_unexpected` | MSG91 send response not recognized as success |
| `otp_provider_verify_unexpected` | MSG91 verify response not recognized as success |
| `otp_provider_fetch_error` | HTTP timeout (15s) or network failure |
| `otp_verify` | Edge function verify orchestration result |

All provider HTTP calls use `fetchWithTelecomTimeout` (15s `AbortController`).
