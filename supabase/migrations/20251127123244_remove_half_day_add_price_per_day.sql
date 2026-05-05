/*
  # Remove Half Day Booking System

  1. Changes
    - Add `price_per_day` column to properties table
    - Migrate data from `price_full_day` to `price_per_day`
    - Remove `price_half_day` column (keep `price_full_day` for backward compatibility)

  2. Notes
    - This migration converts the system to full-day only bookings
    - Existing `price_full_day` values are copied to `price_per_day`
    - The `price_full_day` column is kept temporarily for backward compatibility
*/

-- Add price_per_day column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'price_per_day'
  ) THEN
    ALTER TABLE properties ADD COLUMN price_per_day integer;
  END IF;
END $$;

-- Migrate data from price_full_day to price_per_day
UPDATE properties
SET price_per_day = COALESCE(price_full_day, 0)
WHERE price_per_day IS NULL;

-- Make price_per_day NOT NULL with default 0
ALTER TABLE properties ALTER COLUMN price_per_day SET DEFAULT 0;
ALTER TABLE properties ALTER COLUMN price_per_day SET NOT NULL;

-- Make price_full_day nullable for backward compatibility
ALTER TABLE properties ALTER COLUMN price_full_day DROP NOT NULL;

-- Drop price_half_day column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'price_half_day'
  ) THEN
    ALTER TABLE properties DROP COLUMN price_half_day;
  END IF;
END $$;
