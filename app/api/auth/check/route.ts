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

function isAdminUserArray(x: unknown): x is AdminUser[] {
  return Array.isArray(x);
}

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

    let searchUrl: string;
    if (byEmail) {
      dest = dest.toLowerCase();
      searchUrl = `${url}/auth/v1/admin/users?email=${encodeURIComponent(dest)}`;
    } else {
      dest = normalizePhoneAU(dest);
      if (!isE164(dest)) {
        return NextResponse.json(
          { error: 'phone must be E.164 (+61...)' },
          { status: 400 }
        );
      }
      searchUrl = `${url}/auth/v1/admin/users?phone=${encodeURIComponent(dest)}`;
    }

    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Admin search error:', res.status, text);
      return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
    }

    const raw: unknown = await res.json();
    const users: AdminUser[] = isAdminUserArray(raw) ? raw : [];
    const exists = users.length > 0;
    const u = exists ? users[0] : undefined;

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
