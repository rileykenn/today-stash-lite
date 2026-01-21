import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 });
        }

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch stored code
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('email_verification_code, verification_code_expires_at')
            .eq('user_id', user.id)
            .single();

        if (fetchError || !profile) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        if (profile.email_verification_code !== code) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }

        const expiresAt = new Date(profile.verification_code_expires_at);
        if (new Date() > expiresAt) {
            return NextResponse.json({ error: 'Code expired (15m limit). Please request a new one.' }, { status: 400 });
        }

        // Code is valid. Clean up the code.
        await supabase
            .from('profiles')
            .update({
                email_verification_code: null,
                verification_code_expires_at: null
            })
            .eq('user_id', user.id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error in verify-reset-otp:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
