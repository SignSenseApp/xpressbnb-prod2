/*
  # Fix Properties Table - Nullable Fields and Proper RLS

  ## Changes
  1. Schema Updates
    - Make latitude and longitude nullable with default values
    - This allows properties to be created without geocoding data initially
  
  2. Security Updates
    - Drop existing overly permissive RLS policies
    - Create proper restrictive RLS policies:
      - SELECT: Public can view active properties, hosts can view their own
      - INSERT: Authenticated hosts can create properties they own
      - UPDATE: Hosts can only update their own properties
      - DELETE: Hosts can only delete their own properties
    - All policies check authentication and ownership
*/

-- Make latitude and longitude nullable
ALTER TABLE properties 
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Set default values for latitude and longitude
ALTER TABLE properties 
  ALTER COLUMN latitude SET DEFAULT 0,
  ALTER COLUMN longitude SET DEFAULT 0;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create properties" ON properties;
DROP POLICY IF EXISTS "Anyone can update properties" ON properties;
DROP POLICY IF EXISTS "Anyone can delete properties" ON properties;
DROP POLICY IF EXISTS "Anyone can view active properties" ON properties;

-- Create proper restrictive SELECT policy
CREATE POLICY "Public can view active properties"
  ON properties FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Hosts can view their own properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = properties.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Create proper INSERT policy
CREATE POLICY "Authenticated hosts can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = properties.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Create proper UPDATE policy
CREATE POLICY "Hosts can update their own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = properties.host_id
      AND hosts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = properties.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Create proper DELETE policy
CREATE POLICY "Hosts can delete their own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = properties.host_id
      AND hosts.user_id = auth.uid()
    )
  );
