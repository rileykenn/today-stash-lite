import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizePhoneAU(input: string): string {
  let raw = input.replace(/\s+/g, '');
  raw = raw.replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\d+$/.test(raw)) return `+${raw}`;
  return raw;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string | null;
      phone?: string | null;
      password: string;
    };

    const email = body.email?.trim() || null;
    const phone = body.phone ? normalizePhoneAU(body.phone) : null;
    const password = body.password;

    if (!password || (!email && !phone)) {
      return NextResponse.json({ error: 'password and (email or phone) required' }, { status: 400 });
    }

    console.log('👤 creating user', { email, phone });

    const { data, error } = await admin.auth.admin.createUser({
      email: email ?? undefined,
      phone: phone ?? undefined,
      password,
      email_confirm: false, // keep email confirmation via Supabase flow
      phone_confirm: Boolean(phone), // we verified via Twilio, so confirm
    });

    if (error) {
      // 409-ish duplication handling
      const msg = (error as { message?: string }).message ?? 'createUser failed';
      console.error('❌ createUser error', msg);
      const lower = msg.toLowerCase();
      const isDup = lower.includes('already') || lower.includes('exists') || lower.includes('duplicate');
      return NextResponse.json({ ok: false, error: msg }, { status: isDup ? 409 : 500 });
    }

    console.log('✅ created user', { id: data.user?.id });
    return NextResponse.json({ ok: true, user_id: data.user?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('💥 auth/create error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
