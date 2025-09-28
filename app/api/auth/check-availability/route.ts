// /app/api/auth/check-availability/route.ts
import { NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- helpers ----------
function normalizePhoneAU(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}
const sameEmail = (a?: string | null, b?: string | null) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
const samePhone = (a?: string | null, b?: string | null) =>
  normalizePhoneAU(a) === normalizePhoneAU(b);

// Paginate through users (up to 10 pages * 200 = 2000 users)
async function findUserByEmail(email: string): Promise<User | null> {
  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const list = (data?.users ?? []) as User[];
    const match = list.find((u) => sameEmail(u.email, email));
    if (match) return match;
    if (list.length < perPage) break; // last page
  }
  return null;
}

async function findUserByPhone(phone: string): Promise<User | null> {
  const target = normalizePhoneAU(phone);
  if (!target) return null;
  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const list = (data?.users ?? []) as User[];
    const match = list.find((u) => samePhone(u.phone, target));
    if (match) return match;
    if (list.length < perPage) break;
  }
  return null;
}

// ---------- handler ----------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string | null; phone?: string | null };
    const email = body.email?.trim() || null;
    const phone = normalizePhoneAU(body.phone);

    if (!email && !phone) {
      return NextResponse.json({
        ok: true,
        email_taken: false,
        phone_taken: false,
        email_unverified: false,
        phone_unverified: false,
      });
    }

    let email_taken = false;
    let email_unverified = false;
    let phone_taken = false;
    let phone_unverified = false;

    if (email) {
      const u = await findUserByEmail(email);
      if (u) {
        email_taken = true;
        email_unverified = !u.email_confirmed_at;
      }
    }
    if (phone) {
      const u = await findUserByPhone(phone);
      if (u) {
        phone_taken = true;
        // Phone accounts in your flow are verified via Twilio before creation
        phone_unverified = false;
      }
    }

    return NextResponse.json({ ok: true, email_taken, email_unverified, phone_taken, phone_unverified });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('check-availability error:', msg);
    // Be UX-friendly: respond 200 with "not taken" so UI doesn't lock up
    return NextResponse.json({
      ok: false,
      email_taken: false,
      phone_taken: false,
      email_unverified: false,
      phone_unverified: false,
      error: msg,
    }, { status: 200 });
  }
}
