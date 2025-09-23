import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

type AdminUser = { id: string; email?: string | null; phone?: string | null };
type AdminUsersEnvelope = { users?: AdminUser[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isAdminUser(v: unknown): v is AdminUser {
  return isRecord(v) && typeof v.id === 'string';
}
function extractUsers(payload: unknown): AdminUser[] {
  if (Array.isArray(payload)) return payload.filter(isAdminUser);
  if (isRecord(payload) && Array.isArray((payload as AdminUsersEnvelope).users)) {
    return ((payload as AdminUsersEnvelope).users ?? []).filter(isAdminUser);
  }
  return [];
}

async function adminFetch(path: string): Promise<{ status: number; data: unknown }> {
  const url = `${SUPABASE_URL}/auth/v1/admin${path}`;
  console.log('➡️ Supabase Admin GET', url);
  const res = await fetch(url, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
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
    const { email, phone } = (await req.json()) as { email?: string; phone?: string };
    const emailQ = email?.trim();
    const phoneQ = phone?.trim();
    console.log('🔎 check input', { email: emailQ, phone: phoneQ });

    if (!emailQ && !phoneQ) {
      return NextResponse.json({ error: 'email or phone required' }, { status: 400 });
    }

    let email_taken = false;
    let phone_taken = false;

    if (emailQ) {
      const { status, data } = await adminFetch(`/users?email=${encodeURIComponent(emailQ)}`);
      if (status === 200) {
        const users = extractUsers(data);
        // ✅ only true if an item exactly matches the email (case-insensitive)
        email_taken = users.some(
          (u) => (u.email ?? '').toLowerCase() === emailQ.toLowerCase()
        );
      } else {
        console.log('⚠️ non-200 email lookup', status);
      }
    }

    if (phoneQ) {
      const { status, data } = await adminFetch(`/users?phone=${encodeURIComponent(phoneQ)}`);
      if (status === 200) {
        const users = extractUsers(data);
        // ✅ only true if an item exactly matches the phone
        phone_taken = users.some((u) => (u.phone ?? '') === phoneQ);
      } else {
        console.log('⚠️ non-200 phone lookup', status);
      }
    }

    console.log('✅ result', { email_taken, phone_taken });
    return NextResponse.json({ ok: true, email_taken, phone_taken });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('💥 check error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
