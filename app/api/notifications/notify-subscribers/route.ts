import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createClient(req: NextRequest) {
    const cookieStore = await cookies();

    // Create client with Authorization header forwarding
    const options: any = {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: any[]) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch (error) {
                    // Ignored
                }
            },
        },
    };

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
        options.global = {
            headers: {
                Authorization: authHeader,
            },
        };
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        options
    );
}

export async function POST(req: NextRequest) {
    try {
        const sb = await createClient(req);

        // 1. Authenticate Request
        // We use the same hybrid approach (Token or Cookie) logic implicitly handled by createClient + getUser
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        let user = null;
        let authError = null;

        if (token) {
            const { data, error } = await sb.auth.getUser(token);
            user = data.user;
            authError = error;
        } else {
            const { data, error } = await sb.auth.getUser();
            user = data.user;
            authError = error;
        }

        if (authError || !user) {
            console.error('Auth error in notify-subscribers:', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { merchant_id, offer_id, type } = body; // type: 'new' | 'restock'

        if (!merchant_id || !offer_id) {
            return NextResponse.json({ error: 'Missing merchant_id or offer_id' }, { status: 400 });
        }

        // 2. Verify Ownership
        // Ensure the user actually owns this merchant
        const { data: profile } = await sb
            .from('profiles')
            .select('merchant_id')
            .eq('user_id', user.id)
            .single();

        if (profile?.merchant_id !== merchant_id) {
            return NextResponse.json({ error: 'Forbidden: You do not own this merchant' }, { status: 403 });
        }

        // 3. Fetch Deal Details (for the message)
        const { data: offer } = await sb
            .from('offers')
            .select('title, price_cents, original_price_cents')
            .eq('id', offer_id)
            .single();

        if (!offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        // 4. Fetch Merchant Name
        const { data: merchant } = await sb
            .from('merchants')
            .select('name')
            .eq('id', merchant_id)
            .single();

        const merchantName = merchant?.name || 'A local merchant';

        // 5. Find Subscribers with Verified Phones
        // PRIVILEGED OPERATION: Use Service Role Key to bypass RLS
        // (Merchants cannot see other users' notification preferences by default)
        const { createClient: createAdminClient } = require('@supabase/supabase-js');
        const adminSb = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Step 5a: Get user_ids who have subscribed
        const { data: prefs, error: subError } = await adminSb
            .from('notification_preferences')
            .select('user_id')
            .eq('merchant_id', merchant_id)
            .eq('enabled', true);

        if (subError) {
            console.error('Error fetching subscribers:', subError);
            return NextResponse.json({ error: 'Failed to fetch subscribers', debug_error: subError }, { status: 500 });
        }

        const subscriberIds = prefs?.map((p: any) => p.user_id) || [];
        const subscriberCount = subscriberIds.length;

        if (subscriberCount === 0) {
            // DEBUG: Return clear reason
            return NextResponse.json({
                success: true,
                sent_count: 0,
                message: 'No subscribers found for this merchant (Admin Lookup).',
                debug_merchant_id: merchant_id,
                debug_step: 'preferences_lookup_admin'
            });
        }

        // Step 5b: Get their contact info from profiles
        const { data: profiles, error: profError } = await adminSb
            .from('profiles')
            .select('phone, email, notification_method')
            .in('user_id', subscriberIds);
        // .eq('phone_verified', true) // logic moved to split filtering below so we don't exclude email-only users

        if (profError) {
            console.error('Error fetching subscriber profiles:', profError);
            return NextResponse.json({ error: 'Failed to fetch subscriber profiles', debug_error: profError }, { status: 500 });
        }

        // Filter subscribers by method
        // SMS Group: explicit 'sms' or NULL (default)
        const smsSubscribers = (profiles || []).filter((p: any) => p.notification_method !== 'email');

        // Email Group: explicit 'email'
        const emailSubscribers = (profiles || []).filter((p: any) => p.notification_method === 'email' && p.email);

        const verifiedPhoneCount = smsSubscribers.length;
        const emailCount = emailSubscribers.length;

        if (verifiedPhoneCount === 0 && emailCount === 0) {
            return NextResponse.json({
                success: true,
                sent_count: 0,
                message: 'Subscribers exist, but none have valid contact info.',
                debug_total_subscribers: subscriberCount,
                debug_step: 'contact_verification_lookup_admin'
            });
        }

        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        const resendApiKey = process.env.RESEND_API_KEY;

        const dealPrice = (offer.price_cents / 100).toFixed(2);
        const oldPrice = (offer.original_price_cents / 100).toFixed(2);
        const link = `${process.env.NEXT_PUBLIC_APP_URL}/consumer/deal/${offer_id}`;

        const promises = [];

        // --- 6a. Send SMS via Twilio ---
        if (verifiedPhoneCount > 0) {
            if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
                console.error('Twilio credentials missing');
            } else {
                const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
                const twilioAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
                const smsBody = type === 'restock'
                    ? `${merchantName} just restocked: "${offer.title}". Available for $${dealPrice} (valued at $${oldPrice})! ${link} To manage your notifications go to profile settings - notifications.`
                    : `${merchantName} dropped a new deal: "${offer.title}". Available for $${dealPrice} (valued at $${oldPrice})! ${link} To manage your notifications go to profile settings - notifications.`;

                promises.push(...smsSubscribers.map(async (sub: any) => {
                    if (!sub.phone) return { status: 'rejected', reason: 'No phone' };

                    const formData = new URLSearchParams();
                    formData.append('To', sub.phone);
                    formData.append('From', twilioPhoneNumber);
                    formData.append('Body', smsBody);

                    try {
                        const res = await fetch(twilioUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${twilioAuth}`,
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: formData.toString(),
                        });
                        if (!res.ok) throw new Error(await res.text());
                        return { status: 'fulfilled', method: 'sms' };
                    } catch (e: any) {
                        return { status: 'rejected', method: 'sms', reason: e.message };
                    }
                }));
            }
        }

        // --- 6b. Send Email via Resend ---
        if (emailCount > 0) {
            if (!resendApiKey) {
                console.error('Resend API Key missing');
            } else {
                const { Resend } = require('resend');
                const resend = new Resend(resendApiKey);

                const emailSubject = type === 'restock'
                    ? `Restock Alert: ${offer.title} at ${merchantName}`
                    : `New Deal: ${offer.title} at ${merchantName}`;

                const emailHtml = `
                    <h1>${merchantName} has a new deal!</h1>
                    <p><strong>${offer.title}</strong> is available now.</p>
                    <p>Price: <strong>$${dealPrice}</strong> <span style="text-decoration: line-through; color: #888;">($${oldPrice})</span></p>
                    <br/>
                    <a href="${link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Deal</a>
                    <br/><br/>
                    <p style="font-size: 12px; color: #666;">You received this because you are subscribed to ${merchantName}. <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile">Manage preferences</a>.</p>
                `;

                // Resend allows batch sending, but for simplicity/tracking let's map individually or batch if limits allow.
                // Free tier limit is usually per-day/second, but single email to multiple Bcc or individual calls.
                // Let's do individual calls for granular error tracking for now.
                promises.push(...emailSubscribers.map(async (sub: any) => {
                    if (!sub.email) return { status: 'rejected', reason: 'No email' };
                    try {
                        await resend.emails.send({
                            from: 'Today\'s Stash <noreply@todaysstash.com.au>',
                            to: sub.email,
                            subject: emailSubject,
                            html: emailHtml
                        });
                        return { status: 'fulfilled', method: 'email' };
                    } catch (e: any) {
                        return { status: 'rejected', method: 'email', reason: e.message };
                    }
                }));
            }
        }

        const results = await Promise.all(promises);

        const smsSuccess = results.filter((r: any) => r.status === 'fulfilled' && r.method === 'sms').length;
        const emailSuccess = results.filter((r: any) => r.status === 'fulfilled' && r.method === 'email').length;
        const failures = results.filter((r: any) => r.status === 'rejected').map((r: any) => `${r.method}: ${r.reason}`);

        let returnData: any = {
            success: true,
            sent_sms: smsSuccess,
            sent_email: emailSuccess,
            total_subscribers: subscriberCount
        };

        if ((smsSuccess + emailSuccess) === 0 && subscriberCount > 0) {
            returnData.message = `All notifications failed. Errors: ${failures.slice(0, 3).join(', ')}`;
            returnData.debug_errors = failures;
        }

        return NextResponse.json(returnData);

    } catch (error: any) {
        console.error('Error in notify-subscribers:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
