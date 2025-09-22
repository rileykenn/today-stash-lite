// app/api/auth/send-code/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Make it explicit this runs on Node.js (so crypto/fetch/Twilio work)
export const runtime = 'nodejs';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function random6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
function isE164(x: string): boolean {
  return /^\+\d{7,15}$/.test(x);
}
function normalizePhoneAU(s: string): string {
  const trimmed = s.replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (/^0\d{8,10}$/.test(trimmed)) return '+61' + trimmed.slice(1);
  return trimmed;
}

type Body = { target?: string };

export async function POST(req: Request) {
  try {
    const { target }: Body = await req.json();
    if (!target) {
      return NextResponse.json({ error: 'target required' }, { status: 400 });
    }

    let dest = String(target).trim();
    if (!isEmail(dest)) {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        return NextResponse.json(
          { error: 'phone must be E.164 (e.g., +61...)' },
          { status: 400 }
        );
      }
    }

    // If an unexpired unused code already exists, succeed quietly
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('verification_codes')
      .select('id, expires_at, used')
      .eq('target', dest)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (selErr) {
      console.error('select error', selErr);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, reused: true });
    }

    const code = random6();
    const code_hash = sha256Hex(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insErr } = await supabaseAdmin.from('verification_codes').insert({
      target: dest,
      kind: isEmail(dest) ? 'email' : 'phone',
      code_hash,
      expires_at,
    });
    if (insErr) {
      console.error('insert error', insErr);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    // ---- Deliver code ----
    if (isEmail(dest)) {
      // No email provider yet; log in server logs for dev
      console.log(`[DEV] OTP for ${dest}: ${code}`);
    } else {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM;
      if (!sid || !tok || !from) {
        console.log(`[DEV] OTP for ${dest}: ${code} (Twilio envs missing)`);
      } else {
        const body = `Your Today's Stash code is ${code}`;
        const basic = Buffer.from(`${sid}:${tok}`).toString('base64');
        const params = new URLSearchParams({ To: dest, From: from, Body: body });
        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${basic}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        if (!resp.ok) {
          const txt = await resp.text();
          console.error('Twilio error:', txt);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

// Add an empty export to guarantee module status for TypeScript isolatedModules
export {};
