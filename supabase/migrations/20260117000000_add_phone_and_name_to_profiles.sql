-- Add phone and first_name columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS first_name text;

-- Update the trigger function to sync phone and first_name from auth.users
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into profiles (user_id, email, phone, first_name, role)
  values (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data->>'first_name',
    'consumer'::user_role
  )
  on conflict (user_id) do nothing;
  return new;
end
$$;

-- Also update the user_directory sync to include phone
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
begin
  insert into public.user_directory (
    id,
    email,
    phone,
    created_at,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    new.phone,
    new.created_at,
    new.last_sign_in_at
  )
  on conflict (id) do update
  set
    email = excluded.email,
    phone = excluded.phone,
    last_sign_in_at = excluded.last_sign_in_at;

  return new;
end;
$$;
