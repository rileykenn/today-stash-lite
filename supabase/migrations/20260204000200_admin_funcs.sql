-- Function for Admins to Lift User Suspension
CREATE OR REPLACE FUNCTION public.admin_lift_suspension(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- 1. Check if caller is admin (we assume 'admin' role in profiles or metadata)
  -- For now, we'll check profiles role based on calling user
  IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
  ) THEN
      RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 2. Reset Strikes and Suspension
  UPDATE public.profiles
  SET strikes = 0, is_suspended = false
  WHERE user_id = p_user_id;
END;
$$;
