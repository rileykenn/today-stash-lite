import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
        }

        // Get user from session
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify user session
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find profile 
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, email, email_verification_code, verification_code_expires_at')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Validate code
        if (profile.email_verification_code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Check expiration
        const expiresAt = new Date(profile.verification_code_expires_at);
        if (expiresAt < new Date()) {
            return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
        }

        // 1. Update Auth User Email (Admin API)
        // This updates the actual login email without sending another confirmation email because we just verified it manually
        const { error: updateUserError } = await supabase.auth.admin.updateUserById(
            user.id,
            { email: profile.email, email_confirm: true }
        );

        if (updateUserError) {
            console.error('Error updating auth user:', updateUserError);
            return NextResponse.json({ error: 'Failed to update login email' }, { status: 500 });
        }

        // 2. Mark profile as verified
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
                email_verified: true,
                email_verification_code: null,
                verification_code_expires_at: null
            })
            .eq('user_id', user.id);

        if (updateProfileError) {
            console.error('Error updating profile:', updateProfileError);
            // Non-blocking error since auth update succeeded
        }

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error: any) {
        console.error('Error in verify-email:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
