import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ eligible: false, notLoggedIn: true })

  const { searchParams } = new URL(req.url)
  const modelIds = searchParams.get('model_ids')?.split(',').filter(Boolean) || []

  const admin = await createSupabaseAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // LINEアカウント連携確認
  const { data: profile } = await admin
    .from('user_profiles')
    .select('line_user_id')
    .eq('id', user.id)
    .maybeSingle()
  const hasLine = !!profile?.line_user_id

  // ① 通常イベント予約（bookings → booking_slots → event_entries）
  const { data: allBookings } = await admin
    .from('bookings')
    .select('id, slot_id, cancelled_at')
    .eq('email', user.email)
    .is('cancelled_at', null)

  const slotIds = (allBookings || []).map(b => b.slot_id).filter(Boolean)
  const { data: slots } = slotIds.length
    ? await admin.from('booking_slots').select('id, event_entry_id, start_time').in('id', slotIds)
    : { data: [] }

  const pastSlots = (slots || []).filter(s => s.start_time && s.start_time.split('T')[0] < today)
  const recentSlots = pastSlots.filter(s => s.start_time.split('T')[0] >= threeMonthsAgo)
  const pastSlotIds = new Set(pastSlots.map(s => s.id))
  const recentSlotIds = new Set(recentSlots.map(s => s.id))

  const pastBookings = (allBookings || []).filter(b => pastSlotIds.has(b.slot_id))
  const recentBookings = (allBookings || []).filter(b => recentSlotIds.has(b.slot_id))

  // ② 非公開商品予約（private_bookings → private_products）
  const { data: privateBookings } = await admin
    .from('private_bookings')
    .select('id, event_date_input, cancelled_at, is_cancelled, private_products(model_id, model_ids)')
    .eq('email', user.email)
    .is('cancelled_at', null)
    .eq('is_cancelled', false)

  const pastPrivate = (privateBookings || []).filter(b => {
    const d = b.event_date_input
    return d && d < today
  })
  const recentPrivate = pastPrivate.filter(b => b.event_date_input >= threeMonthsAgo)

  // 合計カウント
  const totalCount = pastBookings.length + pastPrivate.length
  const recentCount = recentBookings.length + recentPrivate.length

  // モデルごとの撮影回数（通常予約 + 非公開予約）
  let modelCounts = []
  if (modelIds.length > 0) {
    // 通常予約のモデル対応
    const entryIds = pastSlots.map(s => s.event_entry_id).filter(Boolean)
    const { data: entries } = entryIds.length
      ? await admin.from('event_entries').select('id, model_id').in('id', entryIds)
      : { data: [] }

    const slotToModel = {}
    for (const slot of pastSlots) {
      const entry = (entries || []).find(e => e.id === slot.event_entry_id)
      if (entry) slotToModel[slot.id] = entry.model_id
    }

    modelCounts = modelIds.map(modelId => {
      // 通常予約での撮影回数
      const regularCount = pastBookings.filter(b => slotToModel[b.slot_id] === modelId).length

      // 非公開予約での撮影回数
      const privateCount = pastPrivate.filter(b => {
        const prod = b.private_products
        if (!prod) return false
        // model_idsはJSON文字列の場合があるのでパース
        const ids = Array.isArray(prod.model_ids)
          ? prod.model_ids
          : (typeof prod.model_ids === 'string' ? JSON.parse(prod.model_ids || '[]') : [])
        return prod.model_id === modelId || ids.includes(modelId)
      }).length

      return { model_id: modelId, count: regularCount + privateCount }
    })
  }

  const meetsTotal = totalCount >= 10
  const meetsRecent = recentCount >= 2
  const meetsModels = modelIds.length === 0 || modelCounts.every(m => m.count >= 3)
  const eligible = meetsTotal && meetsRecent && meetsModels && hasLine

  return Response.json({
    eligible,
    hasLine,
    totalCount,
    recentCount,
    modelCounts,
    meetsTotal,
    meetsRecent,
    meetsModels,
  })
}
