import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ profile: null })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin
    .from('customer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return Response.json({ profile: profile || null, email: user.email })
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
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
