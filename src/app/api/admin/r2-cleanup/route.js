import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { listR2Objects, deleteFromR2, R2_BASE } from '@/lib/r2'

async function getAuthAdmin() {
  const admin = await createSupabaseAdminClient()
  return admin
}

function extractUrls(text) {
  if (!text) return []
  const matches = text.match(/https?:\/\/[^\s"'<>)]+/g) || []
  return matches
}

export async function GET() {
  try {
    const admin = await getAuthAdmin()

    // DB内の全画像URLを収集
    const usedUrls = new Set()

    const [
      { data: events },
      { data: models },
      { data: blogs },
      { data: modelPrivate },
      { data: staffPrivate },
    ] = await Promise.all([
      admin.from('events').select('main_image, thumbnail_image, gallery_images'),
      admin.from('models').select('image, portfolio_images'),
      admin.from('blog_posts').select('cover_image, content'),
      admin.from('model_private_info').select('photos'),
      admin.from('staff_private_info').select('photo'),
    ])

    for (const ev of events || []) {
      if (ev.main_image) usedUrls.add(ev.main_image)
      if (ev.thumbnail_image) usedUrls.add(ev.thumbnail_image)
      try {
        const imgs = JSON.parse(ev.gallery_images || '[]')
        imgs.forEach(u => usedUrls.add(u))
      } catch {}
    }

    for (const m of models || []) {
      if (m.image) usedUrls.add(m.image)
      try {
        const imgs = JSON.parse(m.portfolio_images || '[]')
        imgs.forEach(u => usedUrls.add(u))
      } catch {}
    }

    for (const b of blogs || []) {
      if (b.cover_image) usedUrls.add(b.cover_image)
      extractUrls(b.content).forEach(u => usedUrls.add(u))
    }

    for (const mp of modelPrivate || []) {
      try {
        const imgs = JSON.parse(mp.photos || '[]')
        imgs.forEach(u => usedUrls.add(u))
      } catch {}
    }

    for (const sp of staffPrivate || []) {
      if (sp.photo) usedUrls.add(sp.photo)
    }

    // event_productsのimageも取得
    const { data: products } = await admin.from('event_products').select('image')
    for (const p of products || []) {
      if (p.image) usedUrls.add(p.image)
    }

    // R2全オブジェクト取得
    const base = R2_BASE()
    const r2Objects = await listR2Objects()

    // 孤立ファイルを検出
    const orphans = r2Objects.filter(obj => {
      const url = `${base}${obj.key}`
      return !usedUrls.has(url)
    }).map(obj => ({
      key: obj.key,
      url: `${base}${obj.key}`,
      size: obj.size,
      lastModified: obj.lastModified,
    }))

    return Response.json({
      total: r2Objects.length,
      used: usedUrls.size,
      orphans,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { keys } = await req.json()
    if (!Array.isArray(keys) || keys.length === 0) {
      return Response.json({ error: 'keysが必要です' }, { status: 400 })
    }
    const base = R2_BASE()
    const urls = keys.map(k => `${base}${k}`)
    await deleteFromR2(urls)
    return Response.json({ ok: true, deleted: keys.length })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
