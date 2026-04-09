import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const VERIFY_PATH = '/auth/verify-email';

export async function middleware(req: NextRequest) {
  // ── www → non-www 301 redirect ──
  const host = req.headers.get('host') || '';
  if (host.startsWith('www.')) {
    const nonWwwUrl = new URL(req.url);
    nonWwwUrl.host = host.replace(/^www\./, '');
    return NextResponse.redirect(nonWwwUrl, 301);
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If no user, let through (auth pages handle the rest)
  if (!user) return res;

  // ✅ Consider phone-confirmed users as verified too
  const confirmed =
    Boolean(user.email_confirmed_at) ||
    Boolean((user as any).phone_confirmed_at) || // present on Supabase user
    Boolean(user.phone); // if they have a phone login, they had to verify via Twilio first

  const path = req.nextUrl.pathname;

  // If not confirmed by either channel, force redirect (but allow auth routes)
  if (!confirmed && !path.startsWith('/auth')) {
    const url = req.nextUrl.clone();
    url.pathname = VERIFY_PATH;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.html$|.*\\.xml$|.*\\.txt$|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)',
  ],
};
