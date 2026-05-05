/*
  # Fix Property Calendar RLS for Booking Triggers

  ## Overview
  This migration fixes the RLS violation when bookings are created by allowing
  the automated booking triggers to bypass RLS restrictions safely.

  ## Problem
  - When a guest creates a booking, triggers attempt to insert into property_calendar
  - RLS policies only allow authenticated hosts to insert into property_calendar
  - This causes "new row violates row-level security policy" errors

  ## Solution
  - Modify trigger functions to use SECURITY DEFINER
  - This allows the functions to run with the privileges of the function owner (postgres)
  - The functions already have proper validation logic built in
  - Only affects automated system processes, not direct user access

  ## Security Notes
  - RLS remains enabled on the table
  - Direct user access still requires proper permissions
  - Trigger functions only run on specific conditions (confirmed/paid bookings)
  - Functions validate booking data before modifying calendar
*/

-- Recreate auto_block_booked_dates function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION auto_block_booked_dates()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Recreate auto_unblock_cancelled_dates function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION auto_unblock_cancelled_dates()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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
        notes = REPLACE(REPLACE(notes, 'Auto-blocked by booking #' || NEW.id, ''), 'Booked #' || NEW.id, ''),
        updated_at = now()
      WHERE property_id = NEW.property_id 
      AND date = booking_date
      AND notes LIKE '%#' || NEW.id || '%';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are properly attached (should already exist, but recreating for safety)
DROP TRIGGER IF EXISTS trigger_auto_block_booked_dates ON bookings;
CREATE TRIGGER trigger_auto_block_booked_dates
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_block_booked_dates();

DROP TRIGGER IF EXISTS trigger_auto_unblock_cancelled_dates ON bookings;
CREATE TRIGGER trigger_auto_unblock_cancelled_dates
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_unblock_cancelled_dates();
