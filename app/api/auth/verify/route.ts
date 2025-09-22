import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Body = { target?: string; code?: string };

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
    const { target, code }: Body = await req.json();
    if (!target || !code) {
      return NextResponse.json(
        { error: 'target and code required' },
        { status: 400 }
      );
    }

    let dest = target.trim();
    if (!isEmail(dest)) {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        return NextResponse.json(
          { error: 'phone must be E.164 (+61...)' },
          { status: 400 }
        );
      }
    }

    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    const params = new URLSearchParams({ To: dest, Code: code.trim() });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error('Twilio Verify error:', data);
      return NextResponse.json(
        { error: 'Twilio request failed' },
        { status: 500 }
      );
    }

    if (data.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // ✅ At this point the code is valid.
    // Next step: create/fetch Supabase user and set session.
    return NextResponse.json({ ok: true, to: dest });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
