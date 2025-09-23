import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

// Helper to call GoTrue Admin API with service role
async function adminGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Admin API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  try {
    const { email, phone } = (await req.json()) as { email?: string; phone?: string };

    if (!email && !phone) {
      return NextResponse.json({ error: 'email or phone required' }, { status: 400 });
    }

    let email_taken = false;
    let phone_taken = false;

    // GoTrue supports filtering by email or phone
    if (email) {
      const data = await adminGet(`/users?email=${encodeURIComponent(email)}`);
      // returns { users: [...] } or an array depending on version; normalize
      const users = Array.isArray(data) ? data : (data?.users ?? []);
      email_taken = users.length > 0;
    }

    if (phone) {
      const data = await adminGet(`/users?phone=${encodeURIComponent(phone)}`);
      const users = Array.isArray(data) ? data : (data?.users ?? []);
      phone_taken = users.length > 0;
    }

    return NextResponse.json({ ok: true, email_taken, phone_taken });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
