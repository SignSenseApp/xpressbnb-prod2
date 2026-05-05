/*
  # Add Property Badges and Indian Market Features

  1. Changes
    - Add `is_couple_friendly` column to properties table
    - Add `accepts_local_ids` column to properties table
    - Add `hourly_stay_available` column to properties table
    - Add `is_private_space` column to properties table
    - Add `instant_booking` column to properties table
    - Add `no_brokerage` column to properties table (default true)
    - Add `pay_at_property` column to properties table (default true)
    
  2. Security
    - No RLS changes needed (uses existing property policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'is_couple_friendly'
  ) THEN
    ALTER TABLE properties ADD COLUMN is_couple_friendly boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'accepts_local_ids'
  ) THEN
    ALTER TABLE properties ADD COLUMN accepts_local_ids boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'hourly_stay_available'
  ) THEN
    ALTER TABLE properties ADD COLUMN hourly_stay_available boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'is_private_space'
  ) THEN
    ALTER TABLE properties ADD COLUMN is_private_space boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'instant_booking'
  ) THEN
    ALTER TABLE properties ADD COLUMN instant_booking boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'no_brokerage'
  ) THEN
    ALTER TABLE properties ADD COLUMN no_brokerage boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'pay_at_property'
  ) THEN
    ALTER TABLE properties ADD COLUMN pay_at_property boolean DEFAULT true;
  END IF;
END $$;