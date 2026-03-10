import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Verify user session
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // One-time code expires in 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { error: emailError } = await resend.emails.send({
            from: 'Today\'s Stash <noreply@todaysstash.com.au>',
            to: email,
            subject: 'Verify your email for Today\'s Stash',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Verify Your Email</h2>
          <p>Enter the code below to verify your email address for Today's Stash:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${verificationCode}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `
        });

        if (emailError) {
            console.error('Resend error:', emailError);
            return NextResponse.json({ error: 'Failed to send verification email. Please check the email address.' }, { status: 500 });
        }

        // Only save email to profile AFTER successful send
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                email: email,
                email_verification_code: verificationCode,
                verification_code_expires_at: expiresAt.toISOString(),
                email_verified: false
            })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to save verification token' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Verification email sent. Please check your inbox.'
        });

    } catch (error: any) {
        console.error('Error in send-email-verification:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
