import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        // Normalize phone number to minimal format for comparison (remove spaces, parens, dashes)
        // Ideally use libphonenumber-js, but simple cleanup works for basic matches
        const cleanedPhone = phone.replace(/\s+/g, '').replace(/[\(\)\-]/g, '');

        // Ensure it has a country code if possible (defaulting to +61 for AUS if starts with 04)
        // This logic mirrors how Supabase often standardizes inputs
        let formattedPhone = cleanedPhone;
        if (formattedPhone.startsWith('04')) {
            formattedPhone = '+61' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
            // If no country code and not 04, assume it might be raw local, prepend + if missing
            // Be careful here, but for now let's just use the cleaned version or rely on user input
        }

        // Actually, let's try to match VERY loosely to catch any variation
        // We will check for the exact number AND the formatted version

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

        // Check if phone is already in use by another user
        // We check against the input phone AND the formatted phone to catch duplicates
        // Also check the "no plus" version since DB seems to store it that way sometimes (e.g. 614...)
        const noPlusFormatted = formattedPhone.replace(/^\+/, '');

        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .or(`phone.eq.${phone},phone.eq.${formattedPhone},phone.eq.${cleanedPhone},phone.eq.${noPlusFormatted}`)
            .neq('user_id', user.id)
            .maybeSingle();

        if (existingProfile) {
            return NextResponse.json({ error: 'This phone number is already linked to another account.' }, { status: 400 });
        }

        // Generate 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiration (5 minutes from now)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);

        // Update profile with verification code AND pending_phone
        // We do NOT update the main 'phone' column yet
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                pending_phone: formattedPhone, // Store formatted version as pending
                phone_verification_code: code,
                verification_code_expires_at: expiresAt.toISOString(),
                phone_verified: false // Ensure this remains false until verified
            })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to save verification code' }, { status: 500 });
        }

        // Send SMS via Twilio
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            console.error('Twilio credentials not configured');
            return NextResponse.json({ error: 'SMS service not configured' }, { status: 500 });
        }

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

        const formData = new URLSearchParams();
        formData.append('To', phone);
        formData.append('From', twilioPhoneNumber);
        formData.append('Body', `Your Today's Stash verification code is: ${code}. This code expires in 5 minutes.`);

        const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${twilioAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!twilioResponse.ok) {
            const errorData = await twilioResponse.json();
            console.error('Twilio error:', errorData);
            return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your phone'
        });

    } catch (error: any) {
        console.error('Error in send-phone-verification:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
