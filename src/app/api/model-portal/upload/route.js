import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { uploadToR2, deleteFromR2, R2_BASE } from '@/lib/r2'

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
  const url = await uploadToR2(path, Buffer.from(arrayBuffer), file.type)
  return Response.json({ url })
}

export async function DELETE(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url || !url.startsWith(R2_BASE())) return Response.json({ ok: true })
  await deleteFromR2([url])
  return Response.json({ ok: true })
}
