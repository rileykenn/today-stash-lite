// app/api/auth/verify-code/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ---- Inline server-only Supabase admin client (no external import) ----
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
// ----------------------------------------------------------------------

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export async function POST(req: Request) {
  try {
    const { target, code } = await req.json();

    if (!target || !code) {
      return NextResponse.json(
        { error: 'target and code required' },
        { status: 400 }
      );
    }

    const trimmed = String(target).trim();
    const codeHash = sha256Hex(String(code).trim());

    // 1) Find latest unused, unexpired code for this target
    const { data, error } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('target', trimmed)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('DB select error', error);
      return NextResponse.json({ error: 'db select failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'code not found or expired' },
        { status: 400 }
      );
    }

    if (data.code_hash !== codeHash) {
      // bump attempts (best-effort)
      await supabaseAdmin
        .from('verification_codes')
        .update({ attempts: (data.attempts ?? 0) + 1 })
        .eq('id', data.id);
      return NextResponse.json({ error: 'invalid code' }, { status: 400 });
    }

    // 2) Mark used
    const { error: updateErr } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', data.id);

    if (updateErr) {
      console.error('DB update error', updateErr);
      return NextResponse.json({ error: 'db update failed' }, { status: 500 });
    }

    // 3) TODO next: create/fetch Supabase Auth user + mint session
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
