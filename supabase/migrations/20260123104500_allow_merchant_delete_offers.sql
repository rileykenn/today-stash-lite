-- Fix offers DELETE policy to allow merchants to delete their own offers
-- Currently only admins can DELETE offers, preventing merchants from managing their deals

-- ============================================================================
-- Drop existing DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "offers_delete" ON public.offers;

-- ============================================================================
-- Recreate DELETE policy with merchant permission
-- ============================================================================

-- DELETE: Staff at a merchant can delete their merchant's offers, admins can delete any
CREATE POLICY "offers_delete" ON public.offers
FOR DELETE
USING (
  check_is_admin()
  OR
  (EXISTS (
    SELECT 1 FROM merchant_staff ms
    WHERE ms.user_id = (select auth.uid())
      AND ms.merchant_id = offers.merchant_id
  ))
);
