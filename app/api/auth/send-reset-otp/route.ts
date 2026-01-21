import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize full Admin client to bypass RLS when writing codes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify user session using the token to get the REAL user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user || !user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Expire in 15 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        // Update profile with the code. 
        // NOTE: We do NOT change 'email' or 'email_verified' status here. 
        // We reuse the 'email_verification_code' column for this temp verification.
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                email_verification_code: verificationCode,
                verification_code_expires_at: expiresAt.toISOString()
            })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error saving OTP:', updateError);
            return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
        }

        // Send Email via Resend
        const { error: emailError } = await resend.emails.send({
            from: 'Today\'s Stash <noreply@todaysstash.com.au>',
            to: user.email,
            subject: 'Reset Password Verification Code',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Reset Password Request</h2>
          <p>You requested to reset your password. Enter the code below to verify your identity:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${verificationCode}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
        });

        if (emailError) {
            console.error('Resend error:', emailError);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Code sent to ' + user.email });

    } catch (error: any) {
        console.error('Error in send-reset-otp:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
