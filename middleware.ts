import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE, safeEqual, tokenFor } from '@/lib/gate'

/**
 * Everything except the landing page sits behind the shared password.
 * The landing page stays public — it's the placeholder.
 */
export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  // No password configured (local dev, or not yet set) ⇒ open. Fail open is
  // right here: this limits visibility, it does not protect anything.
  if (!password) return NextResponse.next()

  const expected = await tokenFor(password)
  const got = req.cookies.get(COOKIE)?.value
  if (got && safeEqual(got, expected)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/unlock'
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`
  return NextResponse.redirect(url)
}

export const config = {
  // Public: the landing page, the unlock flow, story media, and static files.
  // Media stays open — it is already public on the blog, and gating image
  // requests buys nothing while costing a cookie round-trip on every asset.
  matcher: ['/((?!$|unlock|api/unlock|_next|images|videos|favicon|.*\\.).*)'],
}
