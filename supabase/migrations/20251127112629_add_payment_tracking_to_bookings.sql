/*
  # Add Payment Tracking to Bookings

  ## Changes
  
  1. New Columns Added to `bookings` table
    - `payment_status` - Track payment state (pending, paid, failed, refunded)
    - `razorpay_order_id` - Store Razorpay order ID
    - `razorpay_payment_id` - Store Razorpay payment ID
    - `payment_method` - Store payment method used
    - `paid_at` - Timestamp when payment was completed

  ## Notes
  - All columns are nullable for backward compatibility
  - Default payment_status is 'pending'
*/

-- Add payment tracking columns to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN razorpay_order_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN razorpay_payment_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

-- Create index on payment status for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Create index on razorpay_order_id for lookup
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_order_id ON public.bookings(razorpay_order_id);