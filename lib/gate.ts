/**
 * A curtain, not a lock.
 *
 * Single shared password to keep work-in-progress out of casual view. It is NOT
 * a security boundary: one password, no accounts, no rate limiting. Real auth
 * comes later and is explicitly deferred (decisions/0008) — do not grow this
 * into it.
 *
 * The cookie holds an HMAC of a fixed string keyed by the password, so it can't
 * be forged without knowing the password, and the password itself is never
 * stored client-side.
 */
export const COOKIE = 'oku_gate'
const SUBJECT = 'oku-gate-v1'

export async function tokenFor(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(SUBJECT))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time-ish compare. Overkill here, but cheap and avoids a bad habit. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
