import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `newsletter/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const admin = await createSupabaseAdminClient()
  const { error } = await admin.storage.from('images').upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: true,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = admin.storage.from('images').getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}
