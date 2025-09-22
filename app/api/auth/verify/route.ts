import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
function aliasForPhone(e164: string): string {
  return `${e164.replace(/\+/g, '')}@phone.tstash`;
}

export async function POST(req: Request) {
  try {
    const { target, code, password }: Body = await req.json();
    console.log("Incoming verify request:", { target, code, hasPassword: !!password });

    if (!target || !code || !password) {
      console.warn("Missing required fields", { target, codePresent: !!code, passwordPresent: !!password });
      return NextResponse.json(
        { error: 'target, code, and password required' },
        { status: 400 }
      );
    }

    // Normalize to email for Supabase
    let dest = target.trim();
    let loginEmail = dest;
    if (!isEmail(dest)) {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        console.warn("Invalid phone format", dest);
        return NextResponse.json({ error: 'phone must be E.164 (+61...)' }, { status: 400 });
      }
      loginEmail = aliasForPhone(dest);
    }
    console.log("Normalized loginEmail:", loginEmail);

    // Verify code with Twilio
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    console.log("Checking code with Twilio Verify…", { to: dest, code });

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
    console.log("Twilio Verify response:", data);

    if (!res.ok) {
      console.error("Twilio Verify failed", data);
      return NextResponse.json({ error: 'Twilio request failed' }, { status: 500 });
    }
    if (data.status !== 'approved') {
      console.warn("Invalid or expired code", data);
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Create Supabase user
    console.log("Creating/fetching Supabase user…");

    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: isEmail(target)
        ? { signup_method: 'email' }
        : { signup_method: 'phone', phone: dest },
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes('already registered')) {
        console.log("User already exists in Supabase:", loginEmail);
      } else {
        console.error("Supabase createUser error:", createErr);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    } else {
      console.log("Supabase user created:", created?.user?.id);
    }

    // Success
    return NextResponse.json({ ok: true, emailForLogin: loginEmail });
  } catch (err) {
    console.error("Server error in verify route:", err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
