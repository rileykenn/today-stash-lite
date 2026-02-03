-- Update redeem_offer_with_pin to link to reservations
-- This prevents users from getting strikes if they strictly follow the reservation flow or even if they "redeem" normally but validly have a reservation.

CREATE OR REPLACE FUNCTION public.redeem_offer_with_pin(p_offer_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_offer public.offers%rowtype;
  v_user_id uuid := auth.uid();
  v_user_redemptions int;
  v_today_redemptions int;
  v_today_user_redemptions int;
  v_today_start timestamptz;
  v_reservation_id uuid;
BEGIN
  -- Must be logged in
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  -- Calculate midnight Sydney time for today
  v_today_start := (now() AT TIME ZONE 'Australia/Sydney')::date AT TIME ZONE 'Australia/Sydney';

  -- Load offer + merchant and validate PIN + active flag
  SELECT o.* INTO v_offer
  FROM public.offers o
  JOIN public.merchants m ON m.id = o.merchant_id
  WHERE o.id = p_offer_id
    AND o.is_active = true
    AND (m.merchant_pin IS NOT NULL AND m.merchant_pin = p_pin);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid PIN or offer not found' USING errcode = 'P0001';
  END IF;

  -- Check date validity
  IF v_offer.valid_from IS NOT NULL AND now() < v_offer.valid_from THEN
    RAISE EXCEPTION 'Offer not valid yet' USING errcode = 'P0001';
  END IF;

  IF v_offer.valid_until IS NOT NULL AND now() > v_offer.valid_until THEN
    RAISE EXCEPTION 'Offer has expired' USING errcode = 'P0001';
  END IF;

  -- Check total_limit
  IF v_offer.total_limit IS NOT NULL
     AND v_offer.redeemed_count >= v_offer.total_limit THEN
    RAISE EXCEPTION 'Offer total redemption limit reached' USING errcode = 'P0001';
  END IF;

  -- NEW: Check daily per-user limit (always enforced, limit resets at midnight)
  IF v_offer.per_user_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_user_redemptions
    FROM public.redemptions r
    WHERE r.offer_id = p_offer_id
      AND r.user_id = v_user_id
      AND r.redeemed_at >= v_today_start;

    IF v_today_user_redemptions >= v_offer.per_user_limit THEN
      RAISE EXCEPTION 'You have already redeemed this offer today' USING errcode = 'P0001';
    END IF;
  END IF;

  -- Check daily_limit (per offer, all users)
  IF v_offer.daily_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_redemptions
    FROM public.redemptions r
    WHERE r.offer_id = p_offer_id
      AND r.redeemed_at >= v_today_start;

    IF v_today_redemptions >= v_offer.daily_limit THEN
      RAISE EXCEPTION 'Daily redemption limit reached' USING errcode = 'P0001';
    END IF;
  END IF;

  -- ---------------------------------------------------------
  -- RESERVATION CHECK / LINKING
  -- ---------------------------------------------------------
  -- Attempt to find a pending reservation for this user/offer for TODAY (or reasonably close)
  -- This ensures checking in via PIN fulfills the reservation.
  SELECT id INTO v_reservation_id
  FROM public.reservations
  WHERE user_id = v_user_id
    AND offer_id = p_offer_id
    AND status = 'pending'
    -- Check if slot_time is on the same "Sydney Day" as today
    AND (slot_time AT TIME ZONE 'Australia/Sydney')::date = (now() AT TIME ZONE 'Australia/Sydney')::date
  ORDER BY slot_time ASC
  LIMIT 1;

  IF v_reservation_id IS NOT NULL THEN
     UPDATE public.reservations
     SET status = 'redeemed', updated_at = now()
     WHERE id = v_reservation_id;
  END IF;

  -- Insert redemption (include reservation_id if found)
  INSERT INTO public.redemptions (offer_id, user_id, merchant_id, reservation_id)
  VALUES (p_offer_id, v_user_id, v_offer.merchant_id, v_reservation_id);

  -- Increment redeemed_count on offers
  UPDATE public.offers
  SET redeemed_count = redeemed_count + 1
  WHERE id = p_offer_id;

  -- Update user_savings if we have savings_cents
  IF v_offer.savings_cents IS NOT NULL THEN
    INSERT INTO public.user_savings (user_id, total_savings_cents)
    VALUES (v_user_id, v_offer.savings_cents)
    ON CONFLICT (user_id) DO UPDATE
      SET total_savings_cents = public.user_savings.total_savings_cents + excluded.total_savings_cents,
          updated_at = now();
  END IF;
END;
$$;
