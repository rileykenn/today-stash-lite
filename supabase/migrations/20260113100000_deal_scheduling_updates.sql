-- Add price and scheduling columns to offers table
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS price_cents INTEGER,
ADD COLUMN IF NOT EXISTS original_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recurring_schedule JSONB;

COMMENT ON COLUMN public.offers.price_cents IS 'The discounted price of the deal in cents';
COMMENT ON COLUMN public.offers.original_price_cents IS 'The original price of the item/service in cents';
COMMENT ON COLUMN public.offers.valid_from IS 'The start date/time when the deal becomes active';
COMMENT ON COLUMN public.offers.valid_until IS 'The end date/time when the deal stops being active';
COMMENT ON COLUMN public.offers.recurring_schedule IS 'JSON array defining recurring days and times, e.g., [{ "day": "monday", "start": "09:00", "end": "17:00" }]';
