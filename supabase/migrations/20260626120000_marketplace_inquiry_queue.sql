/*
  # Marketplace inquiry queue (OTP-free launch flow)

  - Guest submits inquiry → inquiry_preparing (quality review)
  - Admin approves → phone_verified + pending_host → existing host notification trigger
  - Immutable customer_reference (XPX-YYMMDD-#####)
  - Spam scoring, duplicate detection, IP throttling
  - Guest push subscriptions + public track-by-reference RPC
*/

-- ---------------------------------------------------------------------------
-- 1. Schema extensions
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_reference text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS spam_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submission_ip text,
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS host_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_customer_reference
  ON public.bookings (customer_reference)
  WHERE customer_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_inquiry_preparing
  ON public.bookings (created_at DESC)
  WHERE status = 'inquiry_preparing';

CREATE INDEX IF NOT EXISTS idx_bookings_guest_email_created
  ON public.bookings (guest_email, created_at DESC);

COMMENT ON COLUMN public.bookings.customer_reference IS
  'Public tracking ID (XPX-YYMMDD-#####). Never expose booking UUID to guests.';

-- Expand status constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (
    status = ANY (
      ARRAY[
        'pending',
        'inquiry_pending',
        'inquiry_preparing',
        'pending_host',
        'accepted',
        'rejected',
        'confirmed',
        'cancelled',
        'completed'
      ]::text[]
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_bookings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON public.bookings;

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bookings_updated_at();

-- Daily reference counter (IST calendar day)
CREATE TABLE IF NOT EXISTS public.inquiry_reference_counters (
  ref_date text PRIMARY KEY,
  seq integer NOT NULL DEFAULT 0
);

ALTER TABLE public.inquiry_reference_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inquiry_reference_counters FROM PUBLIC;
GRANT ALL ON TABLE public.inquiry_reference_counters TO postgres, service_role;

-- IP throttle log (service role only)
CREATE TABLE IF NOT EXISTS public.inquiry_submission_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_ip text NOT NULL,
  guest_email text,
  guest_phone text,
  property_id uuid,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_submission_log_ip_created
  ON public.inquiry_submission_log (submission_ip, created_at DESC);

ALTER TABLE public.inquiry_submission_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inquiry_submission_log FROM PUBLIC;
GRANT ALL ON TABLE public.inquiry_submission_log TO postgres, service_role;

-- Guest push subscriptions (PWA)
CREATE TABLE IF NOT EXISTS public.guest_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  customer_reference text NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  notification_preferences jsonb NOT NULL DEFAULT '{"status_updates": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_guest_push_subscriptions_booking
  ON public.guest_push_subscriptions (booking_id);

ALTER TABLE public.guest_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests upsert own push subscription via booking ref"
  ON public.guest_push_subscriptions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Tighten: only service role writes directly; guests use RPC below
DROP POLICY IF EXISTS "Guests upsert own push subscription via booking ref" ON public.guest_push_subscriptions;
REVOKE ALL ON public.guest_push_subscriptions FROM anon, authenticated;
GRANT ALL ON TABLE public.guest_push_subscriptions TO postgres, service_role;

-- Guest push notification queue
CREATE TABLE IF NOT EXISTS public.guest_push_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  customer_reference text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT guest_push_notification_queue_status_check CHECK (
    status = ANY (ARRAY['pending', 'processing', 'sent', 'failed']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_guest_push_notification_queue_pending
  ON public.guest_push_notification_queue (status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.guest_push_notification_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_push_notification_queue FROM PUBLIC;
GRANT ALL ON TABLE public.guest_push_notification_queue TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_inquiry_customer_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date text;
  v_seq integer;
  v_ref text;
  v_attempt integer := 0;
BEGIN
  v_date := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD');

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 8 THEN
      -- Fallback: short random suffix
      v_ref := 'XPX-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    ELSE
      INSERT INTO public.inquiry_reference_counters (ref_date, seq)
      VALUES (v_date, 1)
      ON CONFLICT (ref_date) DO UPDATE
        SET seq = public.inquiry_reference_counters.seq + 1
      RETURNING seq INTO v_seq;

      v_ref := 'XPX-' || v_date || '-' || lpad(v_seq::text, 5, '0');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.bookings WHERE customer_reference = v_ref
    ) THEN
      RETURN v_ref;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_inquiry_customer_reference() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_inquiry_customer_reference() TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.compute_inquiry_spam_score(
  p_guest_email text,
  p_guest_phone text,
  p_property_id uuid,
  p_submission_ip text,
  p_device_fingerprint text,
  p_turnstile_passed boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_digits text;
  v_email text;
  v_window interval := interval '15 minutes';
BEGIN
  v_digits := right(regexp_replace(coalesce(trim(p_guest_phone), ''), '\D', '', 'g'), 10);
  v_email := lower(trim(coalesce(p_guest_email, '')));

  IF NOT coalesce(p_turnstile_passed, false) THEN
    v_score := v_score + 25;
  END IF;

  IF coalesce(trim(p_device_fingerprint), '') = '' THEN
    v_score := v_score + 10;
  END IF;

  IF coalesce(trim(p_submission_ip), '') = '' THEN
    v_score := v_score + 5;
  END IF;

  IF length(v_digits) = 10 AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.guest_phone = v_digits
      AND b.created_at >= now() - v_window
      AND b.status NOT IN ('rejected', 'cancelled')
  ) THEN
    v_score := v_score + 30;
  END IF;

  IF v_email <> '' AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE lower(b.guest_email) = v_email
      AND b.created_at >= now() - v_window
      AND b.status NOT IN ('rejected', 'cancelled')
  ) THEN
    v_score := v_score + 30;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.property_id = p_property_id
      AND (
        (length(v_digits) = 10 AND b.guest_phone = v_digits)
        OR (v_email <> '' AND lower(b.guest_email) = v_email)
      )
      AND b.created_at >= now() - v_window
      AND b.status NOT IN ('rejected', 'cancelled')
  ) THEN
    v_score := v_score + 30;
  END IF;

  IF coalesce(trim(p_submission_ip), '') <> '' AND (
    SELECT count(*)::integer
    FROM public.inquiry_submission_log l
    WHERE l.submission_ip = trim(p_submission_ip)
      AND l.created_at >= now() - interval '1 hour'
  ) >= 8 THEN
    v_score := v_score + 40;
  END IF;

  RETURN least(v_score, 100);
END;
$$;

REVOKE ALL ON FUNCTION public.compute_inquiry_spam_score(text, text, uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_inquiry_spam_score(text, text, uuid, text, text, boolean) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.enqueue_guest_push_notification(
  p_booking_id uuid,
  p_event_type text,
  p_title text,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
BEGIN
  SELECT customer_reference INTO v_ref
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_ref IS NULL OR trim(v_ref) = '' THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guest_push_subscriptions WHERE booking_id = p_booking_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.guest_push_notification_queue (
    booking_id, customer_reference, event_type, title, body
  )
  VALUES (p_booking_id, v_ref, p_event_type, p_title, p_body);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_guest_push_notification(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_guest_push_notification(uuid, text, text, text) TO postgres, service_role;

-- Guest push on inquiry lifecycle
CREATE OR REPLACE FUNCTION public.enqueue_guest_inquiry_push_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'inquiry_preparing' THEN
    PERFORM public.enqueue_guest_push_notification(
      NEW.id,
      'inquiry_preparing',
      'XpressBNB',
      'Your inquiry is now being reviewed.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pending_host'
      AND OLD.status IS DISTINCT FROM 'pending_host'
      AND NEW.phone_verified IS TRUE THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_sent_to_host',
        'XpressBNB',
        'Your inquiry has been forwarded to the host.'
      );
    ELSIF NEW.host_viewed_at IS NOT NULL
      AND OLD.host_viewed_at IS NULL THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_viewed_by_host',
        'XpressBNB',
        'The host is reviewing your inquiry.'
      );
    ELSIF NEW.status = 'accepted'
      AND OLD.status IS DISTINCT FROM 'accepted' THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_host_accepted',
        'XpressBNB',
        'The host accepted your inquiry.'
      );
    ELSIF NEW.host_decision_at IS NOT NULL
      AND OLD.host_decision_at IS NULL
      AND NEW.status NOT IN ('accepted', 'rejected', 'cancelled') THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_host_responded',
        'XpressBNB',
        'The host has responded.'
      );
    ELSIF NEW.status = 'rejected'
      AND OLD.status IS DISTINCT FROM 'rejected' THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_rejected',
        'XpressBNB',
        'Your inquiry could not be completed at this time.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enqueue_guest_inquiry_push ON public.bookings;

CREATE TRIGGER trigger_enqueue_guest_inquiry_push
  AFTER INSERT OR UPDATE OF status, phone_verified, host_viewed_at, host_decision_at ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_guest_inquiry_push_on_change();

-- ---------------------------------------------------------------------------
-- 3. Availability: hold dates during quality review
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
          'inquiry_preparing',
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

-- ---------------------------------------------------------------------------
-- 4. Marketplace create_pending_booking (OTP optional / deprecated)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, uuid, text, boolean
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
  p_otp_verification_token uuid DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_include_decoration boolean DEFAULT false,
  p_device_fingerprint text DEFAULT NULL,
  p_submission_ip text DEFAULT NULL,
  p_turnstile_passed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_digits text;
  v_ref text;
  v_spam integer;
  v_use_otp boolean := false;
BEGIN
  v_digits := regexp_replace(coalesce(trim(p_guest_phone), ''), '\D', '', 'g');
  v_digits := right(v_digits, 10);

  IF length(v_digits) <> 10 THEN
    RAISE EXCEPTION 'Invalid guest phone';
  END IF;

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

  IF p_host_id IS NULL THEN
    RAISE EXCEPTION 'Property not available';
  END IF;

  -- Legacy OTP path (disabled at launch — token ignored unless explicitly re-enabled server-side)
  IF p_otp_verification_token IS NOT NULL THEN
  BEGIN
    PERFORM public.consume_booking_inquiry_otp(p_otp_verification_token, p_guest_phone);
    v_use_otp := true;
  EXCEPTION
    WHEN OTHERS THEN
      v_use_otp := false;
  END;
  END IF;

  v_spam := public.compute_inquiry_spam_score(
    p_guest_email,
    p_guest_phone,
    p_property_id,
    p_submission_ip,
    p_device_fingerprint,
    p_turnstile_passed
  );

  IF v_spam >= 90 THEN
    RAISE EXCEPTION 'Too many inquiries. Please try again later.';
  END IF;

  v_ref := public.generate_inquiry_customer_reference();

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
    include_decoration,
    customer_reference,
    spam_score,
    submission_ip,
    device_fingerprint
  )
  VALUES (
    v_id,
    p_property_id,
    p_host_id,
    trim(p_guest_name),
    trim(lower(p_guest_email)),
    v_digits,
    p_check_in,
    p_check_out,
    p_check_in,
    p_check_out,
    p_num_guests,
    'full_day',
    p_amount_total,
    p_total_price,
    p_nights,
    CASE WHEN v_use_otp THEN 'pending_host' ELSE 'inquiry_preparing' END,
    'inquiry',
    'book_pay_later',
    v_use_otp,
    CASE WHEN v_use_otp THEN now() ELSE NULL END,
    nullif(trim(coalesce(p_special_requests, '')), ''),
    coalesce(p_include_decoration, false),
    v_ref,
    v_spam,
    nullif(trim(coalesce(p_submission_ip, '')), ''),
    nullif(trim(coalesce(p_device_fingerprint, '')), '')
  );

  INSERT INTO public.inquiry_submission_log (
    submission_ip, guest_email, guest_phone, property_id, booking_id
  )
  VALUES (
    coalesce(nullif(trim(coalesce(p_submission_ip, '')), ''), 'unknown'),
    trim(lower(p_guest_email)),
    v_digits,
    p_property_id,
    v_id
  );

  RETURN jsonb_build_object(
    'booking_id', v_id,
    'customer_reference', v_ref,
    'status', CASE WHEN v_use_otp THEN 'pending_host' ELSE 'inquiry_preparing' END,
    'spam_score', v_spam,
    'requires_review', NOT v_use_otp,
    'frequent_amigo', public.frequent_amigo_status_for_phone(v_digits)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Marketplace create_make_offer_inquiry
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, uuid, integer, text, text
);

CREATE OR REPLACE FUNCTION public.create_make_offer_inquiry(
  p_property_id uuid,
  p_host_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_check_in date,
  p_check_out date,
  p_offer_amount numeric,
  p_guest_phone text,
  p_otp_verification_token uuid DEFAULT NULL,
  p_num_guests integer DEFAULT 1,
  p_offer_message text DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_device_fingerprint text DEFAULT NULL,
  p_submission_ip text DEFAULT NULL,
  p_turnstile_passed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_nights integer;
  v_total numeric;
  v_note text;
  v_digits text;
  v_ref text;
  v_spam integer;
  v_use_otp boolean := false;
BEGIN
  v_digits := regexp_replace(coalesce(trim(p_guest_phone), ''), '\D', '', 'g');
  v_digits := right(v_digits, 10);

  IF length(v_digits) <> 10 THEN
    RAISE EXCEPTION 'Invalid guest phone';
  END IF;

  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  IF p_offer_amount IS NULL OR p_offer_amount <= 0 THEN
    RAISE EXCEPTION 'Offer amount must be positive';
  END IF;

  IF NOT public.is_property_available(p_property_id, p_check_in, p_check_out) THEN
    RAISE EXCEPTION 'Booking unavailable';
  END IF;

  IF p_host_id IS NULL THEN
    RAISE EXCEPTION 'Property not available';
  END IF;

  IF p_otp_verification_token IS NOT NULL THEN
  BEGIN
    PERFORM public.consume_booking_inquiry_otp(p_otp_verification_token, p_guest_phone);
    v_use_otp := true;
  EXCEPTION
    WHEN OTHERS THEN
      v_use_otp := false;
  END;
  END IF;

  v_spam := public.compute_inquiry_spam_score(
    p_guest_email,
    p_guest_phone,
    p_property_id,
    p_submission_ip,
    p_device_fingerprint,
    p_turnstile_passed
  );

  IF v_spam >= 90 THEN
    RAISE EXCEPTION 'Too many inquiries. Please try again later.';
  END IF;

  v_nights := greatest(1, p_check_out - p_check_in);
  v_total := round(p_offer_amount * v_nights, 2);
  v_ref := public.generate_inquiry_customer_reference();

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
    special_requests,
    customer_reference,
    spam_score,
    submission_ip,
    device_fingerprint
  )
  VALUES (
    v_id,
    p_property_id,
    p_host_id,
    trim(p_guest_name),
    trim(lower(p_guest_email)),
    v_digits,
    p_check_in,
    p_check_out,
    p_check_in,
    p_check_out,
    p_num_guests,
    'full_day',
    v_total,
    v_total,
    v_nights,
    CASE WHEN v_use_otp THEN 'pending_host' ELSE 'inquiry_preparing' END,
    'offer_pending',
    'make_offer',
    p_offer_amount,
    nullif(trim(coalesce(p_offer_message, '')), ''),
    v_use_otp,
    CASE WHEN v_use_otp THEN now() ELSE NULL END,
    v_note,
    v_ref,
    v_spam,
    nullif(trim(coalesce(p_submission_ip, '')), ''),
    nullif(trim(coalesce(p_device_fingerprint, '')), '')
  );

  INSERT INTO public.inquiry_submission_log (
    submission_ip, guest_email, guest_phone, property_id, booking_id
  )
  VALUES (
    coalesce(nullif(trim(coalesce(p_submission_ip, '')), ''), 'unknown'),
    trim(lower(p_guest_email)),
    v_digits,
    p_property_id,
    v_id
  );

  RETURN jsonb_build_object(
    'booking_id', v_id,
    'customer_reference', v_ref,
    'status', CASE WHEN v_use_otp THEN 'pending_host' ELSE 'inquiry_preparing' END,
    'spam_score', v_spam,
    'requires_review', NOT v_use_otp,
    'frequent_amigo', public.frequent_amigo_status_for_phone(v_digits)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, uuid, text, boolean, text, text, boolean
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, uuid, integer, text, text, text, text, boolean
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin approve / reject (ops)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_inquiry_for_host(
  p_booking_id uuid,
  p_reviewed_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bookings%ROWTYPE;
  v_host jsonb;
BEGIN
  SELECT * INTO v_row
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF v_row.status NOT IN ('inquiry_preparing', 'inquiry_pending') THEN
    RAISE EXCEPTION 'Inquiry is not awaiting review';
  END IF;

  v_host := public.host_contact_json_for_host(v_row.host_id);

  UPDATE public.bookings
  SET
    phone_verified = true,
    phone_verified_at = now(),
    status = 'pending_host',
    reviewed_by = p_reviewed_by,
    reviewed_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'customer_reference', v_row.customer_reference,
    'status', 'pending_host'
  ) || v_host;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_inquiry_for_host(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_inquiry_for_host(uuid, uuid) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.reject_inquiry(
  p_booking_id uuid,
  p_reviewed_by uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
BEGIN
  UPDATE public.bookings
  SET
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    host_decision_note = coalesce(nullif(trim(p_reason), ''), host_decision_note)
  WHERE id = p_booking_id
    AND status IN ('inquiry_preparing', 'inquiry_pending')
  RETURNING customer_reference INTO v_ref;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found or not rejectable';
  END IF;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'customer_reference', v_ref,
    'status', 'rejected'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reject_inquiry(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_inquiry(uuid, uuid, text) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 7. Guest tracking + push subscription RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.track_inquiry_by_reference(
  p_customer_reference text,
  p_guest_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bookings%ROWTYPE;
  v_display_status text;
BEGIN
  IF coalesce(trim(p_customer_reference), '') = '' OR coalesce(trim(p_guest_email), '') = '' THEN
    RAISE EXCEPTION 'Reference and email are required';
  END IF;

  SELECT * INTO v_row
  FROM public.bookings
  WHERE customer_reference = upper(trim(p_customer_reference))
    AND lower(guest_email) = lower(trim(p_guest_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  v_display_status := CASE
    WHEN v_row.status IN ('rejected', 'cancelled') THEN 'cancelled'
    WHEN v_row.status IN ('confirmed', 'completed', 'accepted') AND v_row.host_decision_at IS NOT NULL THEN
      CASE WHEN v_row.status = 'accepted' THEN 'host_responded' ELSE 'completed' END
    WHEN v_row.host_decision_at IS NOT NULL THEN 'host_responded'
    WHEN v_row.host_viewed_at IS NOT NULL AND v_row.status = 'pending_host' THEN 'viewed_by_host'
    WHEN v_row.status = 'pending_host' AND v_row.phone_verified IS TRUE THEN 'sent_to_host'
    ELSE 'preparing'
  END;

  RETURN jsonb_build_object(
    'customer_reference', v_row.customer_reference,
    'display_status', v_display_status,
    'status', v_row.status,
    'phone_verified', v_row.phone_verified,
    'property_id', v_row.property_id,
    'check_in_date', v_row.check_in_date,
    'check_out_date', v_row.check_out_date,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'reviewed_at', v_row.reviewed_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_inquiry_by_reference(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_guest_push_subscription(
  p_customer_reference text,
  p_guest_email text,
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_notification_preferences jsonb DEFAULT '{"status_updates": true}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  SELECT id INTO v_booking_id
  FROM public.bookings
  WHERE customer_reference = upper(trim(p_customer_reference))
    AND lower(guest_email) = lower(trim(p_guest_email))
  LIMIT 1;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  INSERT INTO public.guest_push_subscriptions (
    booking_id,
    customer_reference,
    endpoint,
    p256dh,
    auth_key,
    notification_preferences,
    updated_at
  )
  VALUES (
    v_booking_id,
    upper(trim(p_customer_reference)),
    p_endpoint,
    p_p256dh,
    p_auth_key,
    coalesce(p_notification_preferences, '{"status_updates": true}'::jsonb),
    now()
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    booking_id = EXCLUDED.booking_id,
    customer_reference = EXCLUDED.customer_reference,
    p256dh = EXCLUDED.p256dh,
    auth_key = EXCLUDED.auth_key,
    notification_preferences = EXCLUDED.notification_preferences,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_guest_push_subscription(text, text, text, text, text, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_inquiry_viewed_by_host(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings b
  SET host_viewed_at = now()
  WHERE b.id = p_booking_id
    AND b.host_viewed_at IS NULL
    AND b.phone_verified IS TRUE
    AND b.status = 'pending_host'
    AND b.host_id IN (
      SELECT h.id FROM public.hosts h WHERE h.user_id = (SELECT auth.uid())
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_inquiry_viewed_by_host(uuid) TO authenticated;
