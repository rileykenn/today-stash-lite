-- Fix offers RLS policies to allow merchants to manage their own offers
-- Currently only admins can INSERT/UPDATE/DELETE offers

-- ============================================================================
-- Drop existing policies that query profiles directly
-- ============================================================================

DROP POLICY IF EXISTS "offers_insert" ON public.offers;
DROP POLICY IF EXISTS "offers_update" ON public.offers;
DROP POLICY IF EXISTS "offers_delete" ON public.offers;

-- ============================================================================
-- Recreate policies with check_is_admin() and merchant permissions
-- ============================================================================

-- INSERT: Staff at a merchant can create offers for their merchant, admins can create any
CREATE POLICY "offers_insert" ON public.offers
FOR INSERT
WITH CHECK (
  check_is_admin()
  OR
  (EXISTS (
    SELECT 1 FROM merchant_staff ms
    WHERE ms.user_id = (select auth.uid())
      AND ms.merchant_id = offers.merchant_id
  ))
);

-- UPDATE: Staff at a merchant can update their merchant's offers, admins can update any
CREATE POLICY "offers_update" ON public.offers
FOR UPDATE
USING (
  check_is_admin()
  OR
  (EXISTS (
    SELECT 1 FROM merchant_staff ms
    WHERE ms.user_id = (select auth.uid())
      AND ms.merchant_id = offers.merchant_id
  ))
);

-- DELETE: Only admins can delete offers
CREATE POLICY "offers_delete" ON public.offers
FOR DELETE
USING (check_is_admin());
