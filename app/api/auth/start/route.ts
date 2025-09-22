import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
function isE164(x: string): boolean {
  return /^\+\d{7,15}$/.test(x);
}
// simple AU helper: 04xxxxxxxx → +61xxxxxxxxx
function normalizePhoneAU(s: string): string {
  const t = s.replace(/\s+/g, '');
  if (t.startsWith('+')) return t;
  if (/^0\d{8,10}$/.test(t)) return '+61' + t.slice(1);
  return t;
}

type Body = { target?: string };

export async function POST(req: Request) {
  try {
    const { target }: Body = await req.json();
    if (!target) {
      return NextResponse.json({ error: 'target required' }, { status: 400 });
    }

    let dest = target.trim();
    let channel: 'sms' | 'email';

    if (isEmail(dest)) {
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

    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    const params = new URLSearchParams({ To: dest, Channel: channel });
    const res = await fetch(
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

    const data = await res.json();
    if (!res.ok) {
      console.error('Twilio Verify error:', data);
      return NextResponse.json({ error: 'Twilio request failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sid: data.sid, to: dest, channel });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
