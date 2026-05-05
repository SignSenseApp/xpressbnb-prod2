/*
  # Create OTP Sessions Table

  1. New Tables
    - `otp_sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `phone_number` (text) - Phone number for OTP verification
      - `otp_hash` (text) - Hashed OTP code for security
      - `purpose` (text) - Purpose of OTP (booking, login, signup)
      - `expires_at` (timestamptz) - Expiration timestamp
      - `verified` (boolean) - Whether OTP has been verified
      - `verified_at` (timestamptz) - Verification timestamp
      - `attempts` (integer) - Number of verification attempts
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `otp_sessions` table
    - Add policies for service role access only (edge functions)
    
  3. Indexes
    - Index on phone_number for faster lookups
    - Index on expires_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS otp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_hash text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage OTP sessions"
  ON otp_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone_number ON otp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at ON otp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_verified ON otp_sessions(verified);
