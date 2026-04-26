import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data, error } = await admin
    .from('contributed_photos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const formData = await req.formData()
  const files = formData.getAll('files')
  const modelIds = JSON.parse(formData.get('model_ids') || '[]')
  const snsUrl = formData.get('sns_url') || ''

  const urls = []
  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
    const path = `contributed/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const { error } = await admin.storage.from('images').upload(path, arrayBuffer, { contentType: file.type, upsert: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const { data } = admin.storage.from('images').getPublicUrl(path)
    urls.push(data.publicUrl)
  }

  const rows = urls.map(url => ({
    user_email: user.email,
    photo_url: url,
    model_ids: modelIds,
    sns_url: snsUrl,
  }))

  const { error } = await admin.from('contributed_photos').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, count: urls.length })
}
