import { requireAdmin } from '@/lib/auth'

// お気に入り写真一覧取得
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('contributed_photos')
    .select('*')
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // user_email → user_name マップ
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

  return Response.json((data || []).map(p => ({ ...p, user_name: nameMap[p.user_email] || p.user_email })))
}

// お気に入りトグル
export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_featured } = await req.json()

  if (is_featured) {
    // 現在の最大order取得して末尾に追加
    const { data: max } = await admin
      .from('contributed_photos')
      .select('featured_order')
      .eq('is_featured', true)
      .order('featured_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (max?.featured_order ?? -1) + 1
    await admin.from('contributed_photos').update({
      is_featured: true,
      featured_at: new Date().toISOString(),
      featured_order: nextOrder,
    }).eq('id', id)
  } else {
    await admin.from('contributed_photos').update({
      is_featured: false,
      featured_at: null,
      featured_order: 0,
    }).eq('id', id)
  }

  return Response.json({ ok: true })
}

// 並び順更新（orderedIds: お気に入りのid配列を表示順で渡す）
export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderedIds } = await req.json()
  if (!Array.isArray(orderedIds)) return Response.json({ error: 'invalid' }, { status: 400 })

  await Promise.all(orderedIds.map((id, idx) =>
    admin.from('contributed_photos').update({ featured_order: idx }).eq('id', id)
  ))

  return Response.json({ ok: true })
}
