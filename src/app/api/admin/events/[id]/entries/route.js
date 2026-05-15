import { requireAdmin } from '@/lib/auth'
import { syncBookingSlots, get0buPrice, filterSlotsByShift, DEFAULT_SLOTS } from '@/lib/sync-booking-slots'

const DEFAULT_STUDIO_SLOTS = DEFAULT_SLOTS.studio
const DEFAULT_STREET_SLOTS = DEFAULT_SLOTS.street

export async function POST(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  if (body.action === 'auto_add') {
    const { event, slotTemplates } = body
    const studioFeeCheck = parseInt(event?.studio_fee) || 0
    if (studioFeeCheck < 0) return Response.json({ error: '料金に負の値は使用できません' }, { status: 400 })
    const { data: shiftData } = await admin
      .from('model_shifts')
      .select('model_id, available_slots, available_from, available_until')
      .eq('event_date', event.event_date)
    const { data: existing } = await admin.from('event_entries').select('model_id').eq('event_id', id)
    const existingIds = (existing || []).map(e => e.model_id)
    const toAdd = (shiftData || []).filter(s => !existingIds.includes(s.model_id))
    const { data: allModels } = await admin.from('models').select('id, studio_price, street_price')

    const defaultSlots = event.event_type === 'studio' ? DEFAULT_STUDIO_SLOTS : DEFAULT_STREET_SLOTS
    const templateSlots = (slotTemplates && slotTemplates.length > 0) ? slotTemplates : defaultSlots

    for (const shift of toAdd) {
      const model = allModels?.find(m => m.id === shift.model_id)
      if (!model) continue
      const { data: entry } = await admin
        .from('event_entries')
        .insert({ event_id: id, model_id: shift.model_id })
        .select('id, event_id, model_id')
        .single()
      if (!entry) continue

      const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
      const studioFee = parseInt(event.studio_fee) || 2000
      const basePrice = isStudioType
        ? (parseInt(model.studio_price || 0) + studioFee)
        : parseInt(model.street_price || 0)

      const targetSlots = filterSlotsByShift(templateSlots, shift)
      if (targetSlots.length === 0) continue

      const slotsToInsert = targetSlots.map(slot => ({
        event_entry_id: entry.id, slot_label: slot.label, slot_order: slot.order,
        start_time: new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString(),
        end_time: new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString(),
        price: (isStudioType && slot.order === 0) ? (get0buPrice(parseInt(model.studio_price || 0)) + studioFee) : basePrice,
        max_reservations: 1, is_reserved: false,
      }))
      await admin.from('booking_slots').insert(slotsToInsert)
    }
    return Response.json({ ok: true })
  }

  // 締め切り前専用: 既存モデルの枠を同期 + 未追加モデルを追加
  if (body.action === 'sync_shifts') {
    const { event, slotTemplates } = body
    const studioFeeCheckSync = parseInt(event?.studio_fee) || 0
    if (studioFeeCheckSync < 0) return Response.json({ error: '料金に負の値は使用できません' }, { status: 400 })
    const { data: shiftData } = await admin
      .from('model_shifts')
      .select('model_id, available_slots, available_from, available_until')
      .eq('event_date', event.event_date)
    const { data: existing } = await admin.from('event_entries').select('model_id').eq('event_id', id)
    const existingIds = new Set((existing || []).map(e => e.model_id))
    const { data: allModels } = await admin.from('models').select('id, studio_price, street_price')

    const defaultSlots = event.event_type === 'studio' ? DEFAULT_STUDIO_SLOTS : DEFAULT_STREET_SLOTS
    const templateSlots = (slotTemplates && slotTemplates.length > 0) ? slotTemplates : defaultSlots

    for (const shift of shiftData || []) {
      if (existingIds.has(shift.model_id)) {
        // 既存モデル: シフトに合わせて枠を同期
        await syncBookingSlots(admin, { ...shift, event_date: event.event_date })
      } else {
        // 未追加モデル: 不参加でなければ追加
        const avail = shift.available_slots?.[0]
        if (avail?.unavailable) continue
        const model = allModels?.find(m => m.id === shift.model_id)
        if (!model) continue
        const { data: entry } = await admin
          .from('event_entries')
          .insert({ event_id: id, model_id: shift.model_id })
          .select('id')
          .single()
        if (!entry) continue
        const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
        const studioFee = parseInt(event.studio_fee) || 2000
        const basePrice = isStudioType
          ? (parseInt(model.studio_price || 0) + studioFee)
          : parseInt(model.street_price || 0)
        const targetSlots = filterSlotsByShift(templateSlots, shift)
        if (targetSlots.length === 0) continue
        await admin.from('booking_slots').insert(targetSlots.map(slot => ({
          event_entry_id: entry.id, slot_label: slot.label, slot_order: slot.order,
          start_time: new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString(),
          end_time: new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString(),
          price: (isStudioType && slot.order === 0) ? (get0buPrice(parseInt(model.studio_price || 0)) + studioFee) : basePrice,
          max_reservations: 1, is_reserved: false,
        })))
      }
    }
    return Response.json({ ok: true })
  }

  if (body.action === 'add_model') {
    const { modelId, event, slotTemplates } = body
    const studioFeeCheckAdd = parseInt(event?.studio_fee) || 0
    if (studioFeeCheckAdd < 0) return Response.json({ error: '料金に負の値は使用できません' }, { status: 400 })
    const { data: entry } = await admin
      .from('event_entries')
      .insert({ event_id: id, model_id: modelId })
      .select('id, event_id, model_id')
      .single()
    if (!entry) return Response.json({ error: 'Failed' }, { status: 500 })

    const { data: model } = await admin.from('models').select('studio_price, street_price').eq('id', modelId).single()
    const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
    const studioFee = parseInt(event.studio_fee) || 2000
    const basePrice = isStudioType
      ? (parseInt(model?.studio_price || 0) + studioFee)
      : parseInt(model?.street_price || 0)

    const { data: shift } = await admin
      .from('model_shifts')
      .select('available_slots, available_from, available_until')
      .eq('model_id', modelId)
      .eq('event_date', event.event_date)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const defaultSlots = event.event_type === 'studio' ? DEFAULT_STUDIO_SLOTS : DEFAULT_STREET_SLOTS
    const templateSlots = (slotTemplates && slotTemplates.length > 0) ? slotTemplates : defaultSlots
    const targetSlots = shift ? filterSlotsByShift(templateSlots, shift) : templateSlots.filter(s => s.order !== 0)

    const slotsToInsert = targetSlots.map(slot => ({
      event_entry_id: entry.id, slot_label: slot.label, slot_order: slot.order,
      start_time: new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString(),
      end_time: new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString(),
      price: (isStudioType && slot.order === 0) ? (get0buPrice(parseInt(model?.studio_price || 0)) + studioFee) : basePrice,
      max_reservations: 1, is_reserved: false,
    }))
    const { data: slots } = await admin
      .from('booking_slots')
      .insert(slotsToInsert)
      .select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations')
    return Response.json({ entry: { ...entry, booking_slots: slots || [] } })
  }

  if (body.action === 'reset_all_slots') {
    const { data: entries } = await admin.from('event_entries').select('id').eq('event_id', id)
    if (!entries?.length) return Response.json({ ok: true })
    const entryIds = entries.map(e => e.id)
    await admin.from('booking_slots').delete().in('event_entry_id', entryIds)
    return Response.json({ ok: true })
  }

  if (body.action === 'recalculate_prices') {
    const { entryId } = body
    const { data: entry } = await admin.from('event_entries').select('model_id, event_id').eq('id', entryId).single()
    if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 })
    const [{ data: model }, { data: ev }, { data: slots }] = await Promise.all([
      admin.from('models').select('studio_price, street_price').eq('id', entry.model_id).single(),
      admin.from('events').select('event_type, studio_fee').eq('id', entry.event_id).single(),
      admin.from('booking_slots').select('id, slot_order').eq('event_entry_id', entryId),
    ])
    const isStudioType = ev?.event_type === 'studio' || ev?.event_type === 'irregular'
    const studioFee = parseInt(ev?.studio_fee) || 2000
    const basePrice = isStudioType
      ? (parseInt(model?.studio_price || 0) + studioFee)
      : parseInt(model?.street_price || 0)
    for (const slot of slots || []) {
      const price = (isStudioType && slot.slot_order === 0) ? (get0buPrice(parseInt(model?.studio_price || 0)) + studioFee) : basePrice
      await admin.from('booking_slots').update({ price }).eq('id', slot.id)
    }
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { entryId } = await req.json()
  await admin.from('event_entries').delete().eq('id', entryId)
  return Response.json({ ok: true })
}
