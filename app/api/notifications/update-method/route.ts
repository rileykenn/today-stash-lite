import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const { method } = await req.json();

        if (!method || !['phone', 'email', 'none'].includes(method)) {
            return NextResponse.json({ error: 'Invalid notification method' }, { status: 400 });
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

        // Get profile to check verification status
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone, phone_verified, email, email_verified')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Validate that contact method exists and is verified
        if (method === 'phone') {
            if (!profile.phone) {
                return NextResponse.json({ error: 'Please add a phone number first' }, { status: 400 });
            }
            if (!profile.phone_verified) {
                return NextResponse.json({ error: 'Please verify your phone number first' }, { status: 400 });
            }
        } else if (method === 'email') {
            if (!profile.email) {
                return NextResponse.json({ error: 'Please add an email address first' }, { status: 400 });
            }
            if (!profile.email_verified) {
                return NextResponse.json({ error: 'Please verify your email first' }, { status: 400 });
            }
        }

        // Update notification method
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ notification_method: method })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error updating notification method:', updateError);
            return NextResponse.json({ error: 'Failed to update notification method' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Notification method updated to ${method}`
        });

    } catch (error: any) {
        console.error('Error in update-method:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
