import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Admin Client (Service Role)
// We need this because this webhook comes from Twilio, not an authenticated user session.
const adminSb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        // Twilio sends form-urlencoded data
        const formData = await req.formData();
        const body = formData.get('Body')?.toString().trim().toUpperCase();
        const from = formData.get('From')?.toString();

        console.log(`Received Twilio Webhook from: ${from}, Body: ${body}`);

        if (!from || !body) {
            return NextResponse.json({ error: 'Missing From/Body' }, { status: 400 });
        }

        // Handle "STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT" (Standard Twilio Opt-out keywords)
        const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];

        if (optOutKeywords.includes(body)) {
            // Remove '+' if present for lookup, though usually stored with it.
            // Our DB stores phones as they are verified, usually e.g. 614... or +614...
            // Let's try direct match first.

            // Note: Twilio sends usually E.164 (e.g. +15551234567)
            // Ideally we normalize, but let's try exact match first.
            let matchPhone = from;
            // If from starts with + and our DB doesn't, or vice versa... 
            // Ideally we treat phone numbers consistently.

            console.log(`Processing Opt-Out for ${matchPhone}`);

            const { data: user, error: findError } = await adminSb
                .from('profiles')
                .select('user_id')
                .eq('phone', matchPhone)
                .single();

            if (findError || !user) {
                // Try without '+' if failed
                if (matchPhone.startsWith('+')) {
                    const cleanPhone = matchPhone.substring(1);
                    const { data: user2 } = await adminSb
                        .from('profiles')
                        .select('user_id')
                        .eq('phone', cleanPhone)
                        .single();

                    if (user2) {
                        // Found with cleaned phone
                        await updateUserPreference(user2.user_id);
                    } else {
                        console.warn(`No user found for phone ${from}`);
                    }
                } else {
                    console.warn(`No user found for phone ${from}`);
                }
            } else {
                await updateUserPreference(user.user_id);
            }
        }

        // Return TwiML to suppress Twilio errors (or just 200 OK)
        // Returning <Response /> is standard for "do nothing else"
        return new NextResponse('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' },
        });

    } catch (error: any) {
        console.error('Twilio Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function updateUserPreference(userId: string) {
    // Hard opt-out: Disable notifications entirely.
    // The user must manually re-enable them in the app if they want to resume (Email or SMS).
    const { error } = await adminSb
        .from('profiles')
        .update({ notifications_enabled: false })
        .eq('user_id', userId);

    if (error) {
        console.error(`Failed to update user ${userId} to email prefs:`, error);
    } else {
        console.log(`Successfully downgraded user ${userId} to Email notifications via Webhook.`);
    }
}
