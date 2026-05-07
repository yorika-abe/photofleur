import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ profile: null })

  const admin = await createSupabaseAdminClient()
  const [{ data: profile }, { data: userProfile }] = await Promise.all([
    admin.from('customer_profiles').select('*').eq('user_id', user.id).single(),
    admin.from('user_profiles').select('line_user_id').eq('id', user.id).single(),
  ])

  // LINE users have a fake internal email — use stored contact email if available
  const isLineUser = user.email?.endsWith('@photofleur-line.app')
  const contactEmail = profile?.email || (isLineUser ? '' : user.email)

  return Response.json({ profile: profile || null, email: contactEmail, hasLine: !!userProfile?.line_user_id })
}

export async function PUT(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = await createSupabaseAdminClient()
  const { error } = await admin.from('customer_profiles').upsert({
    user_id: user.id,
    last_name: body.last_name || null,
    first_name: body.first_name || null,
    last_name_kana: body.last_name_kana || null,
    first_name_kana: body.first_name_kana || null,
    phone: body.phone || null,
    sns_url: body.sns_url || null,
    nickname: body.nickname || null,
    ...(body.email ? { email: body.email } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
