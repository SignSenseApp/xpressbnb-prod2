/*
  # Booking schema gaps + host phone access after paid booking

  - Adds check_out_date / include_decoration when missing (frontend already sends them).
  - Lets authenticated guests read host rows only after a confirmed, paid booking
    tied to their JWT email (guest_user_id is not on bookings; guest_email is).
*/

-- check_out_date (used by triggers + guest booking UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_out_date'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN check_out_date date;
  END IF;
END $$;

-- decoration add-on flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'include_decoration'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN include_decoration boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Paid guests may read host contact for their confirmed stay
DROP POLICY IF EXISTS "Guest can view host phone after booking" ON public.hosts;

CREATE POLICY "Guest can view host phone after booking"
  ON public.hosts FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT b.host_id
      FROM public.bookings b
      WHERE b.guest_email = (select auth.jwt()->>'email')
        AND b.status = 'confirmed'
        AND b.payment_status = 'paid'
        AND b.host_id IS NOT NULL
    )
  );

-- Availability check without exposing guest PII (anon cannot SELECT bookings directly).
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
      AND b.status IN ('pending', 'confirmed')
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
