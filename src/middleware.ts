import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, internal paths, and public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  // 2. Allow login and authorize pages to be accessible
  if (pathname === '/login' || pathname === '/authorize') {
    return NextResponse.next();
  }

  // 3. Check for the secondary authorization cookie
  // Note: For a real production app, this should be a secure, signed token or session check.
  // Here we check for the momentum_authorized cookie set by our AuthorizePage.
  const isAuthorized = request.cookies.get('momentum_authorized')?.value === 'true';

  if (!isAuthorized) {
    // If it's an API call, return 401 Unauthorized
    if (pathname.startsWith('/api')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Secondary password required.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, redirect to the authorization page
    const url = request.nextUrl.clone();
    url.pathname = '/authorize';
    return NextResponse.redirect(url);
  }

  // 4. (Optional) Check for Supabase Session
  // If you want to strictly enforce Supabase login in middleware, 
  // you would typically use @supabase/ssr here. 
  // For now, we rely on the secondary password as the main entry gate.

  return NextResponse.next();
}

// Ensure the middleware runs on all relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
