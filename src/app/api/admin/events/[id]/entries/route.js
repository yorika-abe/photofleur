import { createSupabaseAdminClient } from '@/lib/supabase-server'

const DEFAULT_STUDIO_SLOTS = [
  { label: '0部 09:00〜09:45', start: '09:00', end: '09:45', order: 0 },
  { label: '1部 10:00〜11:00', start: '10:00', end: '11:00', order: 1 },
  { label: '2部 11:15〜12:15', start: '11:15', end: '12:15', order: 2 },
  { label: '3部 13:00〜14:00', start: '13:00', end: '14:00', order: 3 },
  { label: '4部 14:15〜15:15', start: '14:15', end: '15:15', order: 4 },
  { label: '5部 15:30〜16:30', start: '15:30', end: '16:30', order: 5 },
  { label: '6部 16:45〜17:45', start: '16:45', end: '17:45', order: 6 },
]
const DEFAULT_STREET_SLOTS = [
  { label: '1部 9:30〜11:00', start: '09:30', end: '11:00', order: 1 },
  { label: '2部 11:15〜12:45', start: '11:15', end: '12:45', order: 2 },
  { label: '3部 14:15〜15:45', start: '14:15', end: '15:45', order: 3 },
  { label: '4部 16:00〜17:30', start: '16:00', end: '17:30', order: 4 },
  { label: '5部 17:45〜19:15', start: '17:45', end: '19:15', order: 5 },
  { label: '6部 19:30〜20:45', start: '19:30', end: '20:45', order: 6 },
  { label: '7部 21:00〜22:30', start: '21:00', end: '22:30', order: 7 },
]

function get0buPrice(studioPrice) {
  if (studioPrice >= 12000) return 7500
  if (studioPrice >= 9900) return 5900
  return 4900
}

// モデルのシフト提出内容に基づきスロットをフィルタ
function filterSlotsByShift(slots, shift) {
  const avail = shift?.available_slots?.[0]
  if (avail?.unavailable) return [] // 不参加
  const from = shift?.available_from
  const until = shift?.available_until
  // 終日または未設定
  if (!from || !until || (from === '00:00' && until === '00:00')) return slots
  // 時間範囲: スロットの開始と終了が提出時間内のもののみ
  return slots.filter(s => s.start >= from && s.end <= until)
}

export async function POST(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const body = await req.json()

  if (body.action === 'auto_add') {
    const { event, slotTemplates } = body
    const { data: shiftData } = await supabase
      .from('model_shifts')
      .select('model_id, available_slots, available_from, available_until')
      .eq('event_date', event.event_date)
    const { data: existing } = await supabase.from('event_entries').select('model_id').eq('event_id', id)
    const existingIds = (existing || []).map(e => e.model_id)
    const toAdd = (shiftData || []).filter(s => !existingIds.includes(s.model_id))
    const { data: allModels } = await supabase.from('models').select('id, studio_price, street_price')

    const defaultSlots = event.event_type === 'studio' ? DEFAULT_STUDIO_SLOTS : DEFAULT_STREET_SLOTS
    const templateSlots = (slotTemplates && slotTemplates.length > 0) ? slotTemplates : defaultSlots

    for (const shift of toAdd) {
      const model = allModels?.find(m => m.id === shift.model_id)
      if (!model) continue
      const { data: entry } = await supabase
        .from('event_entries')
        .insert({ event_id: id, model_id: shift.model_id })
        .select('id, event_id, model_id')
        .single()
      if (!entry) continue

      const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
      const basePrice = isStudioType
        ? (parseInt(model.studio_price || 0) + parseInt(event.studio_fee || 0))
        : parseInt(model.street_price || 0)

      const targetSlots = filterSlotsByShift(templateSlots, shift)
      if (targetSlots.length === 0) continue

      const slotsToInsert = targetSlots.map(slot => ({
        event_entry_id: entry.id, slot_label: slot.label, slot_order: slot.order,
        start_time: new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString(),
        end_time: new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString(),
        price: (isStudioType && slot.order === 0) ? get0buPrice(parseInt(model.studio_price || 0)) : basePrice,
        max_reservations: 1, is_reserved: false,
      }))
      await supabase.from('booking_slots').insert(slotsToInsert)
    }
    return Response.json({ ok: true })
  }

  if (body.action === 'add_model') {
    const { modelId, event, slotTemplates } = body
    const { data: entry } = await supabase
      .from('event_entries')
      .insert({ event_id: id, model_id: modelId })
      .select('id, event_id, model_id')
      .single()
    if (!entry) return Response.json({ error: 'Failed' }, { status: 500 })

    const { data: model } = await supabase.from('models').select('studio_price, street_price').eq('id', modelId).single()
    const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
    const basePrice = isStudioType
      ? (parseInt(model?.studio_price || 0) + parseInt(event.studio_fee || 0))
      : parseInt(model?.street_price || 0)

    const { data: shift } = await supabase
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
      price: (isStudioType && slot.order === 0) ? get0buPrice(parseInt(model?.studio_price || 0)) : basePrice,
      max_reservations: 1, is_reserved: false,
    }))
    const { data: slots } = await supabase
      .from('booking_slots')
      .insert(slotsToInsert)
      .select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations')
    return Response.json({ entry: { ...entry, booking_slots: slots || [] } })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req) {
  const { entryId } = await req.json()
  const supabase = await createSupabaseAdminClient()
  await supabase.from('event_entries').delete().eq('id', entryId)
  return Response.json({ ok: true })
}
