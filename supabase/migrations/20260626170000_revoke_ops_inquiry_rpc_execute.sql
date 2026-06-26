/*
  Ops inquiry RPC hardening — close public PostgREST bypass.

  approve_inquiry_for_host and reject_inquiry must only be callable via
  service_role (ops-console edge function). REVOKE FROM PUBLIC alone does not
  remove explicit anon/authenticated grants on Supabase.
*/

REVOKE EXECUTE ON FUNCTION public.approve_inquiry_for_host(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_inquiry(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.approve_inquiry_for_host(uuid, uuid)
  TO postgres, service_role;

GRANT EXECUTE ON FUNCTION public.reject_inquiry(uuid, uuid, text)
  TO postgres, service_role;
