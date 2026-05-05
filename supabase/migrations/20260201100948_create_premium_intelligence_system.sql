/*
  # Premium Intelligence System for XpressBnB Host Dashboard

  ## Overview
  This migration adds premium intelligence features to the existing XpressBnB platform
  without modifying or breaking any existing data, UI flows, or business logic.
  All changes are additive and non-breaking.

  ## New Fields Added to properties
  - `is_premium` (boolean) - Indicates if property has premium features enabled
  - `premium_plan` (text) - Type of premium plan: FREE or PAID
  - `premium_expiry` (timestamptz) - When premium access expires
  - `premium_stats` (jsonb) - Stores premium analytics data

  ## New Tables

  ### 1. property_analytics
  Stores detailed analytics for premium features
  - Property performance metrics
  - Visibility scores
  - Conversion rates
  - Demand levels
  - City-level benchmark data

  ### 2. property_growth_scores
  Stores Host Growth Score™ data
  - Overall score (0-100)
  - Component scores (completeness, pricing, conversion, response)
  - Improvement suggestions
  - Historical tracking

  ### 3. property_price_suggestions
  Stores smart pricing recommendations
  - Suggested price range
  - Reasoning and explanations
  - Estimated impact
  - Market comparison data

  ### 4. property_demand_forecast
  Stores demand predictions
  - 7-day and 30-day forecasts
  - Demand levels (Low/Medium/High)
  - Reasoning for predictions
  - Event-based insights

  ### 5. property_ab_tests
  Stores A/B testing data for listings
  - Test variants (title, cover image)
  - Performance metrics
  - Test status and results
  - Winner declaration

  ## Security
  - All tables have RLS enabled
  - Only property owners can access their premium data
  - Anonymous users cannot view premium features
  - All policies check authentication and ownership

  ## Data Integrity
  - Foreign key constraints maintain referential integrity
  - Proper indexes for performance
  - Cascading deletes to clean up related data
*/

-- ============================================================
-- STEP 1: Add premium fields to properties table (non-breaking)
-- ============================================================

DO $$
BEGIN
  -- Add is_premium field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE properties ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  -- Add premium_plan field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'premium_plan'
  ) THEN
    ALTER TABLE properties ADD COLUMN premium_plan text DEFAULT 'FREE' CHECK (premium_plan IN ('FREE', 'PAID'));
  END IF;

  -- Add premium_expiry field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'premium_expiry'
  ) THEN
    ALTER TABLE properties ADD COLUMN premium_expiry timestamptz;
  END IF;

  -- Add premium_stats field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'premium_stats'
  ) THEN
    ALTER TABLE properties ADD COLUMN premium_stats jsonb DEFAULT '{
      "visibility_score": 0,
      "conversion_rate": 0,
      "demand_level": "medium",
      "last_updated": null
    }'::jsonb;
  END IF;
END $$;

-- Create indexes for premium fields
CREATE INDEX IF NOT EXISTS idx_properties_is_premium ON properties(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_properties_premium_plan ON properties(premium_plan);
CREATE INDEX IF NOT EXISTS idx_properties_premium_expiry ON properties(premium_expiry) WHERE premium_expiry IS NOT NULL;

-- ============================================================
-- STEP 2: Create property_analytics table
-- ============================================================

CREATE TABLE IF NOT EXISTS property_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- View metrics
  total_views integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  
  -- Booking metrics
  total_bookings integer DEFAULT 0,
  booking_requests integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0 CHECK (conversion_rate >= 0 AND conversion_rate <= 100),
  
  -- Visibility metrics
  visibility_score numeric DEFAULT 0 CHECK (visibility_score >= 0 AND visibility_score <= 100),
  search_impressions integer DEFAULT 0,
  click_through_rate numeric DEFAULT 0 CHECK (click_through_rate >= 0 AND click_through_rate <= 100),
  
  -- Market comparison
  city_avg_price numeric DEFAULT 0,
  city_avg_bookings numeric DEFAULT 0,
  price_competitiveness numeric DEFAULT 0 CHECK (price_competitiveness >= 0 AND price_competitiveness <= 100),
  
  -- Demand metrics
  demand_level text DEFAULT 'medium' CHECK (demand_level IN ('low', 'medium', 'high')),
  demand_score numeric DEFAULT 50 CHECK (demand_score >= 0 AND demand_score <= 100),
  
  -- Additional insights
  insights jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(property_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_property_id ON property_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON property_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_property_date ON property_analytics(property_id, date DESC);

ALTER TABLE property_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their property analytics"
  ON property_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_analytics.property_id
      AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics"
  ON property_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_analytics.property_id
      AND h.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 3: Create property_growth_scores table
-- ============================================================

CREATE TABLE IF NOT EXISTS property_growth_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Overall score
  overall_score numeric NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Component scores
  completeness_score numeric DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  pricing_score numeric DEFAULT 0 CHECK (pricing_score >= 0 AND pricing_score <= 100),
  conversion_score numeric DEFAULT 0 CHECK (conversion_score >= 0 AND conversion_score <= 100),
  response_score numeric DEFAULT 0 CHECK (response_score >= 0 AND response_score <= 100),
  
  -- Improvement suggestions
  suggestions jsonb DEFAULT '[]'::jsonb,
  
  -- Historical tracking
  previous_score numeric DEFAULT 0,
  score_trend text DEFAULT 'stable' CHECK (score_trend IN ('improving', 'stable', 'declining')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_scores_property_id ON property_growth_scores(property_id);
CREATE INDEX IF NOT EXISTS idx_growth_scores_overall ON property_growth_scores(overall_score DESC);

ALTER TABLE property_growth_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their growth scores"
  ON property_growth_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_growth_scores.property_id
      AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update their growth scores"
  ON property_growth_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_growth_scores.property_id
      AND h.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 4: Create property_price_suggestions table
-- ============================================================

CREATE TABLE IF NOT EXISTS property_price_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Price recommendations
  suggested_min_price numeric NOT NULL DEFAULT 0,
  suggested_max_price numeric NOT NULL DEFAULT 0,
  optimal_price numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  
  -- Reasoning
  reasoning jsonb DEFAULT '[]'::jsonb,
  market_data jsonb DEFAULT '{}'::jsonb,
  
  -- Impact estimates
  estimated_booking_increase numeric DEFAULT 0,
  estimated_revenue_impact numeric DEFAULT 0,
  confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  created_at timestamptz DEFAULT now(),
  valid_until timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_price_suggestions_property_id ON property_price_suggestions(property_id);
CREATE INDEX IF NOT EXISTS idx_price_suggestions_valid ON property_price_suggestions(valid_until DESC);

ALTER TABLE property_price_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their price suggestions"
  ON property_price_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_price_suggestions.property_id
      AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create price suggestions"
  ON property_price_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_price_suggestions.property_id
      AND h.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 5: Create property_demand_forecast table
-- ============================================================

CREATE TABLE IF NOT EXISTS property_demand_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Forecast period
  forecast_date date NOT NULL,
  forecast_period text NOT NULL CHECK (forecast_period IN ('7_day', '30_day')),
  
  -- Demand prediction
  demand_level text DEFAULT 'medium' CHECK (demand_level IN ('low', 'medium', 'high')),
  demand_score numeric DEFAULT 50 CHECK (demand_score >= 0 AND demand_score <= 100),
  
  -- Reasoning
  reasons jsonb DEFAULT '[]'::jsonb,
  event_factors jsonb DEFAULT '[]'::jsonb,
  
  -- Confidence
  confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(property_id, forecast_date, forecast_period)
);

CREATE INDEX IF NOT EXISTS idx_demand_forecast_property_id ON property_demand_forecast(property_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_date ON property_demand_forecast(forecast_date DESC);

ALTER TABLE property_demand_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their demand forecasts"
  ON property_demand_forecast FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_demand_forecast.property_id
      AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create demand forecasts"
  ON property_demand_forecast FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_demand_forecast.property_id
      AND h.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 6: Create property_ab_tests table
-- ============================================================

CREATE TABLE IF NOT EXISTS property_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Test configuration
  test_type text NOT NULL CHECK (test_type IN ('title', 'cover_image')),
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  
  -- Variant A (control - current)
  variant_a jsonb NOT NULL,
  variant_a_impressions integer DEFAULT 0,
  variant_a_clicks integer DEFAULT 0,
  variant_a_ctr numeric DEFAULT 0,
  
  -- Variant B (test)
  variant_b jsonb NOT NULL,
  variant_b_impressions integer DEFAULT 0,
  variant_b_clicks integer DEFAULT 0,
  variant_b_ctr numeric DEFAULT 0,
  
  -- Results
  winner text CHECK (winner IN ('A', 'B', 'inconclusive', null)),
  confidence_level numeric DEFAULT 0 CHECK (confidence_level >= 0 AND confidence_level <= 100),
  
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_property_id ON property_ab_tests(property_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON property_ab_tests(status);

ALTER TABLE property_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their ab tests"
  ON property_ab_tests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_ab_tests.property_id
      AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can manage their ab tests"
  ON property_ab_tests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_ab_tests.property_id
      AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update their ab tests"
  ON property_ab_tests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_ab_tests.property_id
      AND h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN hosts h ON h.id = p.host_id
      WHERE p.id = property_ab_tests.property_id
      AND h.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 7: Create helper functions
-- ============================================================

-- Function to check if property has active premium access
CREATE OR REPLACE FUNCTION has_premium_access(property_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_uuid
    AND is_premium = true
    AND premium_plan = 'PAID'
    AND (premium_expiry IS NULL OR premium_expiry > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update property analytics
CREATE OR REPLACE FUNCTION update_property_analytics(
  p_property_id uuid,
  p_views integer DEFAULT 0,
  p_bookings integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO property_analytics (
    property_id,
    date,
    total_views,
    total_bookings,
    updated_at
  )
  VALUES (
    p_property_id,
    CURRENT_DATE,
    p_views,
    p_bookings,
    now()
  )
  ON CONFLICT (property_id, date)
  DO UPDATE SET
    total_views = property_analytics.total_views + p_views,
    total_bookings = property_analytics.total_bookings + p_bookings,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;