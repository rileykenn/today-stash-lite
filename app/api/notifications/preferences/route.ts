import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createClient(req?: Request) {
    const cookieStore = await cookies();

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

    if (req) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            options.global = {
                headers: {
                    Authorization: authHeader,
                },
            };
        }
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        options
    );
}

// Helper to get user via Token OR Cookie
async function getUser(req: Request) {
    const sb = await createClient(); // Clean client for auth check only

    // 1. Try Token
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await sb.auth.getUser(token);
        if (user && !error) return { data: { user }, error: null };
    }

    // 2. Try Cookies
    return await sb.auth.getUser();
}

export async function GET(req: Request) {
    try {
        const sb = await createClient(req); // Pass req for creating auth'd client
        const { data: { user }, error: authError } = await getUser(req);

        if (authError || !user) {
            console.error('Auth error in GET:', authError);
            return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const townId = searchParams.get('town_id');

        let query = sb
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id);

        if (townId) {
            query = query.eq('town_id', townId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ ok: true, preferences: data });
    } catch (error: any) {
        console.error('Error fetching notification preferences:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const sb = await createClient(req); // Pass req for creating auth'd client
        const { data: { user }, error: authError } = await getUser(req);
        if (authError || !user) {
            console.error('Auth error in POST:', authError);
            return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
        }

        const body = await req.json();
        const { merchant_id, town_id, enabled = true } = body;

        if (!merchant_id || !town_id) {
            return NextResponse.json({ error: 'merchant_id and town_id required' }, { status: 400 });
        }

        // Upsert notification preference
        const { data, error } = await sb
            .from('notification_preferences')
            .upsert({
                user_id: user.id,
                merchant_id,
                town_id,
                enabled,
            }, {
                onConflict: 'user_id,merchant_id'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, preference: data });
    } catch (error: any) {
        console.error('Error updating notification preference:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const sb = await createClient(req); // Pass req for creating auth'd client
        const { data: { user }, error: authError } = await getUser(req);
        if (authError || !user) {
            console.error('Auth error in DELETE:', authError);
            return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const merchantId = searchParams.get('merchant_id');

        if (!merchantId) {
            return NextResponse.json({ error: 'merchant_id required' }, { status: 400 });
        }

        const { error } = await sb
            .from('notification_preferences')
            .delete()
            .eq('user_id', user.id)
            .eq('merchant_id', merchantId);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Error deleting notification preference:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
