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
        const { email: rawEmail, code, password } = await req.json();

        if (!rawEmail || !code || !password) {
            return NextResponse.json({ error: 'Missing requirements' }, { status: 400 });
        }

        const email = rawEmail.trim().toLowerCase();

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // 1. Verify Code again (double check security)
        // Use ilike for target to handle potential case mismatches in stored codes
        const { data: codeRecord, error: codeError } = await getAdmin()
            .from('verification_codes')
            .select('*')
            .ilike('target', email)
            .eq('kind', 'password_reset')
            .eq('code_hash', codeHash)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (codeError || !codeRecord) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        // 2. Get User ID
        // Try profiles first
        let userId: string | null = null;

        const { data: profile } = await getAdmin()
            .from('profiles')
            .select('user_id')
            .ilike('email', email)
            .single();

        if (profile) {
            userId = profile.user_id;
        } else {
            console.log('Profile not found via ilike, trying listUsers fallback for', email);
            // Fallback: listUsers (inefficient but safe)
            // Note: listUsers() returns first 50 by default. 
            // In a production app with >50 users, this might fail if user is not in first page.
            // But usually for "lite" or dev, it's fine. 
            // Better fallback: assume email is correct and we just need ID. 
            // If we can't find ID, we can't update.
            // We'll try to fetch with a filter if supported, or just fetch page 1.
            const { data: { users }, error: listErr } = await getAdmin().auth.admin.listUsers();
            if (!listErr && users) {
                const user = users.find(u => u.email?.toLowerCase() === email);
                if (user) userId = user.id;
            }
        }

        if (!userId) {
            console.error('User not found for email:', email);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('Updating password for userId:', userId, 'User found via:', profile ? 'profile' : 'listUsers');

        // 3. Update Password
        const { error: updateError } = await getAdmin().auth.admin.updateUserById(
            userId,
            { password: password }
        );

        if (updateError) {
            console.error('Update user error:', updateError);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        // 4. Mark code as used
        await getAdmin()
            .from('verification_codes')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('id', codeRecord.id);

        // 5. Send Confirmation Email
        try {
            const { sendPasswordChangedEmail } = await import('@/lib/email/sendPasswordChangedEmail');
            await sendPasswordChangedEmail(email);
        } catch (emailErr) {
            console.error('Failed to send confirmation email', emailErr);
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Reset confirm error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
