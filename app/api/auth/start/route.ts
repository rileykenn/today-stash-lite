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
    console.log("Incoming start request:", { target });

    if (!target) {
      console.warn("Missing target field");
      return NextResponse.json({ error: 'target required' }, { status: 400 });
    }

    let dest = target.trim();
    if (!isEmail(dest)) {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        console.warn("Invalid phone format", dest);
        return NextResponse.json(
          { error: 'phone must be E.164 (+61...)' },
          { status: 400 }
        );
      }
    }
    console.log("Normalized destination:", dest);

    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;

    console.log("Requesting Twilio verification start…", { to: dest });

    const params = new URLSearchParams({ To: dest, Channel: isEmail(dest) ? 'email' : 'sms' });
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
    console.log("Twilio Verify start response:", data);

    if (!res.ok) {
      console.error("Twilio start failed", data);
      return NextResponse.json({ error: 'Twilio request failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: data.status });
  } catch (err) {
    console.error("Server error in start route:", err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
