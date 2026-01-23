-- Fix infinite recursion in profiles RLS policies
-- And allow users to update their own profiles

-- 1. Create a secure view to check admin status without triggering generic profile RLS
-- This view is owned by postgres (superuser) and will be used by the is_admin function
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT user_id FROM public.profiles WHERE role = 'admin'::user_role;

ALTER VIEW public.admin_users_view OWNER TO postgres;
REVOKE ALL ON public.admin_users_view FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.admin_users_view TO postgres;

-- 2. Update is_admin function to use the view
-- This prevents recursion because querying the view (as postgres) won't re-trigger the table policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users_view WHERE user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- Overload for specific user check (used in some policies)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users_view WHERE user_id = uid
  );
$$;

ALTER FUNCTION public.is_admin(uid uuid) OWNER TO postgres;


-- 3. Drop existing problematic/redundant policies
DROP POLICY IF EXISTS "profiles admin read" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin write" ON public.profiles;
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- 4. Re-create clean policies

-- Read: Users can read their own, Admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (is_admin());

-- Update: Users can update their own, Admins can update all
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (is_admin());

-- Insert: Users can insert their own (for upserts/initial creation if trigger fails), Admins can insert
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (is_admin());
