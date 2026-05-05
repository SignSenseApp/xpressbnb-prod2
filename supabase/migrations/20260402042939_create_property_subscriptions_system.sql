/*
  # Create Property Subscriptions System

  1. New Tables
    - `property_subscriptions`
      - `id` (uuid, primary key)
      - `property_id` (uuid, references properties)
      - `host_id` (uuid, references hosts)
      - `subscription_status` (text) - active, expired, cancelled
      - `subscription_plan` (text) - monthly, yearly
      - `amount_paid` (numeric)
      - `currency` (text)
      - `razorpay_order_id` (text)
      - `razorpay_payment_id` (text)
      - `razorpay_subscription_id` (text, nullable for future recurring payments)
      - `subscription_start_date` (timestamptz)
      - `subscription_end_date` (timestamptz)
      - `auto_renew` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `property_subscriptions` table
    - Add policies for hosts to manage their property subscriptions
    
  3. Important Notes
    - This table tracks per-property premium subscriptions
    - Each property can have its own subscription status
    - Hosts pay ₹999/month per property for premium features
*/

CREATE TABLE IF NOT EXISTS property_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  subscription_plan text NOT NULL DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
  amount_paid numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_subscriptions_property_id ON property_subscriptions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_subscriptions_host_id ON property_subscriptions(host_id);
CREATE INDEX IF NOT EXISTS idx_property_subscriptions_status ON property_subscriptions(subscription_status);

-- Enable RLS
ALTER TABLE property_subscriptions ENABLE ROW LEVEL SECURITY;

-- Hosts can view their property subscriptions
CREATE POLICY "Hosts can view own property subscriptions"
  ON property_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = property_subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Hosts can insert property subscriptions for their properties
CREATE POLICY "Hosts can create property subscriptions"
  ON property_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = property_subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_subscriptions.property_id
      AND properties.host_id = property_subscriptions.host_id
    )
  );

-- Hosts can update their property subscriptions
CREATE POLICY "Hosts can update own property subscriptions"
  ON property_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = property_subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = property_subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Hosts can delete their property subscriptions
CREATE POLICY "Hosts can delete own property subscriptions"
  ON property_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = property_subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Create a function to automatically update is_premium in properties based on subscription
CREATE OR REPLACE FUNCTION update_property_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the property's premium status based on subscription
  UPDATE properties
  SET 
    is_premium = (NEW.subscription_status = 'active'),
    premium_plan = CASE 
      WHEN NEW.subscription_status = 'active' THEN NEW.subscription_plan 
      ELSE NULL 
    END,
    premium_expiry = CASE 
      WHEN NEW.subscription_status = 'active' THEN NEW.subscription_end_date 
      ELSE NULL 
    END
  WHERE id = NEW.property_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update property premium status when subscription changes
DROP TRIGGER IF EXISTS trigger_update_property_premium ON property_subscriptions;
CREATE TRIGGER trigger_update_property_premium
  AFTER INSERT OR UPDATE ON property_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_property_premium_status();