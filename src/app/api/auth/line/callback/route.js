import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  const cookieStore = await cookies()
  const savedState = cookieStore.get('line_oauth_state')?.value
  const mode = cookieStore.get('line_oauth_mode')?.value || 'login'
  cookieStore.delete('line_oauth_state')
  cookieStore.delete('line_oauth_next')
  cookieStore.delete('line_oauth_mode')

  if (error || !code) {
    return Response.redirect(`${siteUrl}/login?error=line_cancelled`)
  }
  if (state !== savedState) {
    return Response.redirect(`${siteUrl}/login?error=line_error`)
  }

  const redirectUri = `${siteUrl}/api/auth/line/callback`

  // Exchange code for access token
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return Response.redirect(`${siteUrl}/login?error=line_token_failed`)
  }

  // Get LINE profile
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const lineProfile = await profileRes.json()
  const lineUserId = lineProfile.userId
  if (!lineUserId) {
    return Response.redirect(`${siteUrl}/login?error=line_profile_failed`)
  }

  // Get email from ID token
  let lineEmail = null
  if (tokenData.id_token) {
    try {
      const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id_token: tokenData.id_token,
          client_id: process.env.LINE_LOGIN_CHANNEL_ID,
        }),
      })
      const idData = await verifyRes.json()
      lineEmail = idData.email || null
    } catch {}
  }

  const admin = await createSupabaseAdminClient()

  // mode=link: link LINE to the currently logged-in user
  if (mode === 'link') {
    const server = await createSupabaseServerClient()
    const { data: { user: currentUser } } = await server.auth.getUser()
    if (!currentUser) {
      return Response.redirect(`${siteUrl}/login?error=line_error`)
    }
    await admin.from('user_profiles').update({ line_user_id: lineUserId }).eq('id', currentUser.id)
    return Response.redirect(`${siteUrl}/my?line_linked=1`)
  }

  // Find existing user by line_user_id
  const { data: existingProfile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  let userId

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    // Use LINE email if available, otherwise use internal identifier
    const authEmail = lineEmail || `line_${lineUserId}@photofleur-line.app`

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: { display_name: lineProfile.displayName, line_user_id: lineUserId },
    })

    if (createError) {
      // Email already registered (user has existing email account) — link LINE to it
      if (createError.message?.includes('already been registered') && lineEmail) {
        const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = existingUsers?.users?.find(u => u.email === lineEmail)
        if (existingUser) {
          userId = existingUser.id
          await admin.from('user_profiles')
            .update({ line_user_id: lineUserId })
            .eq('id', userId)
        } else {
          return Response.redirect(`${siteUrl}/login?error=line_create_failed`)
        }
      } else {
        return Response.redirect(`${siteUrl}/login?error=line_create_failed`)
      }
    } else {
      userId = newUser.user.id
      await admin.from('user_profiles').upsert({
        id: userId,
        roles: [],
        line_user_id: lineUserId,
      }, { onConflict: 'id' })
    }
  }

  // Generate magic link to create a session
  const userRes = await admin.auth.admin.getUserById(userId)
  const authEmail = userRes.data.user?.email
  if (!authEmail) {
    return Response.redirect(`${siteUrl}/login?error=line_signin_failed`)
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
    options: { redirectTo: `${siteUrl}/auth/line-complete` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return Response.redirect(`${siteUrl}/login?error=line_signin_failed`)
  }

  return Response.redirect(linkData.properties.action_link)
}
