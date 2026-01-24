-- Backfill merchant_staff from profiles for existing users who are missing staff records
INSERT INTO public.merchant_staff (user_id, merchant_id)
SELECT p.user_id, p.merchant_id
FROM public.profiles p
WHERE p.merchant_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.merchant_staff ms
    WHERE ms.user_id = p.user_id
);
