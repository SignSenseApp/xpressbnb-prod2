/*
  # Create Property Calendar Availability System

  ## Overview
  This migration creates a comprehensive calendar system for property availability
  and dynamic pricing management.

  ## 1. New Tables
    
  ### `property_calendar`
  Stores availability and pricing information for each property by date
  - `id` (uuid, primary key) - Unique identifier
  - `property_id` (uuid, foreign key) - References properties table
  - `date` (date, not null) - The specific date
  - `is_available` (boolean, default true) - Whether the date is available for booking
  - `price_override` (integer, nullable) - Custom price for this date (overrides property base price)
  - `minimum_stay` (integer, default 1) - Minimum nights required starting from this date
  - `notes` (text, nullable) - Internal notes for the host
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## 2. Indexes
  - Unique index on (property_id, date) to prevent duplicate entries
  - Index on property_id for fast lookups
  - Index on date for range queries

  ## 3. Security
  - Enable RLS on property_calendar table
  - Anyone can view availability for active properties (guest view)
  - Only property hosts can insert/update/delete their property calendar
  
  ## 4. Features
  - Supports dynamic pricing per date
  - Minimum stay requirements per date
  - Manual blocking/unblocking of dates
  - Auto-blocking via booking integration (handled in application logic)
  - Prepared for future iCal sync integration
*/

-- Create property_calendar table
CREATE TABLE IF NOT EXISTS property_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_available boolean DEFAULT true NOT NULL,
  price_override integer CHECK (price_override IS NULL OR price_override >= 0),
  minimum_stay integer DEFAULT 1 NOT NULL CHECK (minimum_stay >= 1),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_property_date UNIQUE (property_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_calendar_property_id ON property_calendar(property_id);
CREATE INDEX IF NOT EXISTS idx_property_calendar_date ON property_calendar(date);
CREATE INDEX IF NOT EXISTS idx_property_calendar_property_date_range ON property_calendar(property_id, date);

-- Enable RLS
ALTER TABLE property_calendar ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view calendar for active properties
CREATE POLICY "Anyone can view calendar for active properties"
  ON property_calendar FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_calendar.property_id
      AND properties.is_active = true
    )
  );

-- Policy: Hosts can view their own property calendars
CREATE POLICY "Hosts can view their own property calendars"
  ON property_calendar FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_calendar.property_id
      AND properties.host_id IN (
        SELECT id FROM hosts WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Hosts can insert calendar entries for their properties
CREATE POLICY "Hosts can insert calendar entries for their properties"
  ON property_calendar FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_calendar.property_id
      AND properties.host_id IN (
        SELECT id FROM hosts WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Hosts can update their own property calendars
CREATE POLICY "Hosts can update their own property calendars"
  ON property_calendar FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_calendar.property_id
      AND properties.host_id IN (
        SELECT id FROM hosts WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_calendar.property_id
      AND properties.host_id IN (
        SELECT id FROM hosts WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Hosts can delete their own property calendar entries
CREATE POLICY "Hosts can delete their own property calendars"
  ON property_calendar FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_calendar.property_id
      AND properties.host_id IN (
        SELECT id FROM hosts WHERE user_id = auth.uid()
      )
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_property_calendar_updated_at ON property_calendar;
CREATE TRIGGER trigger_update_property_calendar_updated_at
  BEFORE UPDATE ON property_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_property_calendar_updated_at();

-- Function to auto-block dates when booking is confirmed
-- This creates calendar entries for booked dates if they don't exist
CREATE OR REPLACE FUNCTION auto_block_booked_dates()
RETURNS TRIGGER AS $$
DECLARE
  booking_date date;
BEGIN
  -- Only proceed if status is confirmed or paid
  IF NEW.status IN ('confirmed', 'paid') THEN
    -- Loop through all dates in the booking range
    FOR booking_date IN 
      SELECT generate_series(NEW.check_in_date, NEW.check_out_date - interval '1 day', interval '1 day')::date
    LOOP
      -- Insert or update calendar entry to mark as unavailable
      INSERT INTO property_calendar (property_id, date, is_available, notes)
      VALUES (NEW.property_id, booking_date, false, 'Auto-blocked by booking #' || NEW.id)
      ON CONFLICT (property_id, date)
      DO UPDATE SET 
        is_available = false,
        notes = COALESCE(property_calendar.notes || ' | ', '') || 'Booked #' || NEW.id,
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-block dates when booking is created or updated
DROP TRIGGER IF EXISTS trigger_auto_block_booked_dates ON bookings;
CREATE TRIGGER trigger_auto_block_booked_dates
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_block_booked_dates();

-- Function to unblock dates when booking is cancelled
CREATE OR REPLACE FUNCTION auto_unblock_cancelled_dates()
RETURNS TRIGGER AS $$
DECLARE
  booking_date date;
BEGIN
  -- Only proceed if status changed to cancelled
  IF OLD.status IN ('confirmed', 'paid') AND NEW.status = 'cancelled' THEN
    -- Loop through all dates in the booking range
    FOR booking_date IN 
      SELECT generate_series(NEW.check_in_date, NEW.check_out_date - interval '1 day', interval '1 day')::date
    LOOP
      -- Update calendar entry to mark as available (only if it was auto-blocked by this booking)
      UPDATE property_calendar
      SET 
        is_available = true,
        notes = REPLACE(notes, 'Auto-blocked by booking #' || NEW.id, ''),
        notes = REPLACE(notes, 'Booked #' || NEW.id, ''),
        updated_at = now()
      WHERE property_id = NEW.property_id 
      AND date = booking_date
      AND notes LIKE '%#' || NEW.id || '%';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to unblock dates when booking is cancelled
DROP TRIGGER IF EXISTS trigger_auto_unblock_cancelled_dates ON bookings;
CREATE TRIGGER trigger_auto_unblock_cancelled_dates
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_unblock_cancelled_dates();