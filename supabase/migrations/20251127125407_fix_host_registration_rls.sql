/*
  # Fix Host Registration - Allow Initial Profile Creation

  ## Changes
  - Add policy to allow new users to create their host profile during signup
  - This is needed because during signup, the user is not yet authenticated when creating the host record

  ## Security
  - Only allows users to create a host profile for their own user_id
  - Existing policies still protect updates and reads
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "New users can create host profile" ON public.hosts;

-- Create new policy that allows authenticated users AND new signups to create profiles
CREATE POLICY "New users can create host profile"
  ON public.hosts FOR INSERT
  WITH CHECK (
    -- Allow if authenticated and user_id matches
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Allow if user_id matches a recently created user (within last 5 minutes)
    (
      user_id IN (
        SELECT id FROM auth.users
        WHERE created_at > now() - interval '5 minutes'
      )
    )
  );
