/*
  # Fix guest booking RLS

  Anonymous guests could INSERT bookings but not read them back (INSERT ... RETURNING
  requires SELECT). The prior SELECT policy is authenticated-only.
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
    'pending',
    'pending',
    nullif(trim(coalesce(p_special_requests, '')), ''),
    coalesce(p_include_decoration, false)
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
    AND status = 'pending'
    AND payment_status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, text, boolean
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.attach_booking_razorpay_order(uuid, text) TO anon, authenticated;
