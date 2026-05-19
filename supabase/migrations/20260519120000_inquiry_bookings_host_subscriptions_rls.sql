/*
  # Inquiry bookings, host subscription tiers, RLS, notification queue

  A) Bookings / inquiries
  - inquiry_type, phone verification, host decision, offer fields
  - Status: pending_host, accepted, rejected (+ legacy pending, confirmed, cancelled, inquiry_pending)
  - payment_status: inquiry | offer_pending (+ legacy paid/pending/...)

  B) Host subscriptions
  - hosts.plan_tier + billing_cycle + yearly_discount_percent (account defaults)
  - property_subscriptions.plan_tier (per-property; Razorpay IDs documented below)

  Razorpay subscription IDs (host dashboard only):
  - Per-property recurring: property_subscriptions.razorpay_subscription_id
  - Per-property one-off order/payment: property_subscriptions.razorpay_order_id / razorpay_payment_id
  - Host account-level provider/customer: hosts.subscription_provider_id
  - Host account-level one-off: hosts.razorpay_order_id / hosts.razorpay_payment_id

  C) RLS: guest inserts only via SECURITY DEFINER RPCs; hosts SELECT/UPDATE own rows
  D) Trigger: verified inquiry insert → booking_notification_queue (Task 5)
*/

-- ---------------------------------------------------------------------------
-- 1. Bookings: new columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS inquiry_type text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS host_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS host_decision_note text,
  ADD COLUMN IF NOT EXISTS offer_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS offer_message text;

COMMENT ON COLUMN public.bookings.inquiry_type IS
  'book_pay_later = guest books without platform payment; make_offer = guest proposed price';
COMMENT ON COLUMN public.bookings.payment_status IS
  'Guest/platform payment lane: inquiry, offer_pending, offer_countered, offer_rejected, pending, paid, failed, refunded. No guest Razorpay on property inquiry flow.';
COMMENT ON COLUMN public.bookings.status IS
  'Lifecycle: pending_host (awaiting host), accepted, rejected, cancelled, confirmed (legacy paid/confirmed), pending (legacy payment), inquiry_pending (deprecated alias).';

-- Expand status CHECK before backfill (old constraint only allowed pending|confirmed|cancelled)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (
    status = ANY (
      ARRAY[
        'pending',
        'inquiry_pending',
        'pending_host',
        'accepted',
        'rejected',
        'confirmed',
        'cancelled',
        'completed'
      ]::text[]
    )
  );

-- Backfill inquiry_type from payment_status / offer columns
UPDATE public.bookings
SET inquiry_type = 'make_offer'
WHERE inquiry_type IS NULL
  AND (
    payment_status IN ('offer_pending', 'offer_countered', 'offer_rejected')
    OR special_requests ~* '^\s*\[OFFER'
    OR offer_amount IS NOT NULL
  );

UPDATE public.bookings
SET inquiry_type = 'book_pay_later'
WHERE inquiry_type IS NULL;

-- Map legacy offer rows to pending_host (was status=pending + offer_pending)
UPDATE public.bookings
SET status = 'pending_host'
WHERE status = 'pending'
  AND inquiry_type = 'make_offer'
  AND payment_status IN ('offer_pending', 'offer_countered');

-- Map book-pay-later inquiries waiting on host
UPDATE public.bookings
SET status = 'pending_host'
WHERE status IN ('pending', 'inquiry_pending')
  AND inquiry_type = 'book_pay_later'
  AND payment_status IN ('inquiry', 'pending')
  AND payment_status IS DISTINCT FROM 'paid';

-- inquiry_pending → pending_host (canonical name)
UPDATE public.bookings
SET status = 'pending_host'
WHERE status = 'inquiry_pending';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_inquiry_type_check;

ALTER TABLE public.bookings
  ALTER COLUMN inquiry_type SET NOT NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_inquiry_type_check CHECK (
    inquiry_type = ANY (ARRAY['book_pay_later', 'make_offer']::text[])
  );

CREATE INDEX IF NOT EXISTS idx_bookings_inquiry_type ON public.bookings (inquiry_type);
CREATE INDEX IF NOT EXISTS idx_bookings_status_host ON public.bookings (host_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone_verified ON public.bookings (phone_verified) WHERE phone_verified = true;

-- ---------------------------------------------------------------------------
-- 2. Host subscription tiers (account-level defaults on hosts)
-- ---------------------------------------------------------------------------

ALTER TABLE public.hosts
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS yearly_discount_percent numeric(5, 2) NOT NULL DEFAULT 12;

COMMENT ON COLUMN public.hosts.plan_tier IS 'Host account plan: free | standard_999 | premium_2999 (INR/month list price before yearly discount).';
COMMENT ON COLUMN public.hosts.billing_cycle IS 'Default billing cadence for new property subscriptions: monthly | yearly.';
COMMENT ON COLUMN public.hosts.yearly_discount_percent IS 'Percent off when billing_cycle=yearly (applied in app checkout).';
COMMENT ON COLUMN public.hosts.subscription_provider_id IS 'Razorpay customer/subscription id at host account level (dashboard billing).';

ALTER TABLE public.hosts DROP CONSTRAINT IF EXISTS hosts_plan_tier_check;

ALTER TABLE public.hosts
  ADD CONSTRAINT hosts_plan_tier_check CHECK (
    plan_tier = ANY (ARRAY['free', 'standard_999', 'premium_2999']::text[])
  );

ALTER TABLE public.hosts DROP CONSTRAINT IF EXISTS hosts_billing_cycle_check;

ALTER TABLE public.hosts
  ADD CONSTRAINT hosts_billing_cycle_check CHECK (
    billing_cycle = ANY (ARRAY['monthly', 'yearly']::text[])
  );

-- Per-property tier (property_subscriptions.subscription_plan remains billing cadence: monthly|yearly)
ALTER TABLE public.property_subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'standard_999',
  ADD COLUMN IF NOT EXISTS yearly_discount_percent numeric(5, 2) NOT NULL DEFAULT 12;

COMMENT ON COLUMN public.property_subscriptions.plan_tier IS 'Property plan tier: free | standard_999 | premium_2999.';
COMMENT ON COLUMN public.property_subscriptions.subscription_plan IS 'Billing cadence (monthly|yearly), not tier name.';
COMMENT ON COLUMN public.property_subscriptions.razorpay_subscription_id IS 'Primary Razorpay subscription id for this property (host dashboard checkout).';

ALTER TABLE public.property_subscriptions DROP CONSTRAINT IF EXISTS property_subscriptions_plan_tier_check;

ALTER TABLE public.property_subscriptions
  ADD CONSTRAINT property_subscriptions_plan_tier_check CHECK (
    plan_tier = ANY (ARRAY['free', 'standard_999', 'premium_2999']::text[])
  );

-- ---------------------------------------------------------------------------
-- 3. Notification queue (Task 5 — WhatsApp/SMS workers consume pending rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.booking_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT booking_notification_queue_status_check CHECK (
    status = ANY (ARRAY['pending', 'processing', 'sent', 'failed']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_notification_queue_pending
  ON public.booking_notification_queue (status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.booking_notification_queue ENABLE ROW LEVEL SECURITY;

-- Service role / edge functions only; no anon/authenticated access
REVOKE ALL ON public.booking_notification_queue FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_verified_booking_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_verified IS TRUE
    AND NEW.inquiry_type IS NOT NULL
    AND (
      TG_OP = 'INSERT'
      OR (
        TG_OP = 'UPDATE'
        AND (OLD.phone_verified IS DISTINCT FROM TRUE OR OLD.phone_verified_at IS NULL)
      )
    ) THEN
    INSERT INTO public.booking_notification_queue (booking_id, event_type, payload)
    VALUES (
      NEW.id,
      'inquiry_verified',
      jsonb_build_object(
        'inquiry_type', NEW.inquiry_type,
        'status', NEW.status,
        'payment_status', NEW.payment_status,
        'property_id', NEW.property_id,
        'host_id', NEW.host_id,
        'guest_email', NEW.guest_email
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enqueue_verified_booking_notification ON public.bookings;

CREATE TRIGGER trigger_enqueue_verified_booking_notification
  AFTER INSERT OR UPDATE OF phone_verified, phone_verified_at ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_verified_booking_notification();

-- ---------------------------------------------------------------------------
-- 4. Availability: block active inquiry / accepted / confirmed stays
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_property_available(
  p_property_id uuid,
  p_check_in date,
  p_check_out date
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.property_id = p_property_id
      AND b.status = ANY (
        ARRAY[
          'pending',
          'pending_host',
          'inquiry_pending',
          'accepted',
          'confirmed'
        ]::text[]
      )
      AND b.check_in_date < p_check_out
      AND COALESCE(b.check_out_date, b.check_in_date + 1) > p_check_in
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.property_calendar c
    WHERE c.property_id = p_property_id
      AND c.is_available = false
      AND c.date >= p_check_in
      AND c.date < p_check_out
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_property_available(uuid, date, date) TO anon, authenticated;

-- Calendar auto-block: treat accepted like confirmed
CREATE OR REPLACE FUNCTION public.auto_block_booked_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_date date;
  v_check_out date;
BEGIN
  IF NEW.status = ANY (ARRAY['confirmed', 'accepted', 'paid']::text[]) THEN
    v_check_out := COALESCE(NEW.check_out_date, NEW.check_in_date + 1);

    FOR booking_date IN
      SELECT generate_series(NEW.check_in_date, v_check_out - 1, interval '1 day')::date
    LOOP
      INSERT INTO public.property_calendar (property_id, date, is_available, notes)
      VALUES (NEW.property_id, booking_date, false, 'Auto-blocked by booking #' || NEW.id)
      ON CONFLICT (property_id, date)
      DO UPDATE
      SET
        is_available = false,
        notes = COALESCE(property_calendar.notes || ' | ', '') || 'Booked #' || NEW.id,
        updated_at = now();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_unblock_cancelled_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_date date;
  v_check_out date;
BEGIN
  IF OLD.status = ANY (ARRAY['confirmed', 'accepted', 'paid']::text[])
    AND NEW.status = ANY (ARRAY['cancelled', 'rejected']::text[]) THEN
    v_check_out := COALESCE(NEW.check_out_date, NEW.check_in_date + 1);

    FOR booking_date IN
      SELECT generate_series(NEW.check_in_date, v_check_out - 1, interval '1 day')::date
    LOOP
      UPDATE public.property_calendar
      SET
        is_available = true,
        notes = REPLACE(REPLACE(notes, 'Auto-blocked by booking #' || NEW.id, ''), 'Booked #' || NEW.id, ''),
        updated_at = now()
      WHERE property_id = NEW.property_id
        AND date = booking_date
        AND notes LIKE '%#' || NEW.id || '%';
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS: RPC-only guest insert; host SELECT/UPDATE; no cross-guest PII
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users can view relevant bookings" ON public.bookings;

CREATE POLICY "Guests view own bookings by email"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (guest_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Hosts view bookings for their properties"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT h.id
      FROM public.hosts h
      WHERE h.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Hosts update bookings for their properties"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    host_id IN (
      SELECT h.id
      FROM public.hosts h
      WHERE h.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT h.id
      FROM public.hosts h
      WHERE h.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. RPC: create_pending_booking (book_pay_later) + create_make_offer_inquiry
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, text, boolean
);

DROP FUNCTION IF EXISTS public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, integer, text, text, boolean, timestamptz
);

CREATE OR REPLACE FUNCTION public.create_pending_booking(
  p_property_id uuid,
  p_host_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_check_in date,
  p_check_out date,
  p_num_guests integer,
  p_amount_total numeric,
  p_total_price numeric,
  p_nights integer,
  p_special_requests text DEFAULT NULL,
  p_include_decoration boolean DEFAULT false,
  p_phone_verified boolean DEFAULT false,
  p_phone_verified_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_verified_at timestamptz;
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  IF NOT public.is_property_available(p_property_id, p_check_in, p_check_out) THEN
    RAISE EXCEPTION 'Booking unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Property not available';
  END IF;

  v_verified_at := CASE
    WHEN coalesce(p_phone_verified, false) THEN coalesce(p_phone_verified_at, now())
    ELSE NULL
  END;

  INSERT INTO public.bookings (
    id,
    property_id,
    host_id,
    guest_name,
    guest_email,
    guest_phone,
    check_in_date,
    check_out_date,
    checkin,
    checkout,
    num_guests,
    booking_type,
    amount_total,
    total_price,
    nights,
    status,
    payment_status,
    inquiry_type,
    phone_verified,
    phone_verified_at,
    special_requests,
    include_decoration
  )
  VALUES (
    v_id,
    p_property_id,
    p_host_id,
    trim(p_guest_name),
    trim(lower(p_guest_email)),
    trim(p_guest_phone),
    p_check_in,
    p_check_out,
    p_check_in,
    p_check_out,
    p_num_guests,
    'full_day',
    p_amount_total,
    p_total_price,
    p_nights,
    'pending_host',
    'inquiry',
    'book_pay_later',
    coalesce(p_phone_verified, false),
    v_verified_at,
    nullif(trim(coalesce(p_special_requests, '')), ''),
    coalesce(p_include_decoration, false)
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_make_offer_inquiry(
  p_property_id uuid,
  p_host_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_check_in date,
  p_check_out date,
  p_offer_amount numeric,
  p_guest_phone text DEFAULT '',
  p_num_guests integer DEFAULT 1,
  p_offer_message text DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_phone_verified boolean DEFAULT false,
  p_phone_verified_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_nights integer;
  v_total numeric;
  v_note text;
  v_verified_at timestamptz;
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  IF p_offer_amount IS NULL OR p_offer_amount <= 0 THEN
    RAISE EXCEPTION 'Offer amount must be positive';
  END IF;

  IF NOT public.is_property_available(p_property_id, p_check_in, p_check_out) THEN
    RAISE EXCEPTION 'Booking unavailable';
  END IF;

  v_nights := greatest(1, p_check_out - p_check_in);
  v_total := round(p_offer_amount * v_nights, 2);

  v_note := coalesce(
    nullif(trim(p_special_requests), ''),
    format(
      '[OFFER ₹%s/night × %s nights = ₹%s]%s',
      p_offer_amount,
      v_nights,
      v_total,
      CASE
        WHEN nullif(trim(coalesce(p_offer_message, '')), '') IS NOT NULL THEN
          ' Message: ' || trim(p_offer_message)
        ELSE ''
      END
    )
  );

  v_verified_at := CASE
    WHEN coalesce(p_phone_verified, false) THEN coalesce(p_phone_verified_at, now())
    ELSE NULL
  END;

  INSERT INTO public.bookings (
    id,
    property_id,
    host_id,
    guest_name,
    guest_email,
    guest_phone,
    check_in_date,
    check_out_date,
    checkin,
    checkout,
    num_guests,
    booking_type,
    amount_total,
    total_price,
    nights,
    status,
    payment_status,
    inquiry_type,
    offer_amount,
    offer_message,
    phone_verified,
    phone_verified_at,
    special_requests
  )
  VALUES (
    v_id,
    p_property_id,
    p_host_id,
    trim(p_guest_name),
    trim(lower(p_guest_email)),
    trim(coalesce(p_guest_phone, '')),
    p_check_in,
    p_check_out,
    p_check_in,
    p_check_out,
    p_num_guests,
    'full_day',
    v_total,
    v_total,
    v_nights,
    'pending_host',
    'offer_pending',
    'make_offer',
    p_offer_amount,
    nullif(trim(coalesce(p_offer_message, '')), ''),
    coalesce(p_phone_verified, false),
    v_verified_at,
    v_note
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_booking_razorpay_order(
  p_booking_id uuid,
  p_razorpay_order_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET razorpay_order_id = p_razorpay_order_id
  WHERE id = p_booking_id
    AND status IN ('pending', 'accepted', 'confirmed')
    AND payment_status IN ('pending', 'inquiry');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_booking(
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  date,
  integer,
  numeric,
  numeric,
  integer,
  text,
  boolean,
  boolean,
  timestamptz
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_make_offer_inquiry(
  uuid,
  uuid,
  text,
  text,
  date,
  date,
  numeric,
  text,
  integer,
  text,
  text,
  boolean,
  timestamptz
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.attach_booking_razorpay_order(uuid, text) TO anon, authenticated;

REVOKE INSERT ON public.bookings FROM anon, authenticated;
