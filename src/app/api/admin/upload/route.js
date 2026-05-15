import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  const ext = file.name.split('.').pop().toLowerCase()
  const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf']
  if (!allowedExts.includes(ext)) return Response.json({ error: 'サポートされていないファイル形式です' }, { status: 400 })
  const path = formData.get('path') || `blog/admin/${Date.now()}-${file.name}`

  const arrayBuffer = await file.arrayBuffer()
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: path,
    Body: Buffer.from(arrayBuffer),
    ContentType: file.type,
  }))

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${path}`
  return Response.json({ url: publicUrl })
}
