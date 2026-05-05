/*
  # Fix Security Issues - Indexes and RLS Optimization

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add index on `bookings.property_id`
  - Add index on `expert_requests.claimed_by`
  - Add index on `expert_requests.property_id`
  - Add index on `external_reviews.host_id`
  - Add index on `external_reviews.property_id`
  - Add index on `import_jobs.property_id`

  ### 2. Optimize RLS Policies (Auth Function Initialization)
  Replace direct `auth.uid()` calls with `(select auth.uid())` to prevent re-evaluation per row:
  - Update all policies on `hosts` table
  - Update all policies on `subscriptions` table
  - Update all policies on `import_jobs` table
  - Update all policies on `external_reviews` table
  - Update all policies on `view_events` table
  - Update all policies on `expert_requests` table
  - Update all policies on `bookings` table

  ### 3. Remove Unused Indexes
  These indexes were created but not being used by queries:
  - Drop `idx_hosts_email`
  - Drop `idx_properties_host_id`
  - Drop `idx_bookings_host_id`
  - Drop `idx_subscriptions_host_id`
  - Drop `idx_subscriptions_property_id`
  - Drop `idx_import_jobs_host_id`
  - Drop `idx_view_events_entity`
  - Drop `idx_view_events_timestamp`
  - Drop `idx_expert_requests_host_id`
  - Drop `idx_expert_requests_status`

  ### 4. Fix Multiple Permissive Policies
  Combine multiple SELECT policies on `bookings` table into single policies with OR conditions

  ## Notes
  - Foreign key indexes improve JOIN performance
  - RLS optimization reduces query overhead at scale
  - Removing unused indexes reduces write overhead and storage
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Index for bookings.property_id foreign key
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON public.bookings(property_id);

-- Indexes for expert_requests foreign keys
CREATE INDEX IF NOT EXISTS idx_expert_requests_claimed_by ON public.expert_requests(claimed_by);
CREATE INDEX IF NOT EXISTS idx_expert_requests_property_id ON public.expert_requests(property_id);

-- Indexes for external_reviews foreign keys
CREATE INDEX IF NOT EXISTS idx_external_reviews_host_id ON public.external_reviews(host_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_property_id ON public.external_reviews(property_id);

-- Index for import_jobs.property_id foreign key
CREATE INDEX IF NOT EXISTS idx_import_jobs_property_id ON public.import_jobs(property_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - HOSTS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Hosts can view own profile" ON public.hosts;
DROP POLICY IF EXISTS "Hosts can update own profile" ON public.hosts;
DROP POLICY IF EXISTS "New users can create host profile" ON public.hosts;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Hosts can view own profile"
  ON public.hosts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Hosts can update own profile"
  ON public.hosts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "New users can create host profile"
  ON public.hosts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - SUBSCRIPTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Hosts can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Hosts can create own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Hosts can update own subscriptions" ON public.subscriptions;

CREATE POLICY "Hosts can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can create own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - IMPORT_JOBS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Hosts can view own import jobs" ON public.import_jobs;
DROP POLICY IF EXISTS "Hosts can create import jobs" ON public.import_jobs;

CREATE POLICY "Hosts can view own import jobs"
  ON public.import_jobs FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can create import jobs"
  ON public.import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - EXTERNAL_REVIEWS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Hosts can create external reviews" ON public.external_reviews;

CREATE POLICY "Hosts can create external reviews"
  ON public.external_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - VIEW_EVENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Hosts can view events for their entities" ON public.view_events;

CREATE POLICY "Hosts can view events for their entities"
  ON public.view_events FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN entity_type = 'host' THEN 
        entity_id IN (
          SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
        )
      WHEN entity_type = 'property' THEN
        entity_id IN (
          SELECT p.id FROM public.properties p
          JOIN public.hosts h ON p.host_id = h.id
          WHERE h.user_id = (select auth.uid())
        )
      ELSE false
    END
  );

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - EXPERT_REQUESTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Hosts can view own expert requests" ON public.expert_requests;
DROP POLICY IF EXISTS "Hosts can create expert requests" ON public.expert_requests;

CREATE POLICY "Hosts can view own expert requests"
  ON public.expert_requests FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can create expert requests"
  ON public.expert_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 8. FIX MULTIPLE PERMISSIVE POLICIES - BOOKINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Guests can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can view their property bookings" ON public.bookings;

-- Create a single optimized policy that handles both cases
CREATE POLICY "Users can view relevant bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    guest_email = (select auth.jwt()->>'email')
    OR
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 9. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_hosts_email;
DROP INDEX IF EXISTS public.idx_properties_host_id;
DROP INDEX IF EXISTS public.idx_bookings_host_id;
DROP INDEX IF EXISTS public.idx_subscriptions_host_id;
DROP INDEX IF EXISTS public.idx_subscriptions_property_id;
DROP INDEX IF EXISTS public.idx_import_jobs_host_id;
DROP INDEX IF EXISTS public.idx_view_events_entity;
DROP INDEX IF EXISTS public.idx_view_events_timestamp;
DROP INDEX IF EXISTS public.idx_expert_requests_host_id;
DROP INDEX IF EXISTS public.idx_expert_requests_status;