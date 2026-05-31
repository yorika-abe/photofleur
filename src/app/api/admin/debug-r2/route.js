import { requireAdmin } from '@/lib/auth'
import { r2 } from '@/lib/r2'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const publicUrl = process.env.R2_PUBLIC_URL || '(未設定)'
  const bucket = process.env.R2_BUCKET_NAME || '(未設定)'

  // events/ フォルダの最初の3ファイルを確認
  let files = []
  try {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: 'events/',
      MaxKeys: 3,
    }))
    files = (res.Contents || []).map(f => ({
      key: f.Key,
      url: `${publicUrl}/${f.Key}`,
    }))
  } catch (e) {
    files = [{ error: e.message }]
  }

  // 最初のファイルへの公開アクセスを確認
  let publicAccessTest = null
  if (files.length > 0 && files[0].url) {
    try {
      const testRes = await fetch(files[0].url, { method: 'HEAD' })
      publicAccessTest = { url: files[0].url, status: testRes.status, ok: testRes.ok }
    } catch (e) {
      publicAccessTest = { url: files[0].url, error: e.message }
    }
  }

  return Response.json({
    R2_PUBLIC_URL: publicUrl,
    R2_BUCKET_NAME: bucket,
    sample_files: files,
    public_access_test: publicAccessTest,
    url_format_example: `${publicUrl}/events/eventId/main-123.jpg`,
  })
}
