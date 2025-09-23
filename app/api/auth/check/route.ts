import { NextResponse } from 'next/server';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const VERIFY_SID = process.env.TWILIO_VERIFY_SID!;

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
    const { phone, code } = (await req.json()) as { phone: string; code: string };
    const to = normalizePhoneAU(phone);
    console.log('🔎 Twilio check for', to);

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({ To: to, Code: code }),
      }
    );

    const json = await res.json().catch(() => ({}));
    console.log('✅ Twilio check resp', res.status, JSON.stringify(json).slice(0, 400));

    const status = (json?.status ?? '') as string;
    const approved = status.toLowerCase() === 'approved';
    if (!approved) {
      return NextResponse.json(
        { approved: false, error: json?.message ?? 'Invalid or expired code' },
        { status: 200 }
      );
    }
    return NextResponse.json({ approved: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('💥 verify/check error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
