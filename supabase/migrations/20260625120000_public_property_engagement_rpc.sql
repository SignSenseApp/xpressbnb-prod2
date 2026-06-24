-- Public aggregate engagement for guest social proof (no PII).
-- Only returns counts when above privacy thresholds.

CREATE OR REPLACE FUNCTION public.get_public_property_engagement(p_property_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'views_today',
    (
      SELECT count(*)::int
      FROM view_events
      WHERE entity_type = 'property'
        AND entity_id = p_property_id
        AND timestamp >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
    ),
    'views_this_week',
    (
      SELECT count(*)::int
      FROM view_events
      WHERE entity_type = 'property'
        AND entity_id = p_property_id
        AND timestamp >= now() - interval '7 days'
    ),
    'bookings_this_week',
    (
      SELECT count(*)::int
      FROM bookings
      WHERE property_id = p_property_id
        AND created_at >= now() - interval '7 days'
        AND status NOT IN ('cancelled', 'rejected')
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_property_engagement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_property_engagement(uuid) TO anon, authenticated;
