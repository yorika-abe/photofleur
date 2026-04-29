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

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin
    .from('email_templates')
    .select('id, name, subject, updated_at')
    .like('id', 'nl-%')
    .order('updated_at', { ascending: false })

  return Response.json({ templates: data || [] })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { name, subject, rows_json, header_json, footer } = await req.json()
  if (!name?.trim()) return Response.json({ error: 'name is required' }, { status: 400 })

  const id = `nl-${Date.now()}`
  const { error } = await admin.from('email_templates').insert({
    id,
    name: name.trim(),
    subject: subject || '',
    rows_json: rows_json || [],
    header_json: header_json || {},
    footer: footer || '',
    updated_at: new Date().toISOString(),
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, id })
}
