import { NextResponse } from 'next/server';

function normalizePhoneAU(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = String(input).trim().replace(/\s+/g, '');
  raw = raw.replace(/^0+/, '');                // "0499..." -> "499..."
  if (/^\+61\d{9}$/.test(raw)) return raw;     // already +61XXXXXXXXX
  if (/^61\d{9}$/.test(raw)) return `+${raw}`; // 61XXXXXXXXX -> +61XXXXXXXXX
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;// 4XXXXXXXX -> +614XXXXXXXX
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const raw = (body['phone'] ?? body['target']) as string | undefined;
  const phone = normalizePhoneAU(raw);

  if (!phone) {
    // NOTE: keep message 'phone required' so it's obvious on the client
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  try {
    // TODO: wire your provider here (Twilio Verify, etc.)
    // Example (pseudo):
    // await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SID!)
    //   .verifications.create({ to: phone, channel: 'sms' });

    return NextResponse.json({ ok: true, to: phone });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'send failed' }, { status: 500 });
  }
}
