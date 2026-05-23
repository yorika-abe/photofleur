import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const R2_BASE = () => `${process.env.R2_PUBLIC_URL}/`

export async function deleteFromR2(urls) {
  const base = R2_BASE()
  const keys = (Array.isArray(urls) ? urls : [urls])
    .filter(u => u && u.startsWith(base))
    .map(u => u.replace(base, ''))
  if (keys.length === 0) return
  await Promise.all(keys.map(key =>
    r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))
  ))
}

export async function uploadToR2(key, buffer, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
