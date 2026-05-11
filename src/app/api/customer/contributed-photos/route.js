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

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data, error } = await admin
    .from('contributed_photos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Build email → name map via auth users + user_profiles
  const emails = [...new Set((data || []).map(p => p.user_email).filter(Boolean))]
  let nameMap = {}
  if (emails.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailToId = Object.fromEntries((users || []).map(u => [u.email, u.id]))
    const ids = emails.map(e => emailToId[e]).filter(Boolean)
    if (ids.length > 0) {
      const { data: profiles } = await admin.from('customer_profiles').select('id, last_name, first_name').in('id', ids)
      for (const p of profiles || []) {
        const user = (users || []).find(u => u.id === p.id)
        if (user) nameMap[user.email] = [p.last_name, p.first_name].filter(Boolean).join(' ')
      }
    }
  }

  const enriched = (data || []).map(p => ({ ...p, user_name: nameMap[p.user_email] || p.user_email }))
  return Response.json(enriched)
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
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    }))
    urls.push(`${process.env.R2_PUBLIC_URL}/${path}`)
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
