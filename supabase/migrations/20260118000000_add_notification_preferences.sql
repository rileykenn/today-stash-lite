-- Add notification method and verification fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_method TEXT CHECK (notification_method IN ('phone', 'email', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS email_verification_code TEXT,
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;

-- Add global notifications toggle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT FALSE;

-- Add index for faster verification code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verification ON profiles(phone_verification_code) WHERE phone_verification_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification ON profiles(email_verification_code) WHERE email_verification_code IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN profiles.notification_method IS 'User preferred notification method: phone, email, or none';
COMMENT ON COLUMN profiles.phone_verified IS 'Whether the phone number has been verified via SMS';
COMMENT ON COLUMN profiles.email_verified IS 'Whether the email has been verified';
COMMENT ON COLUMN profiles.notifications_enabled IS 'Global toggle for all notifications';
