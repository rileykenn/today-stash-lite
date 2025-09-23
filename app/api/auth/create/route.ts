import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizePhoneAU(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string | null;
      phone?: string | null;
      password: string;
    };

    const email = body.email?.trim() || null;
    const phone = normalizePhoneAU(body.phone);
    const password = body.password;

    if (!password || (!email && !phone)) {
      return NextResponse.json({ error: 'password and (email or phone) required' }, { status: 400 });
    }

    console.log('👤 creating user', { email, phone });

    const { data, error } = await admin.auth.admin.createUser({
      email: email ?? undefined,
      phone: phone ?? undefined,
      password,
      email_confirm: false,      // email will be confirmed via OTP flow
      phone_confirm: Boolean(phone), // Twilio Verify already approved
    });

    if (error) {
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
