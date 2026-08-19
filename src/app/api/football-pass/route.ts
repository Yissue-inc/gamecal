// football-pass — hands a signed pass to football.gamerclock.com.
//
// The football site is a separate Cloudflare Pages deployment, so it cannot read
// this app's Supabase session: those cookies are host-only on gamerclock.com and
// a subdomain never sees them. The alternative — widening the cookie to
// .gamerclock.com — would change how every existing session on this live app is
// stored, to solve a problem that belongs to one subdomain. Not worth it.
//
// So the session stays here and only a verdict travels. The football site sends a
// visitor to this route; if they are signed in, it signs a short-lived token with
// a secret both sides hold and sends them back. The football site verifies the
// signature and issues its own cookie. Nothing about auth here changes, and the
// football site never sees a Supabase token.
//
// Env: FOOTBALL_PASS_SECRET — the same long random string set on the Pages project.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = ['https://football.gamerclock.com']
const TTL_MS = 1000 * 60 * 60 * 24 * 30

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(req: NextRequest) {
  const secret = process.env.FOOTBALL_PASS_SECRET
  const back = req.nextUrl.searchParams.get('next') || ALLOWED[0]

  // Only ever redirect to the site this route exists for. An open redirect on a
  // signed-in route is how a phishing page borrows someone's session.
  const target = ALLOWED.find((a) => back.startsWith(a)) ? back : ALLOWED[0]

  if (!secret) {
    // Unconfigured: send them back without a pass rather than failing loudly.
    // The football site falls open in the same situation, so the pair stays usable.
    return NextResponse.redirect(target)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const signin = new URL('/auth/login', req.nextUrl.origin)
    signin.searchParams.set('next', `/api/football-pass?next=${encodeURIComponent(target)}`)
    return NextResponse.redirect(signin)
  }

  const payload = `${user.id}|${Date.now() + TTL_MS}`
  const t = `${payload}.${await hmac(secret, payload)}`
  const url = new URL(target)
  url.searchParams.set('pass', t)
  return NextResponse.redirect(url)
}
