import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let _admin: SupabaseClient | null = null;
function getAdmin() {
    if (!_admin) {
        _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return _admin;
}

export async function POST(req: Request) {
    try {
        const { email: rawEmail, code } = await req.json();
        const email = rawEmail?.trim().toLowerCase();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // Check if code exists, is valid, not expired, not used
        const { data, error } = await getAdmin()
            .from('verification_codes')
            .select('*')
            .ilike('target', email) // Use ilike
            .eq('kind', 'password_reset')
            .eq('code_hash', codeHash)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Verify code error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
