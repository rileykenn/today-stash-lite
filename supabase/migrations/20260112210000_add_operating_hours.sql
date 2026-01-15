-- Add operating_hours column to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{
  "monday": {"isOpen": true, "open": "09:00", "close": "17:00"},
  "tuesday": {"isOpen": true, "open": "09:00", "close": "17:00"},
  "wednesday": {"isOpen": true, "open": "09:00", "close": "17:00"},
  "thursday": {"isOpen": true, "open": "09:00", "close": "17:00"},
  "friday": {"isOpen": true, "open": "09:00", "close": "17:00"},
  "saturday": {"isOpen": true, "open": "09:00", "close": "17:00"},
  "sunday": {"isOpen": false, "open": "09:00", "close": "17:00"}
}'::jsonb;

COMMENT ON COLUMN public.merchants.operating_hours IS 'JSON object storing open/close times for each day of the week';
