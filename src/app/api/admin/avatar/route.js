import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

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

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Delete old avatar from R2
  const { data: existing } = await admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle()
  if (existing?.value) {
    const base = `${process.env.R2_PUBLIC_URL}/`
    if (existing.value.startsWith(base)) {
      const key = existing.value.replace(base, '')
      await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))
    }
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const path = `admin-avatar/avatar-${Date.now()}.jpg`
  const arrayBuffer = await file.arrayBuffer()
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: path,
    Body: Buffer.from(arrayBuffer),
    ContentType: 'image/jpeg',
  }))

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${path}`
  await admin.from('site_settings').upsert({ key: 'admin_avatar_url', value: publicUrl }, { onConflict: 'key' })

  return Response.json({ url: publicUrl })
}
