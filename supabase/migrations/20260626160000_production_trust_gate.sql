/*
  Milestone 15 — Production trust gate: Ops approval is the only path that releases guest contact.

  - inquiry_contact_released() central contract (server-side)
  - host_inquiries view masks PII until release (defense in depth)
  - Host direct SELECT on bookings limited to released inquiries only
  - Notification triggers gated on full release contract
  - OTP fast-path disabled (always inquiry_preparing → Ops approve)
*/

-- ---------------------------------------------------------------------------
-- 1. Contact release contract
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.inquiry_contact_released(b public.bookings)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.phone_verified IS TRUE
    AND b.reviewed_at IS NOT NULL
    AND b.reviewed_by IS NOT NULL
    AND b.status NOT IN ('inquiry_preparing', 'inquiry_pending')
$$;

COMMENT ON FUNCTION public.inquiry_contact_released(public.bookings) IS
  'True only after Ops quality review released guest contact to the host.';

-- ---------------------------------------------------------------------------
-- 2. Host-safe read surface (masked PII until release)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.host_inquiries
WITH (security_invoker = false) AS
SELECT
  b.id,
  b.property_id,
  b.host_id,
  b.status,
  b.booking_type,
  b.check_in_date,
  b.check_out_date,
  b.checkin,
  b.checkout,
  b.created_at,
  b.updated_at,
  b.num_guests,
  b.nights,
  b.amount_total,
  b.total_price,
  b.offer_amount,
  b.offer_message,
  b.inquiry_type,
  b.payment_status,
  b.payment_method,
  b.paid_at,
  b.include_decoration,
  b.special_requests,
  b.time_slot,
  b.source,
  b.spam_score,
  b.phone_verified,
  b.phone_verified_at,
  b.host_decision_at,
  b.host_decision_note,
  b.host_viewed_at,
  b.reviewed_at,
  b.reviewed_by,
  b.review_reason,
  b.approval_source,
  CASE WHEN public.inquiry_contact_released(b) THEN b.guest_name ELSE NULL END AS guest_name,
  CASE WHEN public.inquiry_contact_released(b) THEN b.guest_email ELSE NULL END AS guest_email,
  CASE WHEN public.inquiry_contact_released(b) THEN b.guest_phone ELSE NULL END AS guest_phone,
  CASE WHEN public.inquiry_contact_released(b) THEN b.customer_reference ELSE NULL END AS customer_reference,
  public.inquiry_contact_released(b) AS contact_released,
  (
    b.status IN ('inquiry_preparing', 'inquiry_pending')
    AND NOT public.inquiry_contact_released(b)
  ) AS quality_review_pending
FROM public.bookings b
WHERE b.host_id IN (SELECT public.current_host_ids());

COMMENT ON VIEW public.host_inquiries IS
  'Host dashboard read model — guest contact columns are NULL until inquiry_contact_released.';

GRANT SELECT ON public.host_inquiries TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS — hosts cannot read unreleased rows from bookings table directly
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Hosts view bookings for their properties" ON public.bookings;

CREATE POLICY "Hosts view bookings for their properties"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    public.inquiry_contact_released(bookings)
    AND host_id IN (SELECT public.current_host_ids())
  );

-- ---------------------------------------------------------------------------
-- 4. Disable OTP fast-path (Ops approval is the only release gate)
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

  -- Ops quality review is mandatory; OTP tokens are ignored at launch.
  v_use_otp := false;

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
    'inquiry_preparing',
    'inquiry', 'book_pay_later', false, NULL,
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
    'status', 'inquiry_preparing',
    'spam_score', v_spam,
    'requires_review', true,
    'frequent_amigo', public.frequent_amigo_status_for_phone(v_digits)
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

  v_use_otp := false;

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
    'inquiry_preparing',
    'offer_pending', 'make_offer', p_offer_amount,
    nullif(trim(coalesce(p_offer_message, '')), ''),
    false, NULL,
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
    'status', 'inquiry_preparing',
    'spam_score', v_spam,
    'requires_review', true,
    'frequent_amigo', public.frequent_amigo_status_for_phone(v_digits)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Approve must always record reviewer (contract: reviewed_by NOT NULL)
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
  IF p_reviewed_by IS NULL THEN
    RAISE EXCEPTION 'Reviewer identity is required';
  END IF;

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
    reviewed_at = now(),
    review_reason = 'quality_review_passed',
    approval_source = 'xpressbnb_operations'
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'customer_reference', v_row.customer_reference,
    'status', 'pending_host',
    'review_reason', 'quality_review_passed',
    'approval_source', 'xpressbnb_operations',
    'contact_released', true
  ) || v_host;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Host actions gated on contact release
-- ---------------------------------------------------------------------------

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
    AND public.inquiry_contact_released(b)
    AND b.status = 'pending_host'
    AND b.host_id IN (SELECT public.current_host_ids());
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Notifications — never enqueue host contact before release
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_verified_booking_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.inquiry_contact_released(NEW) THEN
    RETURN NEW;
  END IF;

  IF NEW.inquiry_type IS NOT NULL
    AND (
      TG_OP = 'INSERT'
      OR (
        TG_OP = 'UPDATE'
        AND (OLD.phone_verified IS DISTINCT FROM TRUE OR OLD.reviewed_at IS NULL)
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
        'customer_reference', NEW.customer_reference
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_host_decision_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT public.inquiry_contact_released(NEW) THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.booking_notification_queue (booking_id, event_type, payload)
    VALUES (
      NEW.id,
      'inquiry_host_accepted',
      jsonb_build_object(
        'status', NEW.status,
        'property_id', NEW.property_id,
        'host_id', NEW.host_id,
        'customer_reference', NEW.customer_reference
      )
    );
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.booking_notification_queue (booking_id, event_type, payload)
    VALUES (
      NEW.id,
      'inquiry_host_rejected',
      jsonb_build_object(
        'status', NEW.status,
        'property_id', NEW.property_id,
        'host_id', NEW.host_id,
        'customer_reference', NEW.customer_reference,
        'host_decision_note', NEW.host_decision_note
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_inquiry_for_host(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_inquiry_for_host(uuid, uuid) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 8. Legacy rows — backfill review metadata for pre-gate inquiries
-- ---------------------------------------------------------------------------

UPDATE public.bookings b
SET
  reviewed_at = coalesce(b.reviewed_at, b.phone_verified_at, b.created_at),
  reviewed_by = coalesce(
    b.reviewed_by,
    (SELECT au.id FROM public.admin_users au LIMIT 1)
  ),
  approval_source = coalesce(b.approval_source, 'xpressbnb_operations'),
  review_reason = coalesce(b.review_reason, 'legacy_phone_verified_backfill')
WHERE b.phone_verified IS TRUE
  AND b.reviewed_at IS NULL;
