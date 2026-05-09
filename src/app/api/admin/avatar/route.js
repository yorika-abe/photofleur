import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data } = await admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle()
  return Response.json({ url: data?.value || null })
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()

  // Only owner can change the shared avatar
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Delete old avatar
  const { data: existing } = await admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle()
  if (existing?.value) {
    const match = existing.value.match(/\/storage\/v1\/object\/public\/images\/(.+)/)
    if (match) await admin.storage.from('images').remove([match[1]])
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const path = `admin-avatar/avatar-${Date.now()}.jpg`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage.from('images').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('images').getPublicUrl(path)
  await admin.from('site_settings').upsert({ key: 'admin_avatar_url', value: publicUrl }, { onConflict: 'key' })

  return Response.json({ url: publicUrl })
}
