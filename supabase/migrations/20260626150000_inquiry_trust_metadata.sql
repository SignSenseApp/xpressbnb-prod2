/*
  Inquiry review metadata — honest trust labels (no fake verification claims).
*/

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS approval_source text;

COMMENT ON COLUMN public.bookings.review_reason IS
  'Why Ops approved/rejected (e.g. quality_review_passed). Not shown to guests as identity proof.';

COMMENT ON COLUMN public.bookings.approval_source IS
  'Who released inquiry to host (e.g. xpressbnb_operations).';

CREATE OR REPLACE FUNCTION public.approve_inquiry_for_host(
  p_booking_id uuid,
  p_reviewed_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bookings%ROWTYPE;
  v_host jsonb;
BEGIN
  SELECT * INTO v_row
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF v_row.status NOT IN ('inquiry_preparing', 'inquiry_pending') THEN
    RAISE EXCEPTION 'Inquiry is not awaiting review';
  END IF;

  v_host := public.host_contact_json_for_host(v_row.host_id);

  UPDATE public.bookings
  SET
    phone_verified = true,
    phone_verified_at = now(),
    status = 'pending_host',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_reason = 'quality_review_passed',
    approval_source = 'xpressbnb_operations'
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'customer_reference', v_row.customer_reference,
    'status', 'pending_host',
    'review_reason', 'quality_review_passed',
    'approval_source', 'xpressbnb_operations'
  ) || v_host;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_inquiry(
  p_booking_id uuid,
  p_reviewed_by uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
BEGIN
  UPDATE public.bookings
  SET
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_reason = coalesce(nullif(trim(p_reason), ''), 'quality_review_declined'),
    approval_source = 'xpressbnb_operations',
    host_decision_note = coalesce(nullif(trim(p_reason), ''), host_decision_note)
  WHERE id = p_booking_id
    AND status IN ('inquiry_preparing', 'inquiry_pending')
  RETURNING customer_reference INTO v_ref;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found or not rejectable';
  END IF;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'customer_reference', v_ref,
    'status', 'rejected',
    'review_reason', coalesce(nullif(trim(p_reason), ''), 'quality_review_declined')
  );
END;
$$;

-- Honest guest push copy (quality review, not identity verification)
CREATE OR REPLACE FUNCTION public.enqueue_guest_inquiry_push_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'inquiry_preparing' THEN
    PERFORM public.enqueue_guest_push_notification(
      NEW.id,
      'inquiry_preparing',
      'XpressBNB',
      'Your inquiry is with XpressBNB Operations for quality review.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pending_host'
      AND OLD.status IS DISTINCT FROM 'pending_host'
      AND NEW.phone_verified IS TRUE THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_sent_to_host',
        'XpressBNB',
        'Quality review complete — your inquiry was shared with the host.'
      );
    ELSIF NEW.host_viewed_at IS NOT NULL
      AND OLD.host_viewed_at IS NULL THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_viewed_by_host',
        'XpressBNB',
        'The host is reviewing your inquiry.'
      );
    ELSIF NEW.status = 'accepted'
      AND OLD.status IS DISTINCT FROM 'accepted' THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_host_accepted',
        'XpressBNB',
        'The host accepted your inquiry.'
      );
    ELSIF NEW.host_decision_at IS NOT NULL
      AND OLD.host_decision_at IS NULL
      AND NEW.status NOT IN ('accepted', 'rejected', 'cancelled') THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_host_responded',
        'XpressBNB',
        'The host has responded.'
      );
    ELSIF NEW.status = 'rejected'
      AND OLD.status IS DISTINCT FROM 'rejected' THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_rejected',
        'XpressBNB',
        'Your inquiry could not be completed at this time.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Honest guest push copy (quality review, not identity verification)
CREATE OR REPLACE FUNCTION public.enqueue_guest_inquiry_push_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'inquiry_preparing' THEN
    PERFORM public.enqueue_guest_push_notification(
      NEW.id,
      'inquiry_preparing',
      'XpressBNB',
      'Your inquiry is with XpressBNB Operations for quality review.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pending_host'
      AND OLD.status IS DISTINCT FROM 'pending_host'
      AND NEW.phone_verified IS TRUE THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_sent_to_host',
        'XpressBNB',
        'Quality review complete — your inquiry was shared with the host.'
      );
    ELSIF NEW.host_viewed_at IS NOT NULL
      AND OLD.host_viewed_at IS NULL THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_viewed_by_host',
        'XpressBNB',
        'The host is reviewing your inquiry.'
      );
    ELSIF NEW.status = 'accepted'
      AND OLD.status IS DISTINCT FROM 'accepted' THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_host_accepted',
        'XpressBNB',
        'The host accepted your inquiry.'
      );
    ELSIF NEW.host_decision_at IS NOT NULL
      AND OLD.host_decision_at IS NULL
      AND NEW.status NOT IN ('accepted', 'rejected', 'cancelled') THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_host_responded',
        'XpressBNB',
        'The host has responded.'
      );
    ELSIF NEW.status = 'rejected'
      AND OLD.status IS DISTINCT FROM 'rejected' THEN
      PERFORM public.enqueue_guest_push_notification(
        NEW.id,
        'inquiry_rejected',
        'XpressBNB',
        'Your inquiry could not be completed at this time.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
