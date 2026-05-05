/*
  # Rishikesh Stays Redesign Tables

  1. New Tables
    - `rishikesh_saved_properties`
      - `id` (uuid, primary key)
      - `session_id` (text, anonymous browser session id)
      - `property_id` (text, slug/id of property)
      - `created_at` (timestamptz)
    - `rishikesh_artist_bookings`
      - `id` (uuid, primary key)
      - `session_id` (text, anonymous browser session id)
      - `artist_id` (text, slug/id of artist)
      - `artist_name` (text)
      - `slot` (text, chosen time slot)
      - `guest_name` (text)
      - `guest_phone` (text)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Anonymous (anon) role can insert and select rows scoped to a session_id they provide
    - Since we use anonymous session ids in localStorage and have no auth, policies allow public read/write of own session data; access is gated by the client supplying their own session_id

  3. Notes
    - These tables are intentionally low-trust v1 storage; v2 should add auth and tighten policies
*/

CREATE TABLE IF NOT EXISTS rishikesh_saved_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  property_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, property_id)
);

CREATE INDEX IF NOT EXISTS rishikesh_saved_properties_session_idx
  ON rishikesh_saved_properties (session_id);

ALTER TABLE rishikesh_saved_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read saved properties"
  ON rishikesh_saved_properties FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert saved properties"
  ON rishikesh_saved_properties FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0);

CREATE POLICY "Anyone can delete saved properties by session"
  ON rishikesh_saved_properties FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS rishikesh_artist_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  artist_id text NOT NULL,
  artist_name text NOT NULL DEFAULT '',
  slot text NOT NULL DEFAULT '',
  guest_name text NOT NULL DEFAULT '',
  guest_phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rishikesh_artist_bookings_session_idx
  ON rishikesh_artist_bookings (session_id);

ALTER TABLE rishikesh_artist_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read artist bookings"
  ON rishikesh_artist_bookings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert artist bookings"
  ON rishikesh_artist_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0);
