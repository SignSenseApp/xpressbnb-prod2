/*
  Launch hardening: close public RPC bypass, validate guest email server-side.
*/

-- ---------------------------------------------------------------------------
-- 1. Revoke direct anon/authenticated access to inquiry create RPCs
--    Guests must use submit-booking-inquiry edge function (service role).
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, uuid, text, boolean, text, text, boolean
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, uuid, integer, text, text, text, text, boolean
) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Email validation helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_guest_email(p_email text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF length(v_email) > 254 THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;
  IF v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Patch create_pending_booking — validate email before insert
-- ---------------------------------------------------------------------------

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
  PERFORM public.validate_guest_email(p_guest_email);

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
    SELECT 1 FROM public.properties WHERE id = p_property_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Property not available';
  END IF;

  IF p_host_id IS NULL THEN
    RAISE EXCEPTION 'Property not available';
  END IF;

  IF p_otp_verification_token IS NOT NULL THEN
  BEGIN
    PERFORM public.consume_booking_inquiry_otp(p_otp_verification_token, p_guest_phone);
    v_use_otp := true;
  EXCEPTION WHEN OTHERS THEN
    v_use_otp := false;
  END;
  END IF;

  v_spam := public.compute_inquiry_spam_score(
    p_guest_email, p_guest_phone, p_property_id,
    p_submission_ip, p_device_fingerprint, p_turnstile_passed
  );

  IF v_spam >= 90 THEN
    RAISE EXCEPTION 'Too many inquiries. Please try again later.';
  END IF;

  v_ref := public.generate_inquiry_customer_reference();

  INSERT INTO public.bookings (
    id, property_id, host_id, guest_name, guest_email, guest_phone,
    check_in_date, check_out_date, checkin, checkout, num_guests,
    booking_type, amount_total, total_price, nights, status, payment_status,
    inquiry_type, phone_verified, phone_verified_at, special_requests,
    include_decoration, customer_reference, spam_score, submission_ip, device_fingerprint
  )
  VALUES (
    v_id, p_property_id, p_host_id, trim(p_guest_name), trim(lower(p_guest_email)), v_digits,
    p_check_in, p_check_out, p_check_in, p_check_out, p_num_guests,
    'full_day', p_amount_total, p_total_price, p_nights,
    CASE WHEN v_use_otp THEN 'pending_host' ELSE 'inquiry_preparing' END,
    'inquiry', 'book_pay_later', v_use_otp, CASE WHEN v_use_otp THEN now() ELSE NULL END,
    nullif(trim(coalesce(p_special_requests, '')), ''),
    coalesce(p_include_decoration, false), v_ref, v_spam,
    nullif(trim(coalesce(p_submission_ip, '')), ''),
    nullif(trim(coalesce(p_device_fingerprint, '')), '')
  );

  INSERT INTO public.inquiry_submission_log (submission_ip, guest_email, guest_phone, property_id, booking_id)
  VALUES (
    coalesce(nullif(trim(coalesce(p_submission_ip, '')), ''), 'unknown'),
    trim(lower(p_guest_email)), v_digits, p_property_id, v_id
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
-- 4. Patch create_make_offer_inquiry — validate email
-- ---------------------------------------------------------------------------

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
  PERFORM public.validate_guest_email(p_guest_email);

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
  EXCEPTION WHEN OTHERS THEN
    v_use_otp := false;
  END;
  END IF;

  v_spam := public.compute_inquiry_spam_score(
    p_guest_email, p_guest_phone, p_property_id,
    p_submission_ip, p_device_fingerprint, p_turnstile_passed
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
      p_offer_amount, v_nights, v_total,
      CASE WHEN nullif(trim(coalesce(p_offer_message, '')), '') IS NOT NULL
        THEN ' Message: ' || trim(p_offer_message) ELSE '' END
    )
  );

  INSERT INTO public.bookings (
    id, property_id, host_id, guest_name, guest_email, guest_phone,
    check_in_date, check_out_date, checkin, checkout, num_guests,
    booking_type, amount_total, total_price, nights, status, payment_status,
    inquiry_type, offer_amount, offer_message, phone_verified, phone_verified_at,
    special_requests, customer_reference, spam_score, submission_ip, device_fingerprint
  )
  VALUES (
    v_id, p_property_id, p_host_id, trim(p_guest_name), trim(lower(p_guest_email)), v_digits,
    p_check_in, p_check_out, p_check_in, p_check_out, p_num_guests,
    'full_day', v_total, v_total, v_nights,
    CASE WHEN v_use_otp THEN 'pending_host' ELSE 'inquiry_preparing' END,
    'offer_pending', 'make_offer', p_offer_amount,
    nullif(trim(coalesce(p_offer_message, '')), ''),
    v_use_otp, CASE WHEN v_use_otp THEN now() ELSE NULL END,
    v_note, v_ref, v_spam,
    nullif(trim(coalesce(p_submission_ip, '')), ''),
    nullif(trim(coalesce(p_device_fingerprint, '')), '')
  );

  INSERT INTO public.inquiry_submission_log (submission_ip, guest_email, guest_phone, property_id, booking_id)
  VALUES (
    coalesce(nullif(trim(coalesce(p_submission_ip, '')), ''), 'unknown'),
    trim(lower(p_guest_email)), v_digits, p_property_id, v_id
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

-- Service role only (edge functions)
GRANT EXECUTE ON FUNCTION public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, uuid, text, boolean, text, text, boolean
) TO postgres, service_role;

GRANT EXECUTE ON FUNCTION public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, uuid, integer, text, text, text, text, boolean
) TO postgres, service_role;
