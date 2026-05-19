/*
  # Guest booking inquiries (no Razorpay on property Book flow)

  create_pending_booking now records inquiry_pending + payment_status inquiry
  instead of pending/pending (payment happens off-platform for guests).
*/

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
  p_include_decoration boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  IF NOT public.is_property_available(p_property_id, p_check_in, p_check_out) THEN
    RAISE EXCEPTION 'Booking unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Property not available';
  END IF;

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
    special_requests,
    include_decoration
  ) VALUES (
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
    'inquiry_pending',
    'inquiry',
    nullif(trim(coalesce(p_special_requests, '')), ''),
    coalesce(p_include_decoration, false)
  );

  RETURN v_id;
END;
$$;
