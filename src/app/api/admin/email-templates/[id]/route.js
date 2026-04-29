import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin') ? admin : null
}

export async function GET(req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin
    .from('email_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!data) return Response.json({ template: null })
  return Response.json({ template: data })
}

export async function PUT(req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, subject, rows_json, header_json, footer } = body

  const { error } = await admin
    .from('email_templates')
    .upsert({
      id: params.id,
      name: name || params.id,
      subject: subject || '',
      rows_json: rows_json || [],
      header_json: header_json || {},
      footer: footer || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
