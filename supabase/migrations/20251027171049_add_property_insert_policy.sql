/*
  # Add Property Insert and Update Policies

  1. Issue
    - Properties table only has SELECT policy
    - No INSERT policy exists, causing RLS violations when creating properties
    - No UPDATE or DELETE policies exist for property management

  2. Solution
    - Add INSERT policy to allow anyone to create properties
    - Add UPDATE policy for future property management
    - Add DELETE policy for future property management

  3. Security Notes
    - This allows anonymous property submissions
    - In production, consider adding authentication or approval workflow
    - Properties are created with is_active = true by default
*/

-- Allow anyone to insert new properties
CREATE POLICY "Anyone can create properties"
ON properties
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to update properties (can be restricted later to owners only)
CREATE POLICY "Anyone can update properties"
ON properties
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow anyone to delete properties (can be restricted later to owners only)
CREATE POLICY "Anyone can delete properties"
ON properties
FOR DELETE
TO anon, authenticated
USING (true);
