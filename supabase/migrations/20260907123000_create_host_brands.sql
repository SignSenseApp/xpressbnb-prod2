/*
  # Host business identity (Brand) persistence

  Optional hospitality business name for an existing Host.

  Brand is NOT:
  - a second host / auth user / property owner
  - a subscription SKU, role, merchant, workspace, or team
  - guest-visible in this migration

  Ownership remains:
    properties.host_id → hosts.id
    hosts.user_id unique (one auth user → one host)

  Model:
    host_brands (1:1 with hosts via UNIQUE host_id)
    host_brand_properties (optional associations; zero rows allowed)

  Authorization:
    RLS using public.current_host_ids() so policies do not re-enter hosts RLS.
    No anon/public SELECT — hosts table already has public profile reads;
    Brand must stay host-private until a later product decision.

  Association integrity:
    Trigger enforces properties.host_id = host_brands.host_id.
    Property delete cascades association rows only, never properties from Brand.
    Brand delete cascades association rows only, never properties.
*/

-- ---------------------------------------------------------------------------
-- 1. host_brands
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.host_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT host_brands_host_id_key UNIQUE (host_id),
  CONSTRAINT host_brands_business_name_length_check
    CHECK (char_length(business_name) >= 2 AND char_length(business_name) <= 60),
  CONSTRAINT host_brands_business_description_length_check
    CHECK (
      business_description IS NULL
      OR char_length(business_description) <= 160
    )
);

COMMENT ON TABLE public.host_brands IS
  'Optional hospitality business identity for a host. One row per host. Not a second host, role, subscription, or verification.';
COMMENT ON COLUMN public.host_brands.business_name IS
  'Display name the host operates under. Not globally unique. Trimmed; 2–60 Unicode characters.';
COMMENT ON COLUMN public.host_brands.business_description IS
  'Optional short description; max 160 Unicode characters.';

-- ---------------------------------------------------------------------------
-- 2. host_brand_properties (association only — not ownership)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.host_brand_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.host_brands(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT host_brand_properties_property_id_key UNIQUE (property_id)
);

CREATE INDEX IF NOT EXISTS idx_host_brand_properties_brand_id
  ON public.host_brand_properties (brand_id);

COMMENT ON TABLE public.host_brand_properties IS
  'Links a host-owned property to that host''s business identity. Does not transfer properties.host_id.';

-- ---------------------------------------------------------------------------
-- 3. Write triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.host_brands_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.host_id IS DISTINCT FROM OLD.host_id THEN
    RAISE EXCEPTION 'Brand host cannot be reassigned'
      USING ERRCODE = '42501';
  END IF;

  NEW.business_name := btrim(NEW.business_name);

  IF NEW.business_description IS NOT NULL THEN
    NEW.business_description := NULLIF(btrim(NEW.business_description), '');
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_host_brands_before_write ON public.host_brands;
CREATE TRIGGER trigger_host_brands_before_write
  BEFORE INSERT OR UPDATE ON public.host_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.host_brands_before_write();

CREATE OR REPLACE FUNCTION public.enforce_host_brand_property_same_host()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_host uuid;
  v_property_host uuid;
BEGIN
  SELECT host_id INTO v_brand_host
  FROM public.host_brands
  WHERE id = NEW.brand_id;

  SELECT host_id INTO v_property_host
  FROM public.properties
  WHERE id = NEW.property_id;

  IF v_brand_host IS NULL
     OR v_property_host IS NULL
     OR v_brand_host IS DISTINCT FROM v_property_host THEN
    RAISE EXCEPTION 'Property is not owned by the same host as this business identity'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_host_brand_properties_same_host
  ON public.host_brand_properties;
CREATE TRIGGER trigger_host_brand_properties_same_host
  BEFORE INSERT OR UPDATE ON public.host_brand_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_host_brand_property_same_host();

REVOKE ALL ON FUNCTION public.host_brands_before_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_host_brand_property_same_host() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4. Grants — authenticated via RLS; never anon/public
-- ---------------------------------------------------------------------------

ALTER TABLE public.host_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_brand_properties ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.host_brands FROM PUBLIC;
REVOKE ALL ON TABLE public.host_brands FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.host_brands TO authenticated;
GRANT ALL ON TABLE public.host_brands TO postgres, service_role;

REVOKE ALL ON TABLE public.host_brand_properties FROM PUBLIC;
REVOKE ALL ON TABLE public.host_brand_properties FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.host_brand_properties TO authenticated;
GRANT ALL ON TABLE public.host_brand_properties TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS — owner only (current_host_ids avoids hosts/bookings RLS recursion)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Hosts can view own host brands" ON public.host_brands;
CREATE POLICY "Hosts can view own host brands"
  ON public.host_brands
  FOR SELECT
  TO authenticated
  USING (host_id IN (SELECT public.current_host_ids()));

DROP POLICY IF EXISTS "Hosts can create own host brands" ON public.host_brands;
CREATE POLICY "Hosts can create own host brands"
  ON public.host_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (host_id IN (SELECT public.current_host_ids()));

DROP POLICY IF EXISTS "Hosts can update own host brands" ON public.host_brands;
CREATE POLICY "Hosts can update own host brands"
  ON public.host_brands
  FOR UPDATE
  TO authenticated
  USING (host_id IN (SELECT public.current_host_ids()))
  WITH CHECK (host_id IN (SELECT public.current_host_ids()));

DROP POLICY IF EXISTS "Hosts can delete own host brands" ON public.host_brands;
CREATE POLICY "Hosts can delete own host brands"
  ON public.host_brands
  FOR DELETE
  TO authenticated
  USING (host_id IN (SELECT public.current_host_ids()));

DROP POLICY IF EXISTS "Hosts can view own host brand properties"
  ON public.host_brand_properties;
CREATE POLICY "Hosts can view own host brand properties"
  ON public.host_brand_properties
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM public.host_brands
      WHERE host_id IN (SELECT public.current_host_ids())
    )
  );

DROP POLICY IF EXISTS "Hosts can create own host brand properties"
  ON public.host_brand_properties;
CREATE POLICY "Hosts can create own host brand properties"
  ON public.host_brand_properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM public.host_brands
      WHERE host_id IN (SELECT public.current_host_ids())
    )
    AND property_id IN (
      SELECT id FROM public.properties
      WHERE host_id IN (SELECT public.current_host_ids())
    )
  );

DROP POLICY IF EXISTS "Hosts can update own host brand properties"
  ON public.host_brand_properties;
CREATE POLICY "Hosts can update own host brand properties"
  ON public.host_brand_properties
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM public.host_brands
      WHERE host_id IN (SELECT public.current_host_ids())
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT id FROM public.host_brands
      WHERE host_id IN (SELECT public.current_host_ids())
    )
    AND property_id IN (
      SELECT id FROM public.properties
      WHERE host_id IN (SELECT public.current_host_ids())
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own host brand properties"
  ON public.host_brand_properties;
CREATE POLICY "Hosts can delete own host brand properties"
  ON public.host_brand_properties
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM public.host_brands
      WHERE host_id IN (SELECT public.current_host_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Atomic association replace (INVOKER — RLS remains the authority)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.replace_host_brand_properties(
  p_brand_id uuid,
  p_property_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_owned_count integer;
  v_brand_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT hb.id INTO v_brand_id
  FROM public.host_brands hb
  WHERE hb.id = p_brand_id
    AND hb.host_id IN (SELECT public.current_host_ids());

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Brand not found'
      USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT pid
    FROM unnest(COALESCE(p_property_ids, ARRAY[]::uuid[])) AS pid
  )
  INTO v_ids;

  SELECT COUNT(*)::integer INTO v_owned_count
  FROM public.properties p
  WHERE p.id = ANY (v_ids)
    AND p.host_id IN (SELECT public.current_host_ids());

  IF v_owned_count <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'One or more properties are not owned by this host'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.host_brand_properties
  WHERE brand_id = v_brand_id;

  IF cardinality(v_ids) > 0 THEN
    INSERT INTO public.host_brand_properties (brand_id, property_id)
    SELECT v_brand_id, pid FROM unnest(v_ids) AS pid;
  END IF;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_host_brand_properties(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_host_brand_properties(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_host_brand_properties(uuid, uuid[]) TO authenticated;
