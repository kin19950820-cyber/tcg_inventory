import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/inventory',
  '/transactions',
  '/pricing-review',
  '/messages',
  '/notifications',
  '/profile',
  '/products',
]

// Routes only accessible when NOT logged in
const AUTH_ONLY_ROUTES = ['/login', '/register']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth?.user

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthOnly = AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p))

  if (!isLoggedIn && isProtected) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && isAuthOnly) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handled separately with auth())
     * - _next/static / _next/image (Next.js internals)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
