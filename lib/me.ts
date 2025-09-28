import { sb } from '@/lib/supabaseBrowser';

export type Me = { user_id: string; role: 'admin' | 'merchant' | 'consumer' };

export async function fetchMe(): Promise<Me | null> {
  const { data, error } = await sb.from('me').select('*').single();
  if (error) return null;
  return data as Me;
}
