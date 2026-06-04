/*
  # Atomic host profile provisioning (bypasses RLS races on signup/login)

  Client-side insert can race (getSession + onAuthStateChange) and hit unique
  constraints. This SECURITY DEFINER function returns the host row for the
  current auth user, creating it if missing.
*/

CREATE OR REPLACE FUNCTION public.ensure_host_profile(
  p_name text DEFAULT 'Host',
  p_email text DEFAULT '',
  p_phone text DEFAULT ''
)
RETURNS public.hosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.hosts;
  norm_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO row FROM public.hosts WHERE user_id = uid ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    RETURN row;
  END IF;

  INSERT INTO public.hosts (user_id, name, email, phone)
  VALUES (
    uid,
    coalesce(nullif(trim(p_name), ''), split_part(norm_email, '@', 1), 'Host'),
    norm_email,
    coalesce(p_phone, '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO row FROM public.hosts WHERE user_id = uid ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    RETURN row;
  END IF;

  RAISE EXCEPTION 'Could not create or load host profile';
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_host_profile(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_host_profile(text, text, text) TO authenticated;
