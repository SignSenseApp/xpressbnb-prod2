/*
  # Fix Hosts Table INSERT Policy - Remove auth.users Query

  ## Problem
  The previous INSERT policy was querying auth.users table which causes permission denied errors.
  Postgres RLS policies cannot query auth.users directly.

  ## Solution
  Simplify the policy to only allow authenticated users to insert their own profile.
  The auth.uid() check is sufficient since:
  - During signup, Supabase creates the auth user BEFORE our code runs
  - By the time we insert into hosts table, the user is authenticated
  - auth.uid() returns the authenticated user's ID

  ## Security
  - Only allows authenticated users to create profiles
  - Users can only create a profile for their own user_id
  - Existing SELECT and UPDATE policies remain unchanged
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "New users can create host profile" ON public.hosts;

-- Create simplified policy that only checks auth.uid()
CREATE POLICY "New users can create host profile"
  ON public.hosts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
