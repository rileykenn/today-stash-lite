import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Admin client to bypass RLS and insert into verification_codes
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(req: Request) {
    try {
        const { email: rawEmail } = await req.json();
        const email = rawEmail?.trim().toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Check if user exists (optional, but good practice to avoid leaking info? 
        // OR we just pretend sent. Let's send only if user exists to save Resend quota)
        const { data: { users }, error: userError } = await admin.auth.admin.listUsers();
        // listing all users is inefficient for large bases, but fine for lite. 
        // Better: try to get user by email if possible? 
        // admin.auth.admin.getUserByEmail doesn't exist? it does: listUsers({ filters: ... })? 
        // actually standard practice: just generate code. If email invalid, it bounces or we don't care.
        // But let's assume valid email for now to proceed.

        // 2. Generate 6-digit Code
        const code = crypto.randomInt(100000, 999999).toString();

        // 3. Store in DB (verification_codes)
        // We hash it for security in case DB is leaked, even though it's short lived.
        // Simple SHA256
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // delete old codes for this target to prevent clutter
        await admin.from('verification_codes').delete().eq('target', email).eq('kind', 'password_reset');

        const { error: insertError } = await admin.from('verification_codes').insert({
            target: email,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
            code_hash: codeHash,
            kind: 'password_reset',
            used: false
        });

        if (insertError) {
            console.error('Failed to store reset code:', insertError);
            return NextResponse.json({ error: 'System error generating code' }, { status: 500 });
        }

        // 4. Send Email
        const { sendPasswordResetEmail } = await import('@/lib/email/sendPasswordResetEmail');
        await sendPasswordResetEmail(email, code);

        console.log('✅ reset code sent to', email, 'Code:', code);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Reset password error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

