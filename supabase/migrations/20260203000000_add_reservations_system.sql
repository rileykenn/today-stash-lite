-- 1. Modify PROFILES to track strikes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strikes int DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- 2. Create RESERVATIONS table
CREATE TYPE reservation_status AS ENUM ('pending', 'redeemed', 'missed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  offer_id uuid REFERENCES public.offers(id) NOT NULL,
  slot_time timestamptz NOT NULL, -- The scheduled start time of the redemption slot
  status reservation_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Modify REDEMPTIONS to link to reservations
ALTER TABLE public.redemptions
ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id);

-- 4. Enable RLS on reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- View own reservations
CREATE POLICY "Users can view own reservations" 
ON public.reservations FOR SELECT 
USING (auth.uid() = user_id);

-- Create reservations (only if not suspended)
CREATE POLICY "Users can create reservations if not suspended" 
ON public.reservations FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_suspended = false
  )
);

-- Cancel own pending reservations
CREATE POLICY "Users can cancel own pending reservations" 
ON public.reservations FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  status = 'cancelled' AND 
  (SELECT status FROM public.reservations WHERE id = id) = 'pending'
);

-- 6. Function to check for missed reservations (To be run via cron or manually)
CREATE OR REPLACE FUNCTION check_missed_reservations() 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Identify missed reservations
  -- Logic: Status is 'pending', and the slot time + some grace period (e.g. 2 hours? or end of day?) has passed.
  -- User said: "if they do not scan the deal before the business hours close".
  -- For V1, let's assume if it's pending and 24 hours have passed since slot_time, it's missed. 
  -- OR, strictly, if valid_until < now(). 
  -- Let's stick to a simple 12h expiry after slot_time for safety, or we can refine this later.
  
  -- Update status to missed
  WITH missed_res AS (
    UPDATE public.reservations
    SET status = 'missed'
    WHERE status = 'pending' 
      AND slot_time < (now() - interval '12 hours') -- arbitrary safe buffer for "end of day"
    RETURNING user_id
  )
  -- 2. Increment strikes for those users
  UPDATE public.profiles
  SET strikes = strikes + 1
  WHERE user_id IN (SELECT user_id FROM missed_res);

  -- 3. Auto-suspend users with >= 3 strikes
  UPDATE public.profiles
  SET is_suspended = true
  WHERE strikes >= 3;
END;
$$;

-- 7. Grant permissions
GRANT ALL ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
