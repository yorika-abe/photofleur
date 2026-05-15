import { requireAdmin } from '@/lib/auth'
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
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  if (!allowedExts.includes(ext)) return Response.json({ error: 'サポートされていないファイル形式です' }, { status: 400 })
  const path = `newsletter/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: path,
    Body: Buffer.from(arrayBuffer),
    ContentType: file.type,
  }))

  return Response.json({ url: `${process.env.R2_PUBLIC_URL}/${path}` })
}
