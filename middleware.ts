import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()
  
  // Allow access to login page, API routes, and static assets
  if (
    pathname === '/login' ||
    pathname === '/logout' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return response
  }

  // Create supabase client with cookie handling
  const supabase = createMiddlewareClient(request, response)
  
  // Check if user has a valid session
  const { data: { session } } = await supabase.auth.getSession()

  // If no session and trying to access protected routes, redirect to login
  if (!session && (pathname.startsWith('/c') || pathname.startsWith('/a'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If has session and on login page, redirect to home
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Allow access to home page regardless of auth status
  // Role-specific redirects will be handled in layout components
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
