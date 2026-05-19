/*
  WhatsApp inquiry notifications (Meta Cloud API via send-inquiry-notification edge function)

  - public.notifications: per-message audit + retry
  - Host accept/reject → booking_notification_queue
  - Optional pg_net dispatch when integration_settings.dispatch_url + dispatch_secret are set

  Edge secrets (Supabase dashboard): WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_DEV_MODE=true (log only), HOST_DASHBOARD_URL, optional WHATSAPP_* template names.
*/

-- ---------------------------------------------------------------------------
-- 1. Notifications audit table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  queue_id uuid REFERENCES public.booking_notification_queue (id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  recipient_role text NOT NULL,
  recipient_phone text NOT NULL,
  event_type text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  template_name text,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'meta_whatsapp',
  provider_message_id text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  next_retry_at timestamptz,
  CONSTRAINT notifications_channel_check CHECK (channel = 'whatsapp'),
  CONSTRAINT notifications_recipient_role_check CHECK (
    recipient_role = ANY (ARRAY['guest', 'host']::text[])
  ),
  CONSTRAINT notifications_locale_check CHECK (locale = ANY (ARRAY['en', 'hi']::text[])),
  CONSTRAINT notifications_status_check CHECK (
    status = ANY (
      ARRAY['pending', 'processing', 'sent', 'failed', 'dev_logged']::text[]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_booking ON public.notifications (booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status_retry
  ON public.notifications (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT ALL ON TABLE public.notifications TO postgres, service_role;

COMMENT ON TABLE public.notifications IS
  'Outbound WhatsApp messages (audit + retry). Written by send-inquiry-notification edge function.';

-- ---------------------------------------------------------------------------
-- 2. Integration settings (dispatch URL + secret for pg_net → edge function)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integration_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.integration_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO postgres, service_role;

COMMENT ON TABLE public.integration_settings IS
  'Service-role only. Keys: notification_dispatch_url (full edge URL), notification_dispatch_secret (Bearer for pg_net).';

-- ---------------------------------------------------------------------------
-- 3. Host accept / reject → notification queue
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_host_decision_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.phone_verified IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.booking_notification_queue (booking_id, event_type, payload)
    VALUES (
      NEW.id,
      'inquiry_host_accepted',
      jsonb_build_object(
        'status', NEW.status,
        'property_id', NEW.property_id,
        'host_id', NEW.host_id,
        'guest_email', NEW.guest_email
      )
    );
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.booking_notification_queue (booking_id, event_type, payload)
    VALUES (
      NEW.id,
      'inquiry_host_rejected',
      jsonb_build_object(
        'status', NEW.status,
        'property_id', NEW.property_id,
        'host_id', NEW.host_id,
        'guest_email', NEW.guest_email,
        'host_decision_note', NEW.host_decision_note
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enqueue_host_decision_notification ON public.bookings;

CREATE TRIGGER trigger_enqueue_host_decision_notification
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_host_decision_notification();

-- ---------------------------------------------------------------------------
-- 4. pg_net dispatch on new queue rows (optional; no-op if URL/secret missing)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dispatch_booking_notification_to_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url
  FROM public.integration_settings
  WHERE key = 'notification_dispatch_url';

  SELECT value INTO v_secret
  FROM public.integration_settings
  WHERE key = 'notification_dispatch_secret';

  IF v_url IS NULL OR v_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object('queue_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_booking_notification_to_edge failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_dispatch_booking_notification ON public.booking_notification_queue;

CREATE TRIGGER trigger_dispatch_booking_notification
  AFTER INSERT ON public.booking_notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_booking_notification_to_edge();
