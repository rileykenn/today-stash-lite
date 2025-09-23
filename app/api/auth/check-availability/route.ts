// /app/api/auth/check-availability/route.ts
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

type AdminUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
};

type AdminUsersEnvelope = {
  users?: AdminUser[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isAdminUser(v: unknown): v is AdminUser {
  if (!isRecord(v)) return false;
  return typeof (v as any).id === 'string';
}
function extractUsers(payload: unknown): AdminUser[] {
  if (Array.isArray(payload)) return payload.filter(isAdminUser);
  if (isRecord(payload) && Array.isArray((payload as AdminUsersEnvelope).users)) {
    return ((payload as AdminUsersEnvelope).users ?? []).filter(isAdminUser);
  }
  return [];
}
function normalizePhoneAU(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

async function adminFetch(path: string): Promise<{ status: number; data: unknown }> {
  const url = `${SUPABASE_URL}/auth/v1/admin${path}`;
  console.log('➡️ Supabase Admin GET', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  console.log('⬅️ Supabase Admin RESP', res.status, String(text).slice(0, 800));
  return { status: res.status, data };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string | null; phone?: string | null };
    const email = body.email?.trim() || null;
    const phoneNorm = normalizePhoneAU(body.phone);

    console.log('🔎 check-availability input', { email, phone: phoneNorm });

    if (!email && !phoneNorm) {
      return NextResponse.json({ error: 'email or phone required' }, { status: 400 });
    }

    let email_taken = false;
    let phone_taken = false;

    if (email) {
      const { status, data } = await adminFetch(`/users?email=${encodeURIComponent(email)}`);
      if (status === 200) email_taken = extractUsers(data).length > 0;
      else console.log('⚠️ non-200 email lookup', status, data);
    }

    if (phoneNorm) {
      const { status, data } = await adminFetch(`/users?phone=${encodeURIComponent(phoneNorm)}`);
      if (status === 200) phone_taken = extractUsers(data).length > 0;
      else console.log('⚠️ non-200 phone lookup', status, data);
    }

    console.log('✅ availability result', { email_taken, phone_taken });
    return NextResponse.json({ ok: true, email_taken, phone_taken });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('💥 check-availability error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
