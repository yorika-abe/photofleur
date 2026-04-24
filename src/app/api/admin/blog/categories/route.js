import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin(admin) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return false
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin')
}

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data, error } = await admin.from('blog_categories').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await admin.from('blog_categories').insert({ name: body.name, slug: body.slug, display_order: body.display_order ?? 0 }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, ...updates } = body
  const { error } = await admin.from('blog_categories').update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  await admin.from('blog_categories').delete().eq('id', id)
  return Response.json({ ok: true })
}
