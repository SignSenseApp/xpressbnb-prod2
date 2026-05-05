/*
  # Add Subscription Payment Tracking to Hosts Table

  ## Changes
  This migration adds payment tracking columns to the hosts table for subscription management.

  1. New Columns
    - `subscription_start_date` - When the paid subscription started
    - `razorpay_order_id` - Store Razorpay order ID for subscription payment
    - `razorpay_payment_id` - Store Razorpay payment ID for subscription payment

  ## Purpose
  Enable tracking of subscription payments through Razorpay for host upgrades.

  ## Notes
  - These columns are nullable since free tier users won't have payment data
  - Razorpay IDs stored for payment verification and support purposes
*/

-- Add subscription_start_date column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hosts' AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE public.hosts ADD COLUMN subscription_start_date timestamptz;
  END IF;
END $$;

-- Add razorpay_order_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hosts' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE public.hosts ADD COLUMN razorpay_order_id text;
  END IF;
END $$;

-- Add razorpay_payment_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hosts' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE public.hosts ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

-- Create index on razorpay_order_id for lookup
CREATE INDEX IF NOT EXISTS idx_hosts_razorpay_order_id ON public.hosts(razorpay_order_id);
