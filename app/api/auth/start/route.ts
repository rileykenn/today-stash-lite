// app/api/auth/start/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Body = { target?: string };

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
    const { target }: Body = await req.json();
    if (!target) {
      return NextResponse.json({ error: 'target required' }, { status: 400 });
    }

    // Only allow phone here (email handled by Supabase on the client)
    if (isEmail(target)) {
      return NextResponse.json({ error: 'Use email OTP via Supabase' }, { status: 400 });
    }

    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    const phone = normalizePhoneAU(target);
    if (!isE164(phone)) {
      return NextResponse.json({ error: 'phone must be E.164 (+61...)' }, { status: 400 });
    }

    const params = new URLSearchParams({ To: phone, Channel: 'sms' });
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    const data = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error('Twilio start error:', data);
      return NextResponse.json(
        { error: data.message || data.error_code || 'Twilio error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('start route error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
