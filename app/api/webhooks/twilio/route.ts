import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _adminSb: SupabaseClient | null = null;
function getAdmin() {
    if (!_adminSb) {
        _adminSb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _adminSb;
}

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
            let matchPhone = from;

            console.log(`Processing Opt-Out for ${matchPhone}`);

            const { data: user, error: findError } = await getAdmin()
                .from('profiles')
                .select('user_id')
                .eq('phone', matchPhone)
                .single();

            if (findError || !user) {
                // Try without '+' if failed
                if (matchPhone.startsWith('+')) {
                    const cleanPhone = matchPhone.substring(1);
                    const { data: user2 } = await getAdmin()
                        .from('profiles')
                        .select('user_id')
                        .eq('phone', cleanPhone)
                        .single();

                    if (user2) {
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

        // Return TwiML to suppress Twilio errors
        return new NextResponse('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' },
        });

    } catch (error: any) {
        console.error('Twilio Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function updateUserPreference(userId: string) {
    const { error } = await getAdmin()
        .from('profiles')
        .update({ notifications_enabled: false })
        .eq('user_id', userId);

    if (error) {
        console.error(`Failed to update user ${userId} to email prefs:`, error);
    } else {
        console.log(`Successfully downgraded user ${userId} to Email notifications via Webhook.`);
    }
}
