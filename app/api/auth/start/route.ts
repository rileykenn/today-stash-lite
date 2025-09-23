import { NextResponse } from 'next/server';
import twilio from 'twilio';
export const runtime = 'nodejs';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken  = process.env.TWILIO_AUTH_TOKEN!;
const verifySid  = process.env.TWILIO_VERIFY_SID!;
const DEBUG = process.env.DEBUG_VERIFY === '1';

const client = twilio(accountSid, authToken);

function normalizePhoneAU(input?: string | null): string | null {
  if (!input) return null;
  let raw = String(input).trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

export async function POST(req: Request) {
  // 0) env presence (definitive)
  const missing: string[] = [];
  if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!process.env.TWILIO_AUTH_TOKEN)  missing.push('TWILIO_AUTH_TOKEN');
  if (!process.env.TWILIO_VERIFY_SID)  missing.push('TWILIO_VERIFY_SID');
  if (missing.length) {
    console.error('[verify.start] missing env', missing);
    return NextResponse.json({ error: `server misconfigured: ${missing.join(', ')}` }, { status: 500 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const phone = normalizePhoneAU((body['phone'] ?? body['target']) as string | undefined);
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  try {
    const res = await client.verify.v2.services(verifySid)
      .verifications.create({ to: phone, channel: 'sms' });

    console.log('[verify.start]', { to: phone, sid: res.sid, status: res.status, channel: res.channel });
    // non-secret debug echo
    return NextResponse.json({ ok: true, ...(DEBUG ? { status: res.status } : {}) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'send failed';
    console.error('[verify.start.error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
