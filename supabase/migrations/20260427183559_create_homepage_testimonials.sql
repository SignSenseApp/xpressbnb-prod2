/*
  # Homepage Testimonials Table

  1. New Tables
    - `homepage_testimonials`
      - `id` (uuid, primary key)
      - `name` (text) — reviewer name
      - `avatar_url` (text) — public avatar image URL
      - `location` (text) — reviewer location
      - `rating` (integer 1-5)
      - `quote` (text) — testimonial text
      - `is_active` (boolean) — show on homepage
      - `display_order` (integer) — manual ordering
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `homepage_testimonials`
    - Public SELECT for active rows only (anon + authenticated)
    - No public INSERT/UPDATE/DELETE — managed by service role / admin

  3. Notes
    - Powers the "Loved by travelers" section on the redesigned homepage.
    - If table is empty, the UI falls back to seeded constants.
*/

CREATE TABLE IF NOT EXISTS homepage_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  quote text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE homepage_testimonials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homepage_testimonials'
      AND policyname = 'Anyone can view active testimonials'
  ) THEN
    CREATE POLICY "Anyone can view active testimonials"
      ON homepage_testimonials
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_homepage_testimonials_active_order
  ON homepage_testimonials (is_active, display_order);

INSERT INTO homepage_testimonials (name, avatar_url, location, rating, quote, display_order)
SELECT * FROM (VALUES
  ('Aarav Mehta', 'https://i.pravatar.cc/120?img=12', 'New Delhi', 5,
   'Booked a verified apartment in Saket and the experience was flawless. Zero hidden fees, instant confirmation, and the host was incredible.', 1),
  ('Priya Sharma', 'https://i.pravatar.cc/120?img=47', 'Mumbai', 5,
   'XpressBnB feels premium without the premium price tag. The verification badge gave me peace of mind, and the photos matched perfectly.', 2),
  ('Rohan Iyer', 'https://i.pravatar.cc/120?img=33', 'Bengaluru', 5,
   'Used it for a 2-week corporate stay in Gurgaon. Clean, modern, and the direct-with-host model saved me almost 18% versus other platforms.', 3),
  ('Sanya Kapoor', 'https://i.pravatar.cc/120?img=5', 'Pune', 5,
   'The skyline penthouse in Noida was a dream. Glassmorphic search, beautiful listings — booking felt as good as the stay itself.', 4)
) AS v(name, avatar_url, location, rating, quote, display_order)
WHERE NOT EXISTS (SELECT 1 FROM homepage_testimonials);
