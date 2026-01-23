-- Fix merchant_staff RLS policies to prevent recursion
-- Update policies to use check_is_admin() instead of directly querying profiles

-- ============================================================================
-- Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "merchant_staff_select" ON public.merchant_staff;
DROP POLICY IF EXISTS "merchant_staff_insert" ON public.merchant_staff;
DROP POLICY IF EXISTS "merchant_staff_update" ON public.merchant_staff;
DROP POLICY IF EXISTS "merchant_staff_delete" ON public.merchant_staff;

-- ============================================================================
-- Recreate policies with check_is_admin() to prevent recursion
-- ============================================================================

-- SELECT: Users can see their own staff record, admins see all, 
-- merchants can see all staff at their merchants
CREATE POLICY "merchant_staff_select" ON public.merchant_staff
FOR SELECT
USING (
  ((select auth.uid()) = user_id)
  OR 
  check_is_admin()
  OR
  (EXISTS (
    SELECT 1 FROM merchant_staff ms_self
    WHERE ms_self.user_id = (select auth.uid())
      AND ms_self.merchant_id = merchant_staff.merchant_id
  ))
);

-- INSERT: Only admins can create staff records
CREATE POLICY "merchant_staff_insert" ON public.merchant_staff
FOR INSERT
WITH CHECK (check_is_admin());

-- UPDATE: Only admins can update staff records  
CREATE POLICY "merchant_staff_update" ON public.merchant_staff
FOR UPDATE
USING (check_is_admin());

-- DELETE: Only admins can delete staff records
CREATE POLICY "merchant_staff_delete" ON public.merchant_staff
FOR DELETE
USING (check_is_admin());
