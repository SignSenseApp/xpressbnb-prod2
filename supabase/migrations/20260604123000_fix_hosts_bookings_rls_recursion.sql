/*
  # Fix infinite recursion between hosts and bookings RLS policies

  ## Problem (production-breaking)
  Postgres was raising `infinite recursion detected in policy for relation "hosts"`
  on EVERY authenticated read of `hosts`, so logged-in hosts always resolved to a
  null profile and were dropped on the public homepage.

  The cycle:
    - hosts policy "Guest can view host phone after booking" subqueries `bookings`
    - bookings policy "Hosts view bookings for their properties" subqueries `hosts`
  => evaluating hosts RLS triggers bookings RLS which triggers hosts RLS, forever.

  This also broke the dashboard Bookings list and any authenticated query that
  touched hosts (properties, subscriptions, etc.), because they all funnel through
  hosts RLS.

  ## Fix
  Introduce a SECURITY DEFINER helper that returns the current user's host ids
  WITHOUT going through RLS, and use it in the bookings host-ownership policies so
  bookings RLS no longer re-enters hosts RLS. This breaks the cycle in both
  directions while preserving identical access semantics.
*/

CREATE OR REPLACE FUNCTION public.current_host_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.hosts WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_host_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.current_host_ids() TO authenticated;

-- Rewrite the two bookings policies that referenced `hosts` directly. Using the
-- SECURITY DEFINER function means bookings RLS no longer evaluates hosts RLS.
DROP POLICY IF EXISTS "Hosts view bookings for their properties" ON public.bookings;
CREATE POLICY "Hosts view bookings for their properties"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    phone_verified IS TRUE
    AND host_id IN (SELECT public.current_host_ids())
  );

DROP POLICY IF EXISTS "Hosts update bookings for their properties" ON public.bookings;
CREATE POLICY "Hosts update bookings for their properties"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (host_id IN (SELECT public.current_host_ids()))
  WITH CHECK (host_id IN (SELECT public.current_host_ids()));
