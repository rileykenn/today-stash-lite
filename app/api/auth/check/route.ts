// app/api/auth/check/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Body = { target?: string };

function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
function isE164(x: string): boolean {
  return /^\+\d{7,15}$/.test(x);
}
function normalizePhoneAU(s: string): string {
  const t = s.replace(/\s+/g, '');
  if (t.startsWith('+')) return t;
  if (/^0\d{8,10}$/.test(t)) return '+61' + t.slice(1);
  return t;
}

type AdminUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
};

export async function POST(req: Request) {
  try {
    const { target }: Body = await req.json();
    if (!target) {
      return NextResponse.json({ error: 'target required' }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !svc) {
      return NextResponse.json({ error: 'server env missing' }, { status: 500 });
    }

    let dest = target.trim();
    const byEmail = isEmail(dest);

    if (byEmail) {
      dest = dest.toLowerCase();
    } else {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        return NextResponse.json(
          { error: 'phone must be E.164 (+61...)' },
          { status: 400 }
        );
      }
    }

    // Use Admin REST endpoint for both email and phone lookups
    const qp = byEmail
      ? `email=${encodeURIComponent(dest)}`
      : `phone=${encodeURIComponent(dest)}`;

    const res = await fetch(`${url}/auth/v1/admin/users?${qp}`, {
      method: 'GET',
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('admin search failed:', res.status, txt);
      return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
    }

    const raw = (await res.json().catch(() => [])) as unknown;
    const users: AdminUser[] = Array.isArray(raw) ? (raw as AdminUser[]) : [];

    // Filter defensively (email is stored lowercase)
    const u = users.find((x) =>
      byEmail ? x.email?.toLowerCase() === dest : x.phone === dest
    );

    const exists = Boolean(u);
    const confirmed = exists
      ? byEmail
        ? Boolean(u?.email_confirmed_at)
        : Boolean(u?.phone_confirmed_at)
      : false;

    return NextResponse.json({
      ok: true,
      method: byEmail ? 'email' : 'phone',
      value: dest,
      exists,
      confirmed,
      action: exists ? (confirmed ? 'signin' : 'verify') : 'signup',
    });
  } catch (err) {
    console.error('check route error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
