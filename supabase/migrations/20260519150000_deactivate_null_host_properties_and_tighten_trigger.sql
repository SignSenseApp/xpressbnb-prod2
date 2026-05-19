/*
  # Close the host-phone invariant for properties without a host

  Background: the previous migration
  `20260518130000_deactivate_properties_without_host_phone.sql` enforced
  that any property whose host has no phone cannot be is_active=true. It
  intentionally skipped rows where host_id IS NULL, which left ~31
  unhostable listings visible to guests. They would pass the listing
  cards and the booking form, then hit "Property not available" from
  create_pending_booking — a confusing dead-end.

  This migration:
  - One-time backfill: deactivate every active property without a host
  - Tightens enforce_host_phone_for_active_property to also refuse
    is_active=true when NEW.host_id IS NULL
*/

UPDATE public.properties
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND host_id IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_host_phone_for_active_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS TRUE THEN
    IF NEW.host_id IS NULL THEN
      NEW.is_active := false;
    ELSIF NOT EXISTS (
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
