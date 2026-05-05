/*
  # Fix Storage RLS for Anonymous Users

  1. Issue
    - Current storage policies require authentication
    - Users are not authenticated in the app
    - Image uploads fail with RLS violation

  2. Solution
    - Update storage policies to allow anonymous (anon) users
    - Keep public read access
    - Allow anon users to upload images
    - Allow anon users to delete images (optional, can be restricted later)

  3. Security Notes
    - This is acceptable for a property listing app where users submit properties
    - File size and type restrictions are enforced at the bucket level (5MB, images only)
    - In production, consider adding authentication or rate limiting
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;

-- Allow anonymous users to upload property images
CREATE POLICY "Anyone can upload property images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'property-images');

-- Allow anonymous users to delete property images
CREATE POLICY "Anyone can delete property images"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'property-images');
