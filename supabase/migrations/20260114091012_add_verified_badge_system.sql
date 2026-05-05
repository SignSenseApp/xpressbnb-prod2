/*
  # Add Verified Badge System for Properties

  ## Overview
  This migration implements a verified badge system for properties based on host subscription status.
  Properties belonging to hosts with active paid subscriptions are automatically marked as verified.

  ## Changes
  
  1. Database Updates
    - Rename `verified_badge` to `is_verified` for clarity (if needed)
    - Add index on `is_verified` for efficient sorting
  
  2. Verification Logic
    - Create function to update property verification status
    - Create trigger to automatically update verification when host subscription changes
    - Properties are verified when host has subscription_status = 'active'
  
  3. Security
    - RLS policies remain unchanged
    - Verification is automatically managed by the system
    - No manual verification allowed (prevents abuse)

  ## Business Rules
  - is_verified = true: Host has active paid subscription
  - is_verified = false: Host is on trial, paused, or cancelled subscription
  - Verification updates automatically when subscription status changes
  - Free tier hosts cannot have verified badges
*/

-- Ensure is_verified column exists (it may already exist as verified_badge)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'is_verified'
  ) THEN
    -- If verified_badge exists, rename it to is_verified
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'properties' AND column_name = 'verified_badge'
    ) THEN
      ALTER TABLE properties RENAME COLUMN verified_badge TO is_verified;
    ELSE
      -- Otherwise create the column
      ALTER TABLE properties ADD COLUMN is_verified boolean DEFAULT false NOT NULL;
    END IF;
  END IF;
END $$;

-- Create index for efficient sorting by verification status
CREATE INDEX IF NOT EXISTS idx_properties_is_verified ON properties(is_verified DESC);

-- Create compound index for verified + active properties (most common query)
CREATE INDEX IF NOT EXISTS idx_properties_verified_active ON properties(is_verified DESC, is_active) WHERE is_active = true;

-- Function to update property verification based on host subscription
CREATE OR REPLACE FUNCTION update_property_verification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a host's subscription status changes, update all their properties
  IF (TG_OP = 'UPDATE' AND OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) OR TG_OP = 'INSERT' THEN
    UPDATE properties
    SET is_verified = (NEW.subscription_status = 'active')
    WHERE host_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update property verification when host subscription changes
DROP TRIGGER IF EXISTS trigger_update_property_verification ON hosts;
CREATE TRIGGER trigger_update_property_verification
  AFTER INSERT OR UPDATE OF subscription_status ON hosts
  FOR EACH ROW
  EXECUTE FUNCTION update_property_verification();

-- Function to set property verification when property is created or host_id changes
CREATE OR REPLACE FUNCTION set_property_verification_on_create()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host_subscription_status text;
BEGIN
  -- Get the host's current subscription status
  SELECT subscription_status INTO host_subscription_status
  FROM hosts
  WHERE id = NEW.host_id;
  
  -- Set is_verified based on subscription status
  IF host_subscription_status = 'active' THEN
    NEW.is_verified = true;
  ELSE
    NEW.is_verified = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set verification when property is created or host changes
DROP TRIGGER IF EXISTS trigger_set_property_verification_on_create ON properties;
CREATE TRIGGER trigger_set_property_verification_on_create
  BEFORE INSERT OR UPDATE OF host_id ON properties
  FOR EACH ROW
  WHEN (NEW.host_id IS NOT NULL)
  EXECUTE FUNCTION set_property_verification_on_create();

-- One-time update: Set verification status for all existing properties
UPDATE properties p
SET is_verified = (h.subscription_status = 'active')
FROM hosts h
WHERE p.host_id = h.id;
