import { NextResponse } from 'next/server';

function normalizePhoneAU(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = String(input).trim().replace(/\s+/g, '');
  raw = raw.replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const raw = (body['phone'] ?? body['target']) as string | undefined;
  const phone = normalizePhoneAU(raw);

  if (!phone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  try {
    // TODO: connect to Twilio Verify or your provider
    return NextResponse.json({ ok: true, to: phone });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'send failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
