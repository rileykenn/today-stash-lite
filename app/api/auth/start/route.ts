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

    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    let dest = target.trim();
    let channel: 'email' | 'sms';

    if (isEmail(dest)) {
      dest = dest.toLowerCase();
      channel = 'email';
    } else {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        return NextResponse.json(
          { error: 'phone must be E.164 (+61...)' },
          { status: 400 }
        );
      }
      channel = 'sms';
    }

    const params = new URLSearchParams({ To: dest, Channel: channel });
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
      return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
    }

    // Optional: minimal debugging breadcrumb (safe to keep)
    console.log('Verify started for', channel, dest);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('start route error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
