import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const VERIFY_PATH = '/auth/verify-email';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => req.cookies.get(key)?.value,
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If no user, let through (handled by your (auth) routes anyway)
  if (!user) return res;

  // If not confirmed, force redirect (but allow auth routes)
  const confirmed = !!user.email_confirmed_at;
  const path = req.nextUrl.pathname;

  if (!confirmed && !path.startsWith('/auth')) {
    const url = req.nextUrl.clone();
    url.pathname = VERIFY_PATH;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
