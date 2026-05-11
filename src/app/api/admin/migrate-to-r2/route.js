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

const SUPABASE_STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

// List all files recursively in a Supabase storage folder
async function listAllFiles(admin, folder = '') {
  const { data, error } = await admin.storage.from('images').list(folder, { limit: 1000 })
  if (error || !data) return []
  const files = []
  for (const item of data) {
    if (item.metadata) {
      // it's a file
      files.push(folder ? `${folder}/${item.name}` : item.name)
    } else {
      // it's a folder
      const sub = await listAllFiles(admin, folder ? `${folder}/${item.name}` : item.name)
      files.push(...sub)
    }
  }
  return files
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const results = { copied: 0, failed: [], dbUpdated: 0 }

  // 1. List all files in Supabase storage
  const files = await listAllFiles(admin)
  console.log(`Found ${files.length} files to migrate`)

  // 2. Copy each file to R2
  for (const path of files) {
    try {
      const { data: fileData, error } = await admin.storage.from('images').download(path)
      if (error || !fileData) { results.failed.push({ path, reason: error?.message || 'download failed' }); continue }
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const ext = path.split('.').pop()?.toLowerCase()
      const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'application/octet-stream'
      await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      }))
      results.copied++
    } catch (e) {
      results.failed.push({ path, reason: e.message })
    }
  }

  // 3. Update DB: replace Supabase URLs with R2 URLs in all relevant tables/columns
  const updates = [
    { table: 'events', columns: ['main_image', 'thumbnail_image'] },
    { table: 'events', columns: ['gallery_images'], isJson: true },
    { table: 'models', columns: ['image'] },
    { table: 'goods', columns: ['image'] },
    { table: 'blog_posts', columns: ['cover_image'] },
    { table: 'site_settings', columns: ['value'], isJson: true },
    { table: 'event_products', columns: ['image'] },
    { table: 'private_products', columns: ['image'] },
  ]

  for (const { table, columns, isJson } of updates) {
    for (const col of columns) {
      try {
        if (isJson) {
          // For JSON array columns like gallery_images (stored as text)
          const { data: rows } = await admin.from(table).select(`id, ${col}`).not(col, 'is', null)
          for (const row of rows || []) {
            if (!row[col]) continue
            const oldVal = typeof row[col] === 'string' ? row[col] : JSON.stringify(row[col])
            if (!oldVal.includes(SUPABASE_STORAGE_PREFIX)) continue
            const newVal = oldVal.replaceAll(SUPABASE_STORAGE_PREFIX, `${R2_PUBLIC_URL}/`)
            await admin.from(table).update({ [col]: newVal }).eq('id', row.id)
            results.dbUpdated++
          }
        } else {
          const { data: rows } = await admin.from(table).select(`id, ${col}`).like(col, `${SUPABASE_STORAGE_PREFIX}%`)
          for (const row of rows || []) {
            if (!row[col]) continue
            const newUrl = row[col].replace(SUPABASE_STORAGE_PREFIX, `${R2_PUBLIC_URL}/`)
            await admin.from(table).update({ [col]: newUrl }).eq('id', row.id)
            results.dbUpdated++
          }
        }
      } catch (e) {
        // column might not exist in this table, skip
      }
    }
  }

  return Response.json({ ok: true, ...results })
}
