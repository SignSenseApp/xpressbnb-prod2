/*
  # Inquiry OTP gate + host contact in booking RPC response

  - OTP tables + consume_booking_inquiry_otp (edge functions write tokens)
  - create_pending_booking / create_make_offer_inquiry require verified OTP token
  - Returns jsonb { booking_id, host_name, host_phone } — no anon hosts SELECT for phone
  - Hosts only see phone_verified inquiries
*/

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  request_ip text,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT otp_requests_purpose_check CHECK (purpose = 'booking_inquiry')
);

CREATE INDEX IF NOT EXISTS idx_otp_requests_phone_created ON public.otp_requests (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_requests_ip_created ON public.otp_requests (request_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_requests_expires ON public.otp_requests (expires_at);

ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.otp_requests FROM PUBLIC;
GRANT ALL ON TABLE public.otp_requests TO postgres, service_role;

CREATE TABLE IF NOT EXISTS public.booking_otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  booking_draft_id uuid,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_otp_verifications_open
  ON public.booking_otp_verifications (phone, expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.booking_otp_verifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.booking_otp_verifications FROM PUBLIC;
GRANT ALL ON TABLE public.booking_otp_verifications TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- Internal: consume one-time verification token
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.consume_booking_inquiry_otp(
  p_token uuid,
  p_guest_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.booking_otp_verifications%ROWTYPE;
  v_digits text;
BEGIN
  v_digits := regexp_replace(coalesce(trim(p_guest_phone), ''), '\D', '', 'g');
  v_digits := right(v_digits, 10);

  IF length(v_digits) <> 10 THEN
    RAISE EXCEPTION 'Invalid guest phone';
  END IF;

  SELECT * INTO v_row
  FROM public.booking_otp_verifications
  WHERE id = p_token
    AND consumed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired phone verification';
  END IF;

  IF v_row.phone IS DISTINCT FROM v_digits THEN
    RAISE EXCEPTION 'Phone number does not match verification';
  END IF;

  UPDATE public.booking_otp_verifications
  SET consumed_at = now()
  WHERE id = v_row.id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_booking_inquiry_otp(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_booking_inquiry_otp(uuid, text) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- Host visibility: verified inquiries only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Hosts view bookings for their properties" ON public.bookings;

CREATE POLICY "Hosts view bookings for their properties"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    phone_verified IS TRUE
    AND host_id IN (
      SELECT h.id
      FROM public.hosts h
      WHERE h.user_id = (SELECT auth.uid())
    )
  );

UPDATE public.bookings
SET
  phone_verified = true,
  phone_verified_at = coalesce(phone_verified_at, created_at, now())
WHERE phone_verified IS NOT TRUE;

-- ---------------------------------------------------------------------------
-- Helper: host contact payload (SECURITY DEFINER — bypasses hosts RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.host_contact_json_for_host(p_host_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  SELECT h.name, h.phone
  INTO v_name, v_phone
  FROM public.hosts h
  WHERE h.id = p_host_id;

  IF NOT FOUND OR v_phone IS NULL OR trim(v_phone) = '' THEN
    RAISE EXCEPTION 'Host contact unavailable';
  END IF;

  RETURN jsonb_build_object(
    'host_name', coalesce(nullif(trim(v_name), ''), 'Host'),
    'host_phone', regexp_replace(v_phone, '\D', '', 'g')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.host_contact_json_for_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.host_contact_json_for_host(uuid) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- RPC: book pay later (OTP required) → booking_id + host contact
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, text, boolean, boolean, timestamptz
);

DROP FUNCTION IF EXISTS public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, text, boolean
);

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
  p_otp_verification_token uuid,
  p_special_requests text DEFAULT NULL,
  p_include_decoration boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_verified_at timestamptz := now();
  v_digits text;
  v_host jsonb;
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

  PERFORM public.consume_booking_inquiry_otp(p_otp_verification_token, p_guest_phone);

  v_host := public.host_contact_json_for_host(p_host_id);

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
    'pending_host',
    'inquiry',
    'book_pay_later',
    true,
    v_verified_at,
    nullif(trim(coalesce(p_special_requests, '')), ''),
    coalesce(p_include_decoration, false)
  );

  RETURN jsonb_build_object('booking_id', v_id) || v_host;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: make offer (OTP required) → booking_id + host contact
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, integer, text, text, boolean, timestamptz
);

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
  p_otp_verification_token uuid,
  p_num_guests integer DEFAULT 1,
  p_offer_message text DEFAULT NULL,
  p_special_requests text DEFAULT NULL
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
  v_verified_at timestamptz := now();
  v_digits text;
  v_host jsonb;
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

  PERFORM public.consume_booking_inquiry_otp(p_otp_verification_token, p_guest_phone);

  v_host := public.host_contact_json_for_host(p_host_id);

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
    'pending_host',
    'offer_pending',
    'make_offer',
    p_offer_amount,
    nullif(trim(coalesce(p_offer_message, '')), ''),
    true,
    v_verified_at,
    v_note
  );

  RETURN jsonb_build_object('booking_id', v_id) || v_host;
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
  uuid,
  text,
  boolean
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
  uuid,
  integer,
  text,
  text
) TO anon, authenticated;
