/*
  # Frequent Amigo — verified guest progress (server-side only)

  - frequent_amigo_status_for_phone: SECURITY DEFINER, not granted to anon/authenticated
  - create_pending_booking / create_make_offer_inquiry append aggregate frequent_amigo jsonb
*/

CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone_verified_created
  ON public.bookings (guest_phone, created_at DESC)
  WHERE phone_verified = true;

CREATE OR REPLACE FUNCTION public.frequent_amigo_status_for_phone(p_guest_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_count integer;
  v_threshold constant integer := 3;
  v_window_days constant integer := 15;
BEGIN
  v_digits := regexp_replace(coalesce(trim(p_guest_phone), ''), '\D', '', 'g');
  v_digits := right(v_digits, 10);

  IF length(v_digits) <> 10 THEN
    RETURN jsonb_build_object(
      'qualifying_count', 0,
      'threshold', v_threshold,
      'unlocked', false,
      'window_days', v_window_days
    );
  END IF;

  SELECT count(DISTINCT property_id)::integer
  INTO v_count
  FROM public.bookings
  WHERE guest_phone = v_digits
    AND phone_verified = true
    AND created_at >= now() - make_interval(days => v_window_days)
    AND status NOT IN ('rejected', 'cancelled')
    AND inquiry_type IN ('book_pay_later', 'make_offer');

  RETURN jsonb_build_object(
    'qualifying_count', coalesce(v_count, 0),
    'threshold', v_threshold,
    'unlocked', coalesce(v_count, 0) >= v_threshold,
    'window_days', v_window_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.frequent_amigo_status_for_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.frequent_amigo_status_for_phone(text) FROM anon, authenticated;

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

  RETURN jsonb_build_object('booking_id', v_id)
    || v_host
    || jsonb_build_object(
      'frequent_amigo',
      public.frequent_amigo_status_for_phone(v_digits)
    );
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

  RETURN jsonb_build_object('booking_id', v_id)
    || v_host
    || jsonb_build_object(
      'frequent_amigo',
      public.frequent_amigo_status_for_phone(v_digits)
    );
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
