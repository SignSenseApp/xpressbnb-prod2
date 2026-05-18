/*
  # Hide listings when host has no phone

  Guests must reach the host after payment. Hosts without a phone cannot
  keep properties bookable.
*/

UPDATE properties p
SET is_active = false, updated_at = now()
FROM hosts h
WHERE p.host_id = h.id
  AND p.is_active = true
  AND (h.phone IS NULL OR trim(h.phone) = '');

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

DROP TRIGGER IF EXISTS trigger_enforce_host_phone_for_active_property ON properties;
CREATE TRIGGER trigger_enforce_host_phone_for_active_property
  BEFORE INSERT OR UPDATE OF is_active, host_id ON properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_host_phone_for_active_property();

CREATE OR REPLACE FUNCTION public.deactivate_properties_when_host_loses_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
    UPDATE properties
    SET is_active = false, updated_at = now()
    WHERE host_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_deactivate_properties_when_host_loses_phone ON hosts;
CREATE TRIGGER trigger_deactivate_properties_when_host_loses_phone
  AFTER UPDATE OF phone ON hosts
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_properties_when_host_loses_phone();
