/*
  # Extend Bookings and Add New Host System Tables

  ## Changes to existing bookings table
    - Add host_id column
    - Add nights column  
    - Add amount_total column
    - Add source column
    - Rename/alias existing columns to maintain compatibility

  ## New Tables Created
    - subscriptions
    - import_jobs
    - external_reviews
    - view_events
    - expert_requests

  ## Security
    - Update RLS policies for bookings
    - Add RLS for all new tables
*/

-- Add new columns to existing bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'host_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN host_id uuid;
    ALTER TABLE bookings ADD CONSTRAINT bookings_host_id_fkey 
      FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE;
    CREATE INDEX idx_bookings_host_id ON bookings(host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'nights'
  ) THEN
    ALTER TABLE bookings ADD COLUMN nights integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'amount_total'
  ) THEN
    ALTER TABLE bookings ADD COLUMN amount_total numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'source'
  ) THEN
    ALTER TABLE bookings ADD COLUMN source text DEFAULT 'xpressbnb' 
      CHECK (source IN ('xpressbnb', 'external'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'checkin'
  ) THEN
    ALTER TABLE bookings ADD COLUMN checkin date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'checkout'
  ) THEN
    ALTER TABLE bookings ADD COLUMN checkout date;
  END IF;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  property_id uuid NOT NULL,
  amount_monthly numeric NOT NULL DEFAULT 999,
  currency text DEFAULT 'INR',
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  payment_provider_subscription_id text,
  next_billing_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT subscriptions_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create import_jobs table
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  property_id uuid,
  provider text NOT NULL CHECK (provider IN ('Airbnb', 'Booking.com', 'iCal', 'CSV', 'Scrape', 'Other')),
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT import_jobs_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
  CONSTRAINT import_jobs_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Create external_reviews table
CREATE TABLE IF NOT EXISTS external_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  property_id uuid,
  provider text NOT NULL,
  reviewer_name text NOT NULL,
  rating numeric NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment text DEFAULT '',
  review_date date NOT NULL,
  source_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT external_reviews_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
  CONSTRAINT external_reviews_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Create view_events table
CREATE TABLE IF NOT EXISTS view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('property', 'hostProfile')),
  entity_id uuid NOT NULL,
  timestamp timestamptz DEFAULT now(),
  visitor_ip_hash text,
  session_id text,
  referrer text
);

-- Create expert_requests table
CREATE TABLE IF NOT EXISTS expert_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  property_id uuid,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'in_progress', 'completed', 'cancelled')),
  claimed_by uuid,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT expert_requests_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
  CONSTRAINT expert_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT expert_requests_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES hosts(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_host_id ON subscriptions(host_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_property_id ON subscriptions(property_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_host_id ON import_jobs(host_id);
CREATE INDEX IF NOT EXISTS idx_view_events_entity ON view_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_view_events_timestamp ON view_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_expert_requests_host_id ON expert_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_expert_requests_status ON expert_requests(status);

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Hosts can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = subscriptions.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- RLS Policies for import_jobs
CREATE POLICY "Hosts can view own import jobs"
  ON import_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = import_jobs.host_id
      AND hosts.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create import jobs"
  ON import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = import_jobs.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- RLS Policies for external_reviews
CREATE POLICY "Anyone can view external reviews"
  ON external_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Hosts can create external reviews"
  ON external_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = external_reviews.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- RLS Policies for view_events
CREATE POLICY "Anyone can create view events"
  ON view_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Hosts can view events for their entities"
  ON view_events FOR SELECT
  TO authenticated
  USING (
    entity_type = 'property' AND EXISTS (
      SELECT 1 FROM properties
      JOIN hosts ON hosts.id = properties.host_id
      WHERE properties.id = view_events.entity_id
      AND hosts.user_id = auth.uid()
    )
    OR
    entity_type = 'hostProfile' AND EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = view_events.entity_id
      AND hosts.user_id = auth.uid()
    )
  );

-- RLS Policies for expert_requests
CREATE POLICY "Hosts can view own expert requests"
  ON expert_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = expert_requests.host_id
      AND hosts.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create expert requests"
  ON expert_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.id = expert_requests.host_id
      AND hosts.user_id = auth.uid()
    )
  );

-- Add RLS policy for hosts to view bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'Hosts can view their property bookings'
  ) THEN
    CREATE POLICY "Hosts can view their property bookings"
      ON bookings FOR SELECT
      TO authenticated
      USING (
        host_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM hosts
          WHERE hosts.id = bookings.host_id
          AND hosts.user_id = auth.uid()
        )
      );
  END IF;
END $$;
