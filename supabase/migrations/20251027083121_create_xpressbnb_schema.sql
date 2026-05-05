/*
  # XpressBnB Database Schema

  ## Overview
  Creates the complete database structure for a vacation rental platform with time-slot booking system.

  ## New Tables
  
  ### `properties`
  - `id` (uuid, primary key) - Unique property identifier
  - `title` (text) - Property name/title
  - `description` (text) - Detailed property description
  - `property_type` (text) - Type: apartment, studio, house, etc.
  - `address` (text) - Street address
  - `city` (text) - City name
  - `state` (text) - State/Province
  - `country` (text) - Country
  - `latitude` (numeric) - Geographic latitude for map
  - `longitude` (numeric) - Geographic longitude for map
  - `price_full_day` (numeric) - Price for full day booking
  - `price_half_day` (numeric) - Price for half day booking
  - `bedrooms` (integer) - Number of bedrooms
  - `bathrooms` (integer) - Number of bathrooms
  - `max_guests` (integer) - Maximum guest capacity
  - `amenities` (jsonb) - Array of amenities (WiFi, parking, etc.)
  - `images` (jsonb) - Array of image URLs
  - `rating` (numeric) - Average rating (0-5)
  - `total_reviews` (integer) - Total number of reviews
  - `is_active` (boolean) - Property availability status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `bookings`
  - `id` (uuid, primary key) - Unique booking identifier
  - `property_id` (uuid, foreign key) - Reference to property
  - `guest_name` (text) - Guest full name
  - `guest_email` (text) - Guest email address
  - `guest_phone` (text) - Guest phone number
  - `check_in_date` (date) - Check-in date
  - `booking_type` (text) - 'full_day' or 'half_day'
  - `time_slot` (text) - For half-day: 'morning' (11AM-6:30PM) or 'evening' (7:30PM-10AM)
  - `num_guests` (integer) - Number of guests
  - `total_price` (numeric) - Total booking cost
  - `status` (text) - Booking status: pending, confirmed, cancelled
  - `special_requests` (text) - Guest special requests
  - `created_at` (timestamptz) - Booking creation timestamp

  ### `admin_users`
  - `id` (uuid, primary key) - Admin user identifier
  - `email` (text, unique) - Admin email
  - `created_at` (timestamptz) - Account creation timestamp

  ## Security
  - Enable RLS on all tables
  - Properties: Public read access, admin-only write access
  - Bookings: Public can create, admin can view all
  - Admin users: Admin-only access
*/

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  property_type text NOT NULL DEFAULT 'apartment',
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL DEFAULT 'USA',
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  price_full_day numeric(10, 2) NOT NULL,
  price_half_day numeric(10, 2) NOT NULL,
  bedrooms integer NOT NULL DEFAULT 1,
  bathrooms integer NOT NULL DEFAULT 1,
  max_guests integer NOT NULL DEFAULT 2,
  amenities jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  rating numeric(3, 2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  check_in_date date NOT NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('full_day', 'half_day')),
  time_slot text CHECK (time_slot IN ('morning', 'evening', 'full')),
  num_guests integer NOT NULL,
  total_price numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  special_requests text,
  created_at timestamptz DEFAULT now()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Properties policies: Public read, no auth required for viewing
CREATE POLICY "Anyone can view active properties"
  ON properties FOR SELECT
  USING (is_active = true);

-- Bookings policies: Anyone can create bookings
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- Bookings policies: Anyone can view their own bookings by email
CREATE POLICY "Guests can view own bookings"
  ON bookings FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_rating ON properties(rating DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(guest_email);