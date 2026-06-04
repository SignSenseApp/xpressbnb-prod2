/*
  # De-duplicate hosts and enforce one host row per user

  ## Problem
  AuthContext inserted a `hosts` row in BOTH `signUp()` and `loadHostProfile()`.
  Running concurrently (getSession + onAuthStateChange), this raced and created
  duplicate host rows for the same `user_id` — sometimes with mixed-case emails
  (e.g. FOO@GMAIL.COM and foo@gmail.com) which slipped past the case-sensitive
  UNIQUE(email) constraint. On next login, `.maybeSingle()` errored on the
  multiple rows, so `host` became null and the user was silently shown the public
  homepage instead of their dashboard.

  ## Fix (data + schema)
  1. Merge duplicates: keep the EARLIEST host row per user_id and repoint every
     foreign-key reference to it, then delete the extra rows. Repointing first
     avoids the ON DELETE CASCADE wiping a host's properties/bookings.
  2. Normalize all host emails to lowercase.
  3. Add UNIQUE(user_id) and a UNIQUE(lower(email)) index so this can't recur.

  Idempotent: re-running performs no changes once data is clean.
*/

-- 1) Repoint all references from duplicate (non-kept) host rows to the kept row.
--    Kept row = earliest created_at (then id) per user_id.
WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts
  WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.properties t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.bookings t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.property_subscriptions t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.subscriptions t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.external_reviews t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.import_jobs t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.expert_requests t
SET host_id = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.host_id = h.id AND h.id <> k.keep_id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
UPDATE public.expert_requests t
SET claimed_by = k.keep_id
FROM public.hosts h
JOIN keep k ON k.user_id = h.user_id
WHERE t.claimed_by = h.id AND h.id <> k.keep_id;

-- 2) Delete the extra (non-kept) host rows now that nothing references them.
WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id AS keep_id
  FROM public.hosts WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at, id
)
DELETE FROM public.hosts h
USING keep k
WHERE h.user_id = k.user_id AND h.id <> k.keep_id;

-- 3) Normalize emails to lowercase (collision-free after the merge above).
UPDATE public.hosts
SET email = lower(email)
WHERE email <> lower(email);

-- 4) Prevent recurrence: one host per user, case-insensitive unique email.
CREATE UNIQUE INDEX IF NOT EXISTS hosts_user_id_key ON public.hosts (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS hosts_email_lower_key ON public.hosts (lower(email));
