import { NextResponse } from 'next/server';
import { createClient, type AdminUserAttributes } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Body = { target?: string; code?: string; password?: string };

function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
function isE164(x: string): boolean {
  return /^\+\d{7,15}$/.test(x);
}
function normalizePhoneAU(s: string): string {
  const t = s.replace(/\s+/g, '');
  if (t.startsWith('+')) return t;
  if (/^0\d{8,10}$/.test(t)) return '+61' + t.slice(1);
  return t;
}

export async function POST(req: Request) {
  try {
    const { target, code, password }: Body = await req.json();
    if (!target || !code || !password) {
      return NextResponse.json(
        { error: 'target, code, and password required' },
        { status: 400 }
      );
    }

    // Normalize target for Twilio
    let dest = target.trim();
    const byEmail = isEmail(dest);
    if (!byEmail) {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        return NextResponse.json(
          { error: 'phone must be E.164 (+61...)' },
          { status: 400 }
        );
      }
    }

    // 1) Verify code with Twilio Verify
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    const params = new URLSearchParams({ To: dest, Code: code.trim() });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    const data = await res.json();
    if (!res.ok || data.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // 2) Create Supabase user (typed, no `any`)
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    const createPayload: AdminUserAttributes = {
      password,
      user_metadata: byEmail
        ? { signup_method: 'email' }
        : { signup_method: 'phone', phone: dest },
      ...(byEmail
        ? { email: dest, email_confirm: true }
        : { phone: dest, phone_confirm: true }),
    };

    const { error: createErr } = await admin.auth.admin.createUser(createPayload);

    if (createErr) {
      const msg = (createErr.message || '').toLowerCase();
      const already = msg.includes('already registered') || msg.includes('duplicate');
      if (!already) {
        console.error('Supabase createUser error:', createErr);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
      // user exists -> treat as success
    }

    // 3) Done. Client can sign in with email+password OR phone+password.
    return NextResponse.json({
      ok: true,
      login: byEmail ? { email: dest } : { phone: dest },
    });
  } catch (err) {
    console.error('verify route error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
