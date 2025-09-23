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
  const code = (body['code'] ?? '').toString().trim();
  const phone = normalizePhoneAU(raw);

  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  if (!code)  return NextResponse.json({ error: 'code required' }, { status: 400 });

  try {
    // TODO: connect to Twilio Verify check
    const approved = true; // stub
    return NextResponse.json({ approved });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'verify failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
