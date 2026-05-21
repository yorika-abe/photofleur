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

    const base = R2_BASE()

    function addIfR2(url) {
      if (url && typeof url === 'string' && url.startsWith(base)) usedUrls.add(url)
    }

    function extractAndAddUrls(text) {
      extractUrls(text).filter(u => u.startsWith(base)).forEach(u => usedUrls.add(u))
    }

    const [
      { data: events },
      { data: models },
      { data: blogs },
      { data: modelPrivate },
      { data: staffPrivate },
      { data: siteSettings },
      { data: blogAuthors },
    ] = await Promise.all([
      admin.from('events').select('main_image, thumbnail_image, gallery_images'),
      admin.from('models').select('image, portfolio_images, pending_data'),
      admin.from('blog_posts').select('cover_image, content'),
      admin.from('model_private_info').select('photos'),
      admin.from('staff_private_info').select('photo'),
      admin.from('site_settings').select('value'),
      admin.from('blog_authors').select('avatar'),
    ])

    for (const ev of events || []) {
      addIfR2(ev.main_image)
      addIfR2(ev.thumbnail_image)
      try { JSON.parse(ev.gallery_images || '[]').forEach(addIfR2) } catch {}
    }

    for (const m of models || []) {
      addIfR2(m.image)
      try { JSON.parse(m.portfolio_images || '[]').forEach(addIfR2) } catch {}
      // 申請中の pending_data 内の画像も対象
      try {
        const pd = typeof m.pending_data === 'object' ? m.pending_data : JSON.parse(m.pending_data || 'null')
        if (pd) {
          addIfR2(pd.image)
          ;(pd.portfolio_images || []).forEach(addIfR2)
        }
      } catch {}
    }

    for (const b of blogs || []) {
      addIfR2(b.cover_image)
      extractAndAddUrls(b.content)
    }

    for (const mp of modelPrivate || []) {
      try { JSON.parse(mp.photos || '[]').forEach(addIfR2) } catch {}
    }

    for (const sp of staffPrivate || []) {
      addIfR2(sp.photo)
    }

    // site_settings: すべての値からR2 URLを抽出
    for (const row of siteSettings || []) {
      const val = row.value
      if (!val) continue
      if (val.startsWith(base)) {
        usedUrls.add(val)
      } else if (val.startsWith('[') || val.startsWith('{')) {
        try {
          const parsed = JSON.parse(val)
          const arr = Array.isArray(parsed) ? parsed : Object.values(parsed)
          arr.forEach(v => { if (typeof v === 'string') addIfR2(v) })
        } catch {}
      } else {
        extractAndAddUrls(val)
      }
    }

    for (const a of blogAuthors || []) {
      addIfR2(a.avatar)
    }

    // event_productsのimageも取得
    const { data: products } = await admin.from('event_products').select('image')
    for (const p of products || []) {
      addIfR2(p.image)
    }

    // カメラマンのご提供写真
    const { data: contribPhotos } = await admin.from('contributed_photos').select('photo_url')
    for (const cp of contribPhotos || []) {
      addIfR2(cp.photo_url)
    }

    // R2全オブジェクト取得
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
