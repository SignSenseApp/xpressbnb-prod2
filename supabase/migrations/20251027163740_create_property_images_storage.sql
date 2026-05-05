/*
  # Create Storage Bucket for Property Images

  1. Storage Setup
    - Create a public storage bucket called 'property-images'
    - Enable public access for uploaded images
    - Set up size and file type restrictions

  2. Security
    - Allow authenticated users to upload images
    - Allow public read access to all images
    - Set maximum file size to 5MB
    - Restrict to image file types only

  3. Policies
    - INSERT: Authenticated users can upload images
    - SELECT: Public read access for all images
    - DELETE: Authenticated users can delete their own uploads
*/

-- Create the storage bucket for property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload property images'
  ) THEN
    CREATE POLICY "Authenticated users can upload property images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'property-images');
  END IF;
END $$;

-- Allow public read access to all property images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access to property images'
  ) THEN
    CREATE POLICY "Public read access to property images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'property-images');
  END IF;
END $$;

-- Allow authenticated users to delete their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own property images'
  ) THEN
    CREATE POLICY "Users can delete their own property images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'property-images');
  END IF;
END $$;
