/*
  # Restore catalog listings (Rishikesh, Noida, Greater Noida, etc.)

  Migration 20260519150000 deactivated ~31 properties with host_id IS NULL.
  Those were the original marketplace catalog rows guests could browse before
  host accounts were linked. Reactivate them and only enforce host-phone when
  a host_id is present.
*/

-- Bring back all catalog rows that were hidden solely for missing host_id
UPDATE public.properties
SET is_active = true, updated_at = now()
WHERE host_id IS NULL
  AND is_active = false;

-- Allow active listings without a linked host (catalog / legacy imports).
-- Still block activation when host_id is set but host has no phone.
CREATE OR REPLACE FUNCTION public.enforce_host_phone_for_active_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS TRUE AND NEW.host_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM hosts h
      WHERE h.id = NEW.host_id
        AND h.phone IS NOT NULL
        AND trim(h.phone) <> ''
    ) THEN
      NEW.is_active := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
