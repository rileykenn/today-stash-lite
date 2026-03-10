import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify user session
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get profile with verification code and pending_phone
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone_verification_code, verification_code_expires_at, pending_phone')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Check if code matches
        if (profile.phone_verification_code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Check if code has expired
        const expiresAt = new Date(profile.verification_code_expires_at);
        if (expiresAt < new Date()) {
            return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
        }

        // 1. Update Auth User Phone (Admin API)
        const { error: updateUserError } = await supabase.auth.admin.updateUserById(
            user.id,
            { phone: profile.pending_phone, phone_confirm: true }
        );

        if (updateUserError) {
            console.error('Error updating auth user:', updateUserError);
            return NextResponse.json({ error: 'Failed to update login phone' }, { status: 500 });
        }

        // 2. Mark profile as verified, move pending_phone to phone, and clear temporary fields
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                phone: profile.pending_phone, // Commit the pending phone number
                phone_verified: true,
                pending_phone: null,
                phone_verification_code: null,
                verification_code_expires_at: null
            })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to verify phone' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Phone number verified successfully'
        });

    } catch (error: any) {
        console.error('Error in verify-phone:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
