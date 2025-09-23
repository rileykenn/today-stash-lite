// /app/api/auth/check-availability/route.ts
import { NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

// Admin client
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- helpers ----
function normalizePhoneAU(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

function sameEmail(a?: string | null, b?: string | null) {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

function samePhone(a?: string | null, b?: string | null) {
  return normalizePhoneAU(a) === normalizePhoneAU(b);
}

// Pull a single page of users and check locally.
// (Good enough for early-stage; expand to multiple pages if you have >200 users)
async function anyUserMatches({
  email,
  phone,
}: {
  email?: string | null;
  phone?: string | null;
}) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;

  const list = (data?.users ?? []) as User[];

  const email_taken = email
    ? list.some((u) => sameEmail(u.email, email))
    : false;

  const phone_taken = phone
    ? list.some((u) => samePhone(u.phone, phone))
    : false;

  return { email_taken, phone_taken };
}

// ---- handler ----
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string | null; phone?: string | null };
    const email = body.email?.trim() || null;
    const phone = normalizePhoneAU(body.phone);

    // For empty/invalid input, return "not taken" so the client UI never gets stuck.
    if (!email && !phone) {
      return NextResponse.json({ ok: true, email_taken: false, phone_taken: false });
    }

    const { email_taken, phone_taken } = await anyUserMatches({ email, phone });

    return NextResponse.json({ ok: true, email_taken, phone_taken });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('💥 check-availability error', msg);
    // On error, be safe for UX: report not taken so UI doesn’t lock users out.
    return NextResponse.json({ ok: false, email_taken: false, phone_taken: false, error: msg }, { status: 200 });
  }
}
