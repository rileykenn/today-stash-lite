-- ============================================================================
-- Auto-Sync Trigger: Profiles -> Merchant Staff
-- Purpose: Prevent RLS lockouts if admins manually edit profiles.
--          Ensures merchant_staff always matches profiles.merchant_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_profile_merchant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. If merchant_id was removed (set to NULL), remove from staff
  IF NEW.merchant_id IS NULL THEN
    DELETE FROM public.merchant_staff
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
  END IF;

  -- 2. If merchant_id changed (or is new), insert/update staff record
  --    Using INSERT ON CONFLICT to cover both cases cleanly
  IF (TG_OP = 'INSERT') OR (NEW.merchant_id IS DISTINCT FROM OLD.merchant_id) THEN
    INSERT INTO public.merchant_staff (user_id, merchant_id)
    VALUES (NEW.user_id, NEW.merchant_id)
    ON CONFLICT (user_id) 
    DO UPDATE SET merchant_id = NEW.merchant_id;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_profile_merchant_change() OWNER TO postgres;

-- Recreate Trigger
DROP TRIGGER IF EXISTS on_profile_merchant_change ON public.profiles;

CREATE TRIGGER on_profile_merchant_change
AFTER INSERT OR UPDATE OF merchant_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_merchant_change();
