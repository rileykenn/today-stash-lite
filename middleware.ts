import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const VERIFY_PATH = '/verify-email';
const AUTH_PATHS = new Set(['/signin', '/signup', '/verify-email']);

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Supabase SSR client (cookies from the request)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (k) => req.cookies.get(k)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If not signed in, let public routes pass. (You can tighten this if needed.)
  if (!user) return res;

  // If email not confirmed, force redirect to /verify-email (unless we’re already on an auth page).
  const confirmed = !!user.email_confirmed_at;
  const path = req.nextUrl.pathname;

  if (!confirmed && !AUTH_PATHS.has(path)) {
    const url = req.nextUrl.clone();
    url.pathname = VERIFY_PATH;
    return NextResponse.redirect(url);
  }

  return res;
}

// Apply to all routes except Next static assets/api as you prefer
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
