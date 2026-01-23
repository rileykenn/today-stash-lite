-- Fix merchant_staff self-referencing recursion
-- The merchant_staff_select policy was querying merchant_staff within itself, causing recursion

-- ============================================================================
-- Drop the problematic policy
-- ============================================================================

DROP POLICY IF EXISTS "merchant_staff_select" ON public.merchant_staff;

-- ============================================================================
-- Recreate without self-reference
-- ============================================================================

-- SELECT: Users can see their own staff record, admins see all
-- REMOVED: The merchant check that was self-referencing
CREATE POLICY "merchant_staff_select" ON public.merchant_staff
FOR SELECT
USING (
  ((select auth.uid()) = user_id)
  OR 
  check_is_admin()
);
