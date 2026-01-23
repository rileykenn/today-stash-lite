-- Fix infinite recursion and performance issues in profiles RLS policies
-- This migration completely rebuilds the RLS structure for the profiles table

-- ============================================================================
-- STEP 1: Create Security Definer Function (Bypasses RLS)
-- ============================================================================
-- This function uses SECURITY DEFINER to bypass RLS when checking admin status
-- This prevents infinite recursion because it doesn't trigger the policies again
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role text;
BEGIN
  -- Direct lookup in profiles WITHOUT triggering RLS
  -- Using SECURITY DEFINER allows this function to bypass RLS
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN (user_role = 'admin');
END;
$$;

ALTER FUNCTION public.check_is_admin() OWNER TO postgres;

-- ============================================================================
-- STEP 2: Drop All Existing Policies (Clean Slate)
-- ============================================================================
-- Remove all existing policies to eliminate conflicts and recursion

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_modify" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_consolidated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_consolidated" ON public.profiles;

-- ============================================================================
-- STEP 3: Create Consolidated, Optimized Policies (One Per Action)
-- ============================================================================
-- These policies combine user and admin logic in single policies
-- auth.uid() is wrapped in (select ...) for performance per Supabase recommendations

-- SELECT: Users see own profile, Admins see all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT
USING (
  ((select auth.uid()) = user_id) 
  OR 
  check_is_admin()
);

-- INSERT: Users insert own profile, Admins insert any profile
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT
WITH CHECK (
  ((select auth.uid()) = user_id) 
  OR 
  check_is_admin()
);

-- UPDATE: Users update own profile, Admins update any profile
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE
USING (
  ((select auth.uid()) = user_id) 
  OR 
  check_is_admin()
);

-- DELETE: Only admins can delete profiles
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE
USING (check_is_admin());

-- ============================================================================
-- STEP 4: Clean Up Obsolete Objects
-- ============================================================================

-- Drop the admin_users_view created in previous migration (no longer needed)
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

-- Recreate is_admin() as alias to check_is_admin() for backward compatibility
-- This ensures existing code that calls is_admin() still works
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_is_admin();
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- Update the overloaded version that takes a UUID parameter
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE user_id = uid
  LIMIT 1;
  
  RETURN (user_role = 'admin');
END;
$$;

ALTER FUNCTION public.is_admin(uid uuid) OWNER TO postgres;
