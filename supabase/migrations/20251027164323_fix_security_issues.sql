/*
  # Fix Security Issues

  1. Remove Unused Indexes
    - Drop `idx_properties_city` (not used in queries)
    - Drop `idx_properties_active` (not used in queries)
    - Drop `idx_properties_rating` (not used in queries)
    - Drop `idx_bookings_property` (not used in queries)
    - Drop `idx_bookings_date` (not used in queries)
    - Drop `idx_bookings_email` (not used in queries)

  2. Add RLS Policy for admin_users Table
    - Currently has RLS enabled but no policies
    - This is a security issue as the table is completely locked
    - Since this is for admin management, we'll add a restrictive policy
    - Only allow service role access (no direct user access)
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_properties_city;
DROP INDEX IF EXISTS idx_properties_active;
DROP INDEX IF EXISTS idx_properties_rating;
DROP INDEX IF EXISTS idx_bookings_property;
DROP INDEX IF EXISTS idx_bookings_date;
DROP INDEX IF EXISTS idx_bookings_email;

-- Add RLS policy for admin_users table
-- This policy allows no direct access - admin operations should be done via service role or edge functions
CREATE POLICY "No direct access to admin_users"
ON admin_users
FOR ALL
TO authenticated
USING (false);
