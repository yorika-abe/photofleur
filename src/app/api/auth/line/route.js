import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const next = searchParams.get('next') || '/'

  const state = randomBytes(16).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set('line_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })
  cookieStore.set('line_oauth_next', next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectUri = `${siteUrl}/api/auth/line/callback`

  const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', process.env.LINE_LOGIN_CHANNEL_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'profile openid email')

  return Response.redirect(url.toString())
}
