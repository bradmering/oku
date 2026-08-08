import { NextResponse } from 'next/server'
import { COOKIE, tokenFor } from '@/lib/gate'

export async function POST(req: Request) {
  const form = await req.formData()
  const submitted = String(form.get('password') ?? '')
  const next = String(form.get('next') || '/stories')
  const password = process.env.SITE_PASSWORD

  if (!password || submitted !== password) {
    return NextResponse.redirect(new URL(`/unlock?bad=1&next=${encodeURIComponent(next)}`, req.url), 303)
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303)
  res.cookies.set(COOKIE, await tokenFor(password), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
