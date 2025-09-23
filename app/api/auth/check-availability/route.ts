import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Call Supabase GoTrue Admin API with service role key.
 */
async function adminFetch(path: string) {
  const url = `${SUPABASE_URL}/auth/v1/admin${path}`;
  console.log('➡️ Fetching:', url);

  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  console.log('⬅️ Response', res.status, res.statusText, json);

  return { status: res.status, data: json };
}

export async function POST(req: Request) {
  try {
    const { email, phone } = (await req.json()) as { email?: string; phone?: string };
    console.log('🔎 Incoming check-availability request:', { email, phone });

    let email_taken = false;
    let phone_taken = false;

    if (email) {
      const { status, data } = await adminFetch(`/users?email=${encodeURIComponent(email)}`);
      if (status === 200) {
        const users = Array.isArray(data) ? data : (data as any)?.users ?? [];
        email_taken = users.length > 0;
      }
    }

    if (phone) {
      const { status, data } = await adminFetch(`/users?phone=${encodeURIComponent(phone)}`);
      if (status === 200) {
        const users = Array.isArray(data) ? data : (data as any)?.users ?? [];
        phone_taken = users.length > 0;
      }
    }

    console.log('✅ Result:', { email_taken, phone_taken });
    return NextResponse.json({ ok: true, email_taken, phone_taken });
  } catch (e: unknown) {
    console.error('💥 Error in check-availability:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
