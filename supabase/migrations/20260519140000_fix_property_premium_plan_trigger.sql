/*
  # Fix property premium_plan on subscription activation

  premium_plan must be 'PAID' (not monthly/yearly) for app premium helpers.
  is_premium follows subscription_status = 'active'.
*/

CREATE OR REPLACE FUNCTION public.update_property_premium_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE properties
  SET
    is_premium = (NEW.subscription_status = 'active'),
    premium_plan = CASE
      WHEN NEW.subscription_status = 'active' THEN 'PAID'
      ELSE 'FREE'
    END,
    premium_expiry = CASE
      WHEN NEW.subscription_status = 'active' THEN NEW.subscription_end_date
      ELSE NULL
    END
  WHERE id = NEW.property_id;

  RETURN NEW;
END;
$$;
