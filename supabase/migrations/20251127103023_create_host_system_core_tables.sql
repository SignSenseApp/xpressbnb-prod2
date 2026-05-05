/*
  # XpressBnB Host System - Core Tables

  ## New Tables Created
  
  ### 1. hosts
    - Host profile and account information
    - Links to auth.users via user_id
    - Stores KYC status, ratings, subscription info
    
  ### 2. Extend properties table
    - Add host_id to link properties to hosts
    - Add listing_type (free/paid)
    - Add verification and expert listing flags
    - Add external calendar and listing data
    - Add statistics tracking
    - Add slug for SEO-friendly URLs

  ## Security
    - Enable RLS on hosts table
    - Add policies for host profile management
    - Public can view host profiles (for guest bookings)
*/

-- Create hosts table first
CREATE TABLE IF NOT EXISTS hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  bio text DEFAULT '',
  kyc_status text DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified')),
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_bookings integer DEFAULT 0,
  total_views integer DEFAULT 0,
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('active', 'paused', 'cancelled', 'trial')),
  subscription_provider_id text,
  subscription_next_billing timestamptz,
  payout_details jsonb DEFAULT '{"bank": "", "upi": ""}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index on hosts
CREATE INDEX IF NOT EXISTS idx_hosts_user_id ON hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_hosts_email ON hosts(email);

-- Enable RLS on hosts
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hosts table
CREATE POLICY "Hosts can view own profile"
  ON hosts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can update own profile"
  ON hosts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view public host profiles"
  ON hosts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "New users can create host profile"
  ON hosts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Now add columns to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'host_id'
  ) THEN
    ALTER TABLE properties ADD COLUMN host_id uuid REFERENCES hosts(id) ON DELETE CASCADE;
    CREATE INDEX idx_properties_host_id ON properties(host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'listing_type'
  ) THEN
    ALTER TABLE properties ADD COLUMN listing_type text DEFAULT 'free' CHECK (listing_type IN ('free', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'verified_badge'
  ) THEN
    ALTER TABLE properties ADD COLUMN verified_badge boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'expert_listed'
  ) THEN
    ALTER TABLE properties ADD COLUMN expert_listed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'external_calendars'
  ) THEN
    ALTER TABLE properties ADD COLUMN external_calendars jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'external_listings'
  ) THEN
    ALTER TABLE properties ADD COLUMN external_listings jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'stats'
  ) THEN
    ALTER TABLE properties ADD COLUMN stats jsonb DEFAULT '{"monthly_bookings": {}, "monthly_revenue": {}, "total_views": 0, "views_last_24h": 0}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'slug'
  ) THEN
    ALTER TABLE properties ADD COLUMN slug text;
  END IF;
END $$;
