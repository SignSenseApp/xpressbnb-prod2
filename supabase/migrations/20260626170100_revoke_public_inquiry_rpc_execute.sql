/*
  Repo parity with production migration revoke_public_inquiry_rpc_execute.

  REVOKE FROM PUBLIC on inquiry create RPCs — edge submit-booking-inquiry uses
  service_role only. Already applied on production (20260626001528).
*/

REVOKE EXECUTE ON FUNCTION public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, uuid, text, boolean, text, text, boolean
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, uuid, integer, text, text, text, text, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_pending_booking(
  uuid, uuid, text, text, text, date, date, integer, numeric, numeric, integer, uuid, text, boolean, text, text, boolean
) TO postgres, service_role;

GRANT EXECUTE ON FUNCTION public.create_make_offer_inquiry(
  uuid, uuid, text, text, date, date, numeric, text, uuid, integer, text, text, text, text, boolean
) TO postgres, service_role;
