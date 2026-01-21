import { NextResponse } from 'next/server';
import { sb } from '@/lib/supabaseBrowser';

export async function POST(req: Request) {
    try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { town_id, enabled } = body;

        if (!town_id || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'town_id and enabled required' }, { status: 400 });
        }

        // Get all merchants in this town
        const { data: merchants, error: merchantsError } = await sb
            .from('merchants')
            .select('id')
            .eq('town_id', town_id);

        if (merchantsError) throw merchantsError;

        if (!merchants || merchants.length === 0) {
            return NextResponse.json({ ok: true, message: 'No merchants in this town' });
        }

        if (enabled) {
            // Enable all merchants
            const preferences = merchants.map(m => ({
                user_id: user.id,
                merchant_id: m.id,
                town_id,
                enabled: true,
            }));

            const { error } = await sb
                .from('notification_preferences')
                .upsert(preferences, {
                    onConflict: 'user_id,merchant_id'
                });

            if (error) throw error;
        } else {
            // Disable all merchants
            const merchantIds = merchants.map(m => m.id);

            const { error } = await sb
                .from('notification_preferences')
                .delete()
                .eq('user_id', user.id)
                .in('merchant_id', merchantIds);

            if (error) throw error;
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Error toggling all notifications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
