-- Guest calendar: expose blocked nights (calendar + inquiry/booking holds)
-- without letting anon read booking rows.

CREATE OR REPLACE FUNCTION public.list_property_unavailable_dates(
  p_property_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE(unavailable_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT d.unavailable_date
  FROM (
    SELECT c.date AS unavailable_date
    FROM public.property_calendar c
    WHERE c.property_id = p_property_id
      AND c.is_available = false
      AND c.date >= p_from
      AND c.date <= p_to

    UNION ALL

    SELECT gs::date AS unavailable_date
    FROM public.bookings b
    JOIN LATERAL generate_series(
      GREATEST(b.check_in_date, p_from),
      LEAST(COALESCE(b.check_out_date, b.check_in_date + 1) - 1, p_to),
      interval '1 day'
    ) AS gs
      ON GREATEST(b.check_in_date, p_from)
      <= LEAST(COALESCE(b.check_out_date, b.check_in_date + 1) - 1, p_to)
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
      AND b.check_in_date <= p_to
      AND COALESCE(b.check_out_date, b.check_in_date + 1) > p_from
  ) d
  ORDER BY 1;
$function$;

REVOKE ALL ON FUNCTION public.list_property_unavailable_dates(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_property_unavailable_dates(uuid, date, date) TO anon, authenticated;
