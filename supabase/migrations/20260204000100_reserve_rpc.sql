-- Function to Create Reservation AND Decrement Stock
-- Updated to enforce ONE reservation per user per day logic.

CREATE OR REPLACE FUNCTION public.reserve_offer(
  p_offer_id uuid,
  p_slot_time timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_offer public.offers%rowtype;
  v_user_id uuid := auth.uid();
  v_new_res_id uuid;
  v_existing_res_id uuid;
BEGIN
  -- 1. Auth Check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Suspension Check
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND is_suspended = true) THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  -- 3. Check Daily Limit (One reservation per deal per day)
  -- We check if the user already has a reservation for this offer on the SAME DAY as the requested slot.
  -- Ignoring cancelled reservations.
  SELECT id INTO v_existing_res_id
  FROM public.reservations
  WHERE user_id = v_user_id
    AND offer_id = p_offer_id
    AND status IN ('pending', 'redeemed', 'missed')
    AND (slot_time AT TIME ZONE 'Australia/Sydney')::date = (p_slot_time AT TIME ZONE 'Australia/Sydney')::date
  LIMIT 1;

  IF v_existing_res_id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a reservation for this deal on this day.';
  END IF;

  -- 4. Load Offer & Lock Row
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- 5. Check Global Stock
  IF v_offer.total_limit IS NOT NULL THEN
    IF v_offer.redeemed_count >= v_offer.total_limit THEN
      RAISE EXCEPTION 'Offer sold out';
    END IF;
  END IF;

  -- 6. Insert Reservation
  INSERT INTO public.reservations (user_id, offer_id, slot_time, status)
  VALUES (v_user_id, p_offer_id, p_slot_time, 'pending')
  RETURNING id INTO v_new_res_id;

  -- 7. Increment Redeemed Count
  UPDATE public.offers
  SET redeemed_count = redeemed_count + 1
  WHERE id = p_offer_id;

  RETURN v_new_res_id;
END;
$$;
