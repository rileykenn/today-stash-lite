


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."merchant_category" AS ENUM (
    'Cafe & Bakery',
    'Financial',
    'Fitness',
    'Hair & Beauty',
    'Mechanical',
    'Miscellaneous',
    'Pet Care',
    'Photography',
    'Recreation'
);


ALTER TYPE "public"."merchant_category" OWNER TO "postgres";


CREATE TYPE "public"."support_status" AS ENUM (
    'unresolved',
    'contacted',
    'resolved'
);


ALTER TYPE "public"."support_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'merchant',
    'consumer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users"("p_term" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "email" "text", "role" "public"."user_role", "merchant_id" "uuid", "merchant_name" "text", "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    p.user_id,
    p.email,
    p.role,
    p.merchant_id,
    m.name as merchant_name,
    p.created_at,
    u.last_sign_in_at
  from public.profiles p
  left join public.merchants m on m.id = p.merchant_id
  left join auth.users u on u.id = p.user_id
  where
    -- only admins can call this successfully
    exists (
      select 1
      from public.profiles me
      where me.user_id = auth.uid()
        and me.role = 'admin'
    )
    and (p_term is null or p.email ilike ('%' || p_term || '%'))
  order by p.email asc nulls first
  limit 200;
$$;


ALTER FUNCTION "public"."admin_list_users"("p_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_identifier_available"("p_email" "text", "p_phone" "text") RETURNS TABLE("email_taken" boolean, "phone_taken" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  return query
  select
    exists(
      select 1
      from auth.users u
      where p_email is not null
        and u.email is not null
        and lower(u.email) = lower(p_email)
    ),
    exists(
      select 1
      from auth.users u
      where p_phone is not null
        and u.phone = p_phone
    );
end;
$$;


ALTER FUNCTION "public"."check_identifier_available"("p_email" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into profiles (user_id, email, role)
  values (new.id, new.email, 'consumer'::user_role)
  on conflict (user_id) do nothing;
  return new;
end
$$;


ALTER FUNCTION "public"."create_profile_for_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_merchant"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select ms.merchant_id
  from merchant_staff ms
  where ms.user_id = auth.uid()
  order by ms.created_at desc
  limit 1
$$;


ALTER FUNCTION "public"."get_my_merchant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1
    from profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from profiles
    where user_id = uid
      and role = 'admin'::user_role
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_redemption_token"("p_deal_id" "uuid", "p_ttl_seconds" integer DEFAULT 90) RETURNS TABLE("token" "text", "manual_code" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_token   text;
  v_code    text;
  v_expires timestamptz;
begin
  -- 32-char alphabet without ambiguous chars (I, O, 0, 1 removed)
  v_code := (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                             1 + floor(random()*32)::int, 1), '')
    from generate_series(1,5)
  );

  v_token   := encode(gen_random_bytes(16), 'hex');
  v_expires := now() + make_interval(secs => coalesce(p_ttl_seconds, 90));

  insert into public.redemption_tokens (deal_id, user_id, token, manual_code, expires_at)
  values (p_deal_id, auth.uid(), v_token, v_code, v_expires);

  return query
    select v_token, v_code, v_expires;
end;
$$;


ALTER FUNCTION "public"."issue_redemption_token"("p_deal_id" "uuid", "p_ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_offer_with_pin"("p_offer_id" "uuid", "p_pin" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_offer          public.offers%rowtype;
  v_user_id        uuid := auth.uid();
  v_user_redemptions int;
  v_today_redemptions int;
begin
  -- Must be logged in
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Load offer + merchant and validate PIN + active flag
  select o.*
  into v_offer
  from public.offers o
  join public.merchants m on m.id = o.merchant_id
  where o.id = p_offer_id
    and o.is_active = true
    and (m.merchant_pin is not null and m.merchant_pin = p_pin);

  if not found then
    raise exception 'Invalid PIN or offer not found' using errcode = 'P0001';
  end if;

  -- Check date validity
  if v_offer.valid_from is not null and now() < v_offer.valid_from then
    raise exception 'Offer not valid yet' using errcode = 'P0001';
  end if;

  if v_offer.valid_until is not null and now() > v_offer.valid_until then
    raise exception 'Offer has expired' using errcode = 'P0001';
  end if;

  -- Check total_limit
  if v_offer.total_limit is not null
     and v_offer.redeemed_count >= v_offer.total_limit then
    raise exception 'Offer total redemption limit reached' using errcode = 'P0001';
  end if;

  -- Check per_user_limit
  if v_offer.per_user_limit is not null then
    select count(*) into v_user_redemptions
    from public.redemptions r
    where r.offer_id = p_offer_id
      and r.user_id = v_user_id;

    if v_user_redemptions >= v_offer.per_user_limit then
      raise exception 'Per-user redemption limit reached' using errcode = 'P0001';
    end if;
  end if;

  -- Check daily_limit (per offer, all users)
  if v_offer.daily_limit is not null then
    select count(*) into v_today_redemptions
    from public.redemptions r
    where r.offer_id = p_offer_id
      and r.redeemed_at::date = now()::date;

    if v_today_redemptions >= v_offer.daily_limit then
      raise exception 'Daily redemption limit reached' using errcode = 'P0001';
    end if;
  end if;

  -- Insert redemption
  insert into public.redemptions (offer_id, user_id, merchant_id)
  values (p_offer_id, v_user_id, v_offer.merchant_id);

  -- Increment redeemed_count on offers
  update public.offers
  set redeemed_count = redeemed_count + 1
  where id = p_offer_id;

  -- Update user_savings if we have savings_cents
  if v_offer.savings_cents is not null then
    insert into public.user_savings (user_id, total_savings_cents)
    values (v_user_id, v_offer.savings_cents)
    on conflict (user_id) do update
      set total_savings_cents = public.user_savings.total_savings_cents + excluded.total_savings_cents,
          updated_at = now();
  end if;
end;
$$;


ALTER FUNCTION "public"."redeem_offer_with_pin"("p_offer_id" "uuid", "p_pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_qr"("p_token" "text" DEFAULT NULL::"text", "p_code" "text" DEFAULT NULL::"text", "p_merchant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("message" "text", "deal_id" "uuid", "offer_title" "text", "merchant_id" "uuid", "manual_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  r record;      -- token row
  offer record;  -- offer row (now includes savings_cents)
  scanner uuid;  -- current user
  v_savings int;
begin
  if p_token is null and p_code is null then
    raise exception 'Provide token or code';
  end if;

  scanner := auth.uid();

  -- qualify columns to avoid ambiguity
  select *
    into r
  from public.redemption_tokens rt
  where (rt.token = p_token) or (rt.manual_code = upper(p_code))
  order by rt.created_at desc
  limit 1;

  if not found then raise exception 'Token/code not found'; end if;
  if r.used_at is not null then raise exception 'Already used'; end if;
  if r.expires_at < now() then raise exception 'Expired'; end if;

  select
      o.id as deal_id,
      o.title as offer_title,
      o.merchant_id,
      coalesce(o.savings_cents, 0) as savings_cents
    into offer
  from public.offers o
  where o.id = r.deal_id
  limit 1;

  if offer.deal_id is null then raise exception 'Offer missing'; end if;

  if not exists (
    select 1 from public.merchant_staff ms
    where ms.user_id = scanner
      and ms.merchant_id = offer.merchant_id
  ) then
    raise exception 'Not authorized for this merchant';
  end if;

  update public.redemption_tokens
     set used_at = now(),
         scanner_user_id = scanner,
         merchant_id = offer.merchant_id
  where id = r.id;

  -- Safe logging: insert only if not present
  insert into public.redemptions (token_id, offer_id, user_id, merchant_id, redeemed_at)
  select r.id, offer.deal_id, r.user_id, offer.merchant_id, now()
  where not exists (select 1 from public.redemptions x where x.token_id = r.id);

  -- === NEW: increment user's lifetime savings total ===
  v_savings := coalesce(offer.savings_cents, 0);

  insert into public.user_savings (user_id, total_savings_cents)
  values (r.user_id, v_savings)
  on conflict (user_id)
  do update set
    total_savings_cents = public.user_savings.total_savings_cents + excluded.total_savings_cents,
    updated_at = now();

  return query
    select 'Redeemed'::text, offer.deal_id, offer.offer_title, offer.merchant_id, r.manual_code;
end;
$$;


ALTER FUNCTION "public"."redeem_qr"("p_token" "text", "p_code" "text", "p_merchant_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."redemptions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_token"("p_token" "uuid") RETURNS "public"."redemptions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_staff merchant_staff%rowtype;
  v_token tokens%rowtype;
  v_offer offers%rowtype;
  v_red redemptions%rowtype;
begin
  -- Ensure caller is merchant staff
  select * into v_staff from merchant_staff where user_id = auth.uid();
  if not found then
    raise exception 'Not merchant staff';
  end if;

  -- Load token, ensure owned by this merchant, un-used, not expired
  select * into v_token from tokens where id = p_token for update;
  if not found then
    raise exception 'Invalid token';
  end if;
  if v_token.merchant_id <> v_staff.merchant_id then
    raise exception 'Wrong merchant';
  end if;
  if v_token.used_at is not null then
    raise exception 'Already used';
  end if;
  if now() > v_token.expires_at then
    raise exception 'Expired';
  end if;

  -- Optionally check offer active / limits
  select * into v_offer from offers where id = v_token.offer_id and is_active = true;
  if not found then
    raise exception 'Offer inactive';
  end if;

  -- Mark used + create redemption
  update tokens set used_at = now() where id = v_token.id;

  insert into redemptions (token_id, user_id, offer_id, merchant_id)
  values (v_token.id, v_token.user_id, v_token.offer_id, v_token.merchant_id)
  returning * into v_red;

  return v_red;
end;
$$;


ALTER FUNCTION "public"."redeem_token"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redemptions_offers_counter_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if TG_OP = 'INSERT' then
    update public.offers
      set redeemed_count = redeemed_count + 1
      where id = NEW.offer_id;
    return NEW;

  elsif TG_OP = 'DELETE' then
    update public.offers
      set redeemed_count = greatest(0, redeemed_count - 1)
      where id = OLD.offer_id;
    return OLD;

  elsif TG_OP = 'UPDATE' then
    -- if an update moves the redemption to a different offer, adjust both
    if NEW.offer_id is distinct from OLD.offer_id then
      update public.offers
        set redeemed_count = greatest(0, redeemed_count - 1)
        where id = OLD.offer_id;

      update public.offers
        set redeemed_count = redeemed_count + 1
        where id = NEW.offer_id;
    end if;
    return NEW;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."redemptions_offers_counter_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_auth_user_to_directory"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.user_directory (
    id,
    email,
    created_at,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    new.created_at,
    new.last_sign_in_at
  )
  on conflict (id) do update
  set
    email = excluded.email,
    last_sign_in_at = excluded.last_sign_in_at;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_auth_user_to_directory"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update profiles set email = new.email where user_id = new.id;
  return new;
end
$$;


ALTER FUNCTION "public"."sync_profile_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_scan"("p_token" "text", "p_merchant" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_staff merchant_staff%rowtype;
  v_token tokens%rowtype;
  v_offer offers%rowtype;
  v_red   redemptions%rowtype;
  v_token_id uuid;
begin
  -- Ensure caller is staff
  select * into v_staff from merchant_staff where user_id = auth.uid();
  if not found then
    return jsonb_build_object('outcome','rejected','reason','not_staff');
  end if;

  -- Ensure staff belongs to the provided merchant
  if v_staff.merchant_id is null or v_staff.merchant_id <> p_merchant then
    return jsonb_build_object('outcome','rejected','reason','wrong_merchant_context');
  end if;

  -- Parse token UUID
  begin
    v_token_id := p_token::uuid;
  exception when others then
    return jsonb_build_object('outcome','rejected','reason','invalid_token_format');
  end;

  -- Lock token row for safe update
  select * into v_token from tokens where id = v_token_id for update;
  if not found then
    return jsonb_build_object('outcome','rejected','reason','token_not_found');
  end if;

  -- Token must belong to this merchant
  if v_token.merchant_id <> v_staff.merchant_id then
    return jsonb_build_object('outcome','rejected','reason','wrong_merchant');
  end if;

  -- Not expired / not used
  if v_token.used_at is not null then
    return jsonb_build_object('outcome','rejected','reason','already_used');
  end if;

  if now() > v_token.expires_at then
    return jsonb_build_object('outcome','rejected','reason','expired');
  end if;

  -- Offer must be active and (optionally) time-valid
  select * into v_offer from offers where id = v_token.offer_id and is_active = true;
  if not found then
    return jsonb_build_object('outcome','rejected','reason','offer_inactive');
  end if;

  if v_offer.valid_from is not null and now() < v_offer.valid_from then
    return jsonb_build_object('outcome','rejected','reason','offer_not_started');
  end if;
  if v_offer.valid_to is not null and now() > v_offer.valid_to then
    return jsonb_build_object('outcome','rejected','reason','offer_ended');
  end if;

  -- Mark used + create redemption
  update tokens set used_at = now() where id = v_token.id;

  insert into redemptions (token_id, user_id, offer_id, merchant_id)
  values (v_token.id, v_token.user_id, v_token.offer_id, v_token.merchant_id)
  returning * into v_red;

  return jsonb_build_object('outcome','accepted');
end;
$$;


ALTER FUNCTION "public"."validate_scan"("p_token" "text", "p_merchant" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_area_access_code"("p_area_key" "text", "p_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_match boolean;
begin
  select (t.access_code = p_code)
  into v_match
  from public.towns t
  where t.slug = p_area_key;

  return coalesce(v_match, false);
end;
$$;


ALTER FUNCTION "public"."verify_area_access_code"("p_area_key" "text", "p_code" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "business_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "position" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "category" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "town_name" "text",
    "status" "text" DEFAULT 'unread'::"text" NOT NULL,
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['unread'::"text", 'read'::"text", 'pending'::"text", 'approved'::"text", 'denied'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."area_access_codes" (
    "area_key" "text" NOT NULL,
    "area_name" "text" NOT NULL,
    "access_code" "text" NOT NULL
);


ALTER TABLE "public"."area_access_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'consumer'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'free'::"text",
    "email" "text",
    "merchant_id" "uuid",
    "welcome_email_sent_at" timestamp with time zone,
    "subscribed_towns" "text"[]
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."subscribed_towns" IS 'Array of town slugs that the user is subscribed to';



CREATE TABLE IF NOT EXISTS "public"."user_access" (
    "user_id" "uuid" NOT NULL,
    "paid" boolean DEFAULT false NOT NULL,
    "paid_at" timestamp with time zone,
    "provider" "text",
    "provider_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_access" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."me" AS
 SELECT "au"."id" AS "user_id",
    "p"."role",
    COALESCE("ua"."paid", false) AS "paid"
   FROM (("auth"."users" "au"
     LEFT JOIN "public"."profiles" "p" ON (("p"."user_id" = "au"."id")))
     LEFT JOIN "public"."user_access" "ua" ON (("ua"."user_id" = "au"."id")))
  WHERE ("au"."id" = "auth"."uid"());


ALTER VIEW "public"."me" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_staff" (
    "user_id" "uuid" NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "street_address" "text",
    "merchant_pin" "text" DEFAULT "lpad"((("floor"(("random"() * (1000000)::double precision)))::integer)::"text", 6, '0'::"text"),
    "town_id" "uuid",
    "category" "public"."merchant_category" DEFAULT 'Miscellaneous'::"public"."merchant_category"
);


ALTER TABLE "public"."merchants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "terms" "text",
    "exp_date" timestamp with time zone,
    "daily_limit" integer,
    "total_limit" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text",
    "savings_cents" integer,
    "per_user_limit" integer DEFAULT 1 NOT NULL,
    "redeemed_count" integer DEFAULT 0 NOT NULL,
    "area_key" "text" DEFAULT 'default'::"text" NOT NULL,
    "area_name" "text" DEFAULT 'Local deals'::"text" NOT NULL
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."redemption_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "manual_code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "scanner_user_id" "uuid",
    "merchant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."redemption_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."success_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."success_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."success_stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "business" "text" NOT NULL,
    "contact" "text",
    "location" "text",
    "quote" "text" NOT NULL,
    "result_summary" "text",
    "image_path" "text",
    "legacy_source_url" "text",
    "is_published" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."success_stories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."success_stories_view" AS
 SELECT "s"."id",
    "s"."business",
    "s"."contact",
    "s"."location",
    "s"."quote",
    "s"."result_summary",
    "s"."image_path",
    "s"."sort_order",
    "s"."created_at",
    "c"."name" AS "category_name",
    "c"."slug" AS "category_slug",
    "c"."sort_order" AS "category_sort"
   FROM ("public"."success_stories" "s"
     LEFT JOIN "public"."success_categories" "c" ON (("s"."category_id" = "c"."id")))
  WHERE ("s"."is_published" = true);


ALTER VIEW "public"."success_stories_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "type" "text" NOT NULL,
    "topic" "text",
    "message" "text" NOT NULL,
    "status" "public"."support_status" DEFAULT 'unresolved'::"public"."support_status" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."towns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "access_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_free" boolean DEFAULT false NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."towns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_directory" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."user_directory" REPLICA IDENTITY FULL;


ALTER TABLE "public"."user_directory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_savings" (
    "user_id" "uuid" NOT NULL,
    "total_savings_cents" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_savings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "attempts" integer DEFAULT 0
);


ALTER TABLE "public"."verification_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "town_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."area_access_codes"
    ADD CONSTRAINT "area_access_codes_pkey" PRIMARY KEY ("area_key");



ALTER TABLE ONLY "public"."merchant_staff"
    ADD CONSTRAINT "merchant_staff_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."merchant_staff"
    ADD CONSTRAINT "merchant_staff_unique" UNIQUE ("merchant_id", "user_id");



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."redemption_tokens"
    ADD CONSTRAINT "redemption_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemption_tokens"
    ADD CONSTRAINT "redemption_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."success_categories"
    ADD CONSTRAINT "success_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."success_categories"
    ADD CONSTRAINT "success_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."success_stories"
    ADD CONSTRAINT "success_stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."towns"
    ADD CONSTRAINT "towns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."towns"
    ADD CONSTRAINT "towns_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_directory"
    ADD CONSTRAINT "user_directory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_savings"
    ADD CONSTRAINT "user_savings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."verification_codes"
    ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "applications_created_at_idx" ON "public"."applications" USING "btree" ("created_at" DESC);



CREATE INDEX "applications_is_read_idx" ON "public"."applications" USING "btree" ("is_read");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_merchant_id" ON "public"."profiles" USING "btree" ("merchant_id");



CREATE UNIQUE INDEX "merchants_merchant_pin_uniq" ON "public"."merchants" USING "btree" ("merchant_pin");



CREATE INDEX "merchants_town_id_idx" ON "public"."merchants" USING "btree" ("town_id");



CREATE INDEX "redemption_tokens_code_idx" ON "public"."redemption_tokens" USING "btree" ("manual_code");



CREATE INDEX "redemption_tokens_deal_idx" ON "public"."redemption_tokens" USING "btree" ("deal_id");



CREATE INDEX "redemption_tokens_expires_idx" ON "public"."redemption_tokens" USING "btree" ("expires_at");



CREATE INDEX "redemptions_offer_idx" ON "public"."redemptions" USING "btree" ("offer_id");



CREATE INDEX "redemptions_offer_user_idx" ON "public"."redemptions" USING "btree" ("offer_id", "user_id");



CREATE UNIQUE INDEX "redemptions_token_id_uidx" ON "public"."redemptions" USING "btree" ("token_id") WHERE ("token_id" IS NOT NULL);



CREATE INDEX "verification_codes_expires_at_idx" ON "public"."verification_codes" USING "btree" ("expires_at");



CREATE INDEX "verification_codes_target_idx" ON "public"."verification_codes" USING "btree" ("target");



CREATE OR REPLACE TRIGGER "Applicants" AFTER INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://hook.us2.make.com/3joxsn62ccvrjyv18oqqhtejv9kpm3j5', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "Support_requests" AFTER INSERT ON "public"."support_requests" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://hook.us2.make.com/6i94490191vmejivmp3vhvk1drra9vpe', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "trg_offers_redeemed_count" AFTER INSERT OR DELETE OR UPDATE OF "offer_id" ON "public"."redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."redemptions_offers_counter_sync"();



CREATE OR REPLACE TRIGGER "trg_support_requests_updated_at" BEFORE UPDATE ON "public"."support_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."merchant_staff"
    ADD CONSTRAINT "merchant_staff_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_staff"
    ADD CONSTRAINT "merchant_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemption_tokens"
    ADD CONSTRAINT "redemption_tokens_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemption_tokens"
    ADD CONSTRAINT "redemption_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."redemption_tokens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."success_stories"
    ADD CONSTRAINT "success_stories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."success_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_savings"
    ADD CONSTRAINT "user_savings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can read support requests" ON "public"."support_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update support requests" ON "public"."support_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow inserts for anyone" ON "public"."waitlist" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow inserts from authenticated or anon" ON "public"."support_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "Only service role can insert" ON "public"."success_stories" FOR INSERT WITH CHECK (false);



CREATE POLICY "Public read categories" ON "public"."success_categories" FOR SELECT USING (true);



CREATE POLICY "Public read published stories" ON "public"."success_stories" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public read success stories" ON "public"."success_stories" FOR SELECT USING (true);



CREATE POLICY "access admin read" ON "public"."user_access" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "access admin upsert" ON "public"."user_access" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role"))))) WITH CHECK (true);



CREATE POLICY "access self read" ON "public"."user_access" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "access self upsert" ON "public"."user_access" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "admin can read merchants" ON "public"."merchants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p2"
  WHERE (("p2"."user_id" = "auth"."uid"()) AND ("p2"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "consumers can insert redemptions" ON "public"."redemptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "consumers can view their own redemptions" ON "public"."redemptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "merchant can view their own redemptions" ON "public"."redemptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."merchant_id" = "redemptions"."merchant_id")))));



CREATE POLICY "merchant can view venue redemptions" ON "public"."redemptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."merchant_id" = "redemptions"."merchant_id")))));



ALTER TABLE "public"."merchant_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "merchants admin write" ON "public"."merchants" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role"))))) WITH CHECK (true);



CREATE POLICY "merchants public read" ON "public"."merchants" FOR SELECT USING (true);



ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offers admin write" ON "public"."offers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role"))))) WITH CHECK (true);



CREATE POLICY "offers public read" ON "public"."offers" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles admin read" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "profiles admin write" ON "public"."profiles" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles self read" ON "public"."profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."redemption_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "redemptions staff insert" ON "public"."redemptions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."merchant_staff" "ms"
  WHERE (("ms"."user_id" = "auth"."uid"()) AND ("ms"."merchant_id" = "redemptions"."merchant_id")))));



CREATE POLICY "redemptions user read own" ON "public"."redemptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rt_insert_self" ON "public"."redemption_tokens" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "rt_select_own" ON "public"."redemption_tokens" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "staff admin write" ON "public"."merchant_staff" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role"))))) WITH CHECK (true);



CREATE POLICY "staff self read" ON "public"."merchant_staff" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "staff_can_read_self" ON "public"."merchant_staff" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."success_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."success_stories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tokens staff read" ON "public"."tokens" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."merchant_staff" "ms"
  WHERE (("ms"."user_id" = "auth"."uid"()) AND ("ms"."merchant_id" = "tokens"."merchant_id")))));



CREATE POLICY "tokens staff update" ON "public"."tokens" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."merchant_staff" "ms"
  WHERE (("ms"."user_id" = "auth"."uid"()) AND ("ms"."merchant_id" = "tokens"."merchant_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."merchant_staff" "ms"
  WHERE (("ms"."user_id" = "auth"."uid"()) AND ("ms"."merchant_id" = "tokens"."merchant_id")))));



CREATE POLICY "tokens user create if paid" ON "public"."tokens" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_access" "ua"
  WHERE (("ua"."user_id" = "auth"."uid"()) AND ("ua"."paid" = true))))));



CREATE POLICY "tokens user read own" ON "public"."tokens" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_savings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_savings_select_own" ON "public"."user_savings" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


















































































































































































































GRANT ALL ON FUNCTION "public"."admin_list_users"("p_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_identifier_available"("p_email" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_identifier_available"("p_email" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_identifier_available"("p_email" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_merchant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_merchant"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_merchant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_merchant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."issue_redemption_token"("p_deal_id" "uuid", "p_ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."issue_redemption_token"("p_deal_id" "uuid", "p_ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_redemption_token"("p_deal_id" "uuid", "p_ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_offer_with_pin"("p_offer_id" "uuid", "p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_offer_with_pin"("p_offer_id" "uuid", "p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_offer_with_pin"("p_offer_id" "uuid", "p_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_qr"("p_token" "text", "p_code" "text", "p_merchant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_qr"("p_token" "text", "p_code" "text", "p_merchant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_qr"("p_token" "text", "p_code" "text", "p_merchant_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."redemptions" TO "anon";
GRANT ALL ON TABLE "public"."redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."redemptions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_token"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_token"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_token"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_token"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."redemptions_offers_counter_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."redemptions_offers_counter_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."redemptions_offers_counter_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_auth_user_to_directory"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_auth_user_to_directory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_auth_user_to_directory"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_scan"("p_token" "text", "p_merchant" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_scan"("p_token" "text", "p_merchant" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_scan"("p_token" "text", "p_merchant" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_scan"("p_token" "text", "p_merchant" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_area_access_code"("p_area_key" "text", "p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_area_access_code"("p_area_key" "text", "p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_area_access_code"("p_area_key" "text", "p_code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."area_access_codes" TO "anon";
GRANT ALL ON TABLE "public"."area_access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."area_access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_access" TO "anon";
GRANT ALL ON TABLE "public"."user_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_access" TO "service_role";



GRANT ALL ON TABLE "public"."me" TO "anon";
GRANT ALL ON TABLE "public"."me" TO "authenticated";
GRANT ALL ON TABLE "public"."me" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_staff" TO "anon";
GRANT ALL ON TABLE "public"."merchant_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_staff" TO "service_role";



GRANT ALL ON TABLE "public"."merchants" TO "anon";
GRANT ALL ON TABLE "public"."merchants" TO "authenticated";
GRANT ALL ON TABLE "public"."merchants" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."redemption_tokens" TO "anon";
GRANT ALL ON TABLE "public"."redemption_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."redemption_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."success_categories" TO "anon";
GRANT ALL ON TABLE "public"."success_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."success_categories" TO "service_role";



GRANT ALL ON TABLE "public"."success_stories" TO "anon";
GRANT ALL ON TABLE "public"."success_stories" TO "authenticated";
GRANT ALL ON TABLE "public"."success_stories" TO "service_role";



GRANT ALL ON TABLE "public"."success_stories_view" TO "anon";
GRANT ALL ON TABLE "public"."success_stories_view" TO "authenticated";
GRANT ALL ON TABLE "public"."success_stories_view" TO "service_role";



GRANT ALL ON TABLE "public"."support_requests" TO "anon";
GRANT ALL ON TABLE "public"."support_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."support_requests" TO "service_role";



GRANT ALL ON TABLE "public"."tokens" TO "anon";
GRANT ALL ON TABLE "public"."tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."tokens" TO "service_role";



GRANT ALL ON TABLE "public"."towns" TO "anon";
GRANT ALL ON TABLE "public"."towns" TO "authenticated";
GRANT ALL ON TABLE "public"."towns" TO "service_role";



GRANT ALL ON TABLE "public"."user_directory" TO "anon";
GRANT ALL ON TABLE "public"."user_directory" TO "authenticated";
GRANT ALL ON TABLE "public"."user_directory" TO "service_role";



GRANT ALL ON TABLE "public"."user_savings" TO "anon";
GRANT ALL ON TABLE "public"."user_savings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_savings" TO "service_role";



GRANT ALL ON TABLE "public"."verification_codes" TO "anon";
GRANT ALL ON TABLE "public"."verification_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_codes" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
