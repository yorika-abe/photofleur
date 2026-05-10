import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['model', 'admin'].includes(r))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  const path = formData.get('path') || `blog/${user.id}/${Date.now()}-${file.name}`

  const arrayBuffer = await file.arrayBuffer()
  const { error } = await admin.storage.from('images').upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: true,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = admin.storage.from('images').getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}

export async function DELETE(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { path } = await req.json()
  if (!path) return Response.json({ error: 'path required' }, { status: 400 })

  await admin.storage.from('images').remove([path])
  return Response.json({ ok: true })
}
