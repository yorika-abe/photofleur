import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ profile: null })

  const admin = await createSupabaseAdminClient()
  const [{ data: rawProfile }, { data: userProfile }] = await Promise.all([
    admin.from('customer_profiles').select('*').eq('user_id', user.id).single(),
    admin.from('user_profiles').select('line_user_id').eq('id', user.id).single(),
  ])

  let profile = rawProfile || null

  // sns_url / nickname / kana が未設定なら過去の予約からフォールバック
  const isLineUser = user.email?.endsWith('@photofleur-line.app')
  const contactEmail = profile?.email || (isLineUser ? '' : user.email)
  const needsFallback = !profile?.sns_url || !profile?.nickname || !profile?.last_name_kana
  if (needsFallback && contactEmail) {
    const [{ data: recentBooking }, { data: recentEpb }] = await Promise.all([
      admin.from('bookings')
        .select('sns_url, nickname, last_name_kana, first_name_kana')
        .eq('email', contactEmail)
        .not('sns_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from('event_product_bookings')
        .select('sns_url, nickname')
        .eq('customer_email', contactEmail)
        .not('sns_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    const fallback = recentBooking || recentEpb || null
    if (fallback) {
      profile = {
        ...(profile || {}),
        sns_url: profile?.sns_url || fallback.sns_url || null,
        nickname: profile?.nickname || fallback.nickname || null,
        last_name_kana: profile?.last_name_kana || recentBooking?.last_name_kana || null,
        first_name_kana: profile?.first_name_kana || recentBooking?.first_name_kana || null,
      }
    }
  }

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
