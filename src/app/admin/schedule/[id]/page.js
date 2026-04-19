'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const STUDIO_SLOTS = [
  { label: '0部 09:00〜09:45', start: '09:00', end: '09:45', order: 0 },
  { label: '1部 10:00〜11:00', start: '10:00', end: '11:00', order: 1 },
  { label: '2部 11:15〜12:15', start: '11:15', end: '12:15', order: 2 },
  { label: '3部 13:00〜14:00', start: '13:00', end: '14:00', order: 3 },
  { label: '4部 14:15〜15:15', start: '14:15', end: '15:15', order: 4 },
  { label: '5部 15:30〜16:30', start: '15:30', end: '16:30', order: 5 },
  { label: '6部 16:45〜17:45', start: '16:45', end: '17:45', order: 6 },
]
const STREET_SLOTS = [
  { label: '1部 9:30〜11:00', start: '09:30', end: '11:00', order: 1 },
  { label: '2部 11:15〜12:45', start: '11:15', end: '12:45', order: 2 },
  { label: '3部 14:15〜15:45', start: '14:15', end: '15:45', order: 3 },
  { label: '4部 16:00〜17:30', start: '16:00', end: '17:30', order: 4 },
  { label: '5部 17:45〜19:15', start: '17:45', end: '19:15', order: 5 },
  { label: '6部 19:30〜20:45', start: '19:30', end: '20:45', order: 6 },
  { label: '7部 21:00〜22:30', start: '21:00', end: '22:30', order: 7 },
]

export default function EventEditPage() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [models, setModels] = useState([])
  const [entries, setEntries] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [autoAdding, setAutoAdding] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: ev }, { data: mods }, { data: ents }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('models').select('id, name, image, studio_price, street_price').order('name'),
      supabase.from('event_entries').select('id, event_id, model_id').eq('event_id', id),
    ])

    const entriesData = ents || []
    const entriesWithSlots = await Promise.all(entriesData.map(async (entry) => {
      const { data: slots } = await supabase.from('booking_slots').select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations').eq('event_entry_id', entry.id).order('slot_order')
      return { ...entry, booking_slots: slots || [] }
    }))

    // シフト提出済みモデルを取得
    const { data: shiftData } = ev?.event_date
      ? await supabase.from('model_shifts').select('model_id, available_slots, status').eq('event_date', ev.event_date)
      : { data: [] }

    setEvent(ev || {})
    setModels(mods || [])
    setEntries(entriesWithSlots)
    setShifts(shiftData || [])
    setLoading(false)
  }

  async function autoAddShiftedModels() {
    if (!event.event_date) return
    setAutoAdding(true)
    const { data: shiftData } = await supabase.from('model_shifts').select('model_id, available_slots').eq('event_date', event.event_date)
    const existingModelIds = entries.map(e => e.model_id)
    const toAdd = (shiftData || []).filter(s => !existingModelIds.includes(s.model_id))

    for (const shift of toAdd) {
      const model = models.find(m => m.id === shift.model_id)
      if (!model) continue
      const { data: entry } = await supabase.from('event_entries').insert({ event_id: id, model_id: shift.model_id }).select('id, event_id, model_id').single()
      if (!entry) continue

      const basePrice = event.event_type === 'studio'
        ? (parseInt(model.studio_price || 0) + parseInt(event.studio_fee || 0))
        : parseInt(model.street_price || 0)

      const allSlots = event.event_type === 'studio' ? STUDIO_SLOTS : STREET_SLOTS
      const submittedStarts = (shift.available_slots || []).map(s => s.start)
      const targetSlots = submittedStarts.length > 0
        ? allSlots.filter(s => submittedStarts.includes(s.start))
        : allSlots.filter(s => s.order !== 0)

      const slotsToInsert = targetSlots.map(slot => ({
        event_entry_id: entry.id,
        slot_label: slot.label,
        slot_order: slot.order,
        start_time: new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString(),
        end_time: new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString(),
        price: basePrice,
        max_reservations: 1,
        is_reserved: false,
      }))
      const { data: slots } = await supabase.from('booking_slots').insert(slotsToInsert).select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations')
      setEntries(prev => [...prev, { ...entry, booking_slots: slots || [] }])
    }
    setAutoAdding(false)
    await load()
  }

  function updateField(key, value) {
    setEvent(prev => {
      const updated = { ...prev, [key]: value }
      if (key === 'event_date' && value && !prev.booking_open_at) {
        const d = new Date(value + 'T00:00:00')
        d.setDate(d.getDate() - 14)
        const day = d.getDay()
        const diff = day === 0 ? -6 : 1 - day
        d.setDate(d.getDate() + diff)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day2 = String(d.getDate()).padStart(2, '0')
        updated.booking_open_at = `${y}-${m}-${day2}T21:00`
      }
      return updated
    })
  }

  async function saveEvent() {
    setSaving(true)
    const { error } = await supabase.from('events').update({
      title: event.title,
      subtitle: event.subtitle,
      event_date: event.event_date,
      event_type: event.event_type,
      status: event.status,
      location_name: event.location_name,
      address: event.address,
      map_address: event.map_address,
      access_note: event.access_note,
      studio_url: event.studio_url,
      studio_capacity: event.studio_capacity ? parseInt(event.studio_capacity) : null,
      studio_fee: event.studio_fee ? parseInt(event.studio_fee) : 0,
      main_image: event.main_image,
      booking_open_at: event.booking_open_at || null,
      meeting_place: event.meeting_place,
      meeting_address: event.meeting_address,
      meeting_map_url: event.meeting_map_url,
      baggage_storage: event.baggage_storage,
      model_assembly_offset_minutes: event.model_assembly_offset_minutes ? parseInt(event.model_assembly_offset_minutes) : 30,
      model_extra_note: event.model_extra_note,
      model_lunch_note: event.model_lunch_note,
      studio_rules: event.studio_rules,
      street_notes: event.street_notes,
      reminder_extra_note: event.reminder_extra_note,
      event_page_url: event.event_page_url,
    }).eq('id', id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function addModelToEvent(modelId) {
    if (entries.find(e => e.model_id === modelId)) return
    const { data: entry } = await supabase.from('event_entries').insert({ event_id: id, model_id: modelId }).select('id, event_id, model_id').single()
    if (!entry) return

    const model = models.find(m => m.id === modelId)
    const basePrice = event.event_type === 'studio'
      ? (parseInt(model?.studio_price || 0) + parseInt(event.studio_fee || 0))
      : parseInt(model?.street_price || 0)

    // モデルのシフト提出を確認
    const { data: shift } = await supabase
      .from('model_shifts')
      .select('available_slots')
      .eq('model_id', modelId)
      .eq('event_date', event.event_date)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const allSlots = event.event_type === 'studio' ? STUDIO_SLOTS : STREET_SLOTS

    let targetSlots
    if (shift?.available_slots?.length > 0) {
      // シフト提出がある場合：提出した時間枠に合致するスロットを使用
      const submittedStarts = shift.available_slots.map(s => s.start)
      targetSlots = allSlots.filter(s => submittedStarts.includes(s.start))
    } else {
      // シフト提出がない場合：0枠以外全て
      targetSlots = allSlots.filter(s => s.order !== 0)
    }

    const slotsToInsert = targetSlots.map(slot => ({
      event_entry_id: entry.id,
      slot_label: slot.label,
      slot_order: slot.order,
      start_time: new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString(),
      end_time: new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString(),
      price: basePrice,
      max_reservations: 1,
      is_reserved: false,
    }))

    const { data: slots } = await supabase.from('booking_slots').insert(slotsToInsert).select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations')
    setEntries(prev => [...prev, { ...entry, booking_slots: slots || [] }])
  }

  async function removeModelFromEvent(entryId) {
    if (!confirm('このモデルをイベントから削除しますか？関連する予約枠も削除されます。')) return
    await supabase.from('event_entries').delete().eq('id', entryId)
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  async function addSlot(entryId, slot) {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    const eventDate = event.event_date
    const startTime = new Date(`${eventDate}T${slot.start}:00+09:00`).toISOString()
    const endTime = new Date(`${eventDate}T${slot.end}:00+09:00`).toISOString()
    const price = event.event_type === 'studio'
      ? (parseInt(entry.studio_price || 0) + parseInt(event.studio_fee || 0))
      : parseInt(entry.street_price || 0)

    const { data } = await supabase.from('booking_slots').insert({
      event_entry_id: entryId,
      slot_label: slot.label,
      slot_order: slot.order,
      start_time: startTime,
      end_time: endTime,
      price: price,
      max_reservations: 1,
      is_reserved: false,
    }).select().single()

    if (data) {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, booking_slots: [...(e.booking_slots || []), data] } : e))
    }
  }

  async function removeSlot(entryId, slotId) {
    await supabase.from('booking_slots').delete().eq('id', slotId)
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, booking_slots: e.booking_slots.filter(s => s.id !== slotId) } : e))
  }

  async function updateSlotPrice(entryId, slotId, price) {
    await supabase.from('booking_slots').update({ price: parseInt(price) }).eq('id', slotId)
    setEntries(prev => prev.map(e => e.id === entryId ? {
      ...e, booking_slots: e.booking_slots.map(s => s.id === slotId ? { ...s, price: parseInt(price) } : s)
    } : e))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const inp = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const label = { display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 5, color: '#555' }
  const slotOptions = event.event_type === 'studio' ? STUDIO_SLOTS : STREET_SLOTS
  const entryModelIds = entries.map(e => e.model_id)

  const tabs = [
    { key: 'basic', label: '基本情報' },
    { key: 'location', label: '場所・詳細' },
    { key: 'models', label: 'モデル・枠' },
    { key: 'notify', label: '通知設定' },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>
      <Link href="/admin/schedule" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← スケジュール管理</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: 0 }}>
          {event.event_date ? `${new Date(event.event_date + 'T00:00:00').getMonth() + 1}/${new Date(event.event_date + 'T00:00:00').getDate()}` : ''} {event.title || 'イベント編集'}
        </h1>
        <button onClick={saveEvent} disabled={saving}
          style={{ background: saved ? '#388e3c' : '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          {saving ? '保存中...' : saved ? '✓ 保存済み' : '保存する'}
        </button>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f5f5f5', borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === t.key ? '#2f2244' : 'transparent',
              color: activeTab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 基本情報タブ */}
      {activeTab === 'basic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 16, marginTop: 0 }}>基本設定</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={label}>開催日 *</label>
                <input type="date" value={event.event_date || ''} onChange={e => updateField('event_date', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={label}>種類 *</label>
                <select value={event.event_type || 'street'} onChange={e => updateField('event_type', e.target.value)} style={inp}>
                  <option value="street">ストリート</option>
                  <option value="studio">スタジオ</option>
                  <option value="irregular">不定期</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>タイトル（例：ドレス撮影会）</label>
              <input type="text" value={event.title || ''} onChange={e => updateField('title', e.target.value)} style={inp} placeholder="ドレス撮影会" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>小見出し（サブタイトル）</label>
              <input type="text" value={event.subtitle || ''} onChange={e => updateField('subtitle', e.target.value)} style={inp} placeholder="フォトフル念願のドレス撮影会💖" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={label}>ステータス</label>
                <select value={event.status || 'draft'} onChange={e => updateField('status', e.target.value)} style={inp}>
                  <option value="draft">非表示（draft）</option>
                  <option value="active">表示中（active）</option>
                  <option value="cancelled">キャンセル</option>
                  <option value="completed">終了</option>
                </select>
              </div>
              <div>
                <label style={label}>予約受付開始日時</label>
                <input type="datetime-local" value={event.booking_open_at ? event.booking_open_at.slice(0, 16) : ''} onChange={e => updateField('booking_open_at', e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>メインイメージURL</label>
              <input type="url" value={event.main_image || ''} onChange={e => updateField('main_image', e.target.value)} style={inp} placeholder="https://..." />
              {event.main_image && <img src={event.main_image} style={{ marginTop: 8, width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />}
            </div>
            <div>
              <label style={label}>イベントページURL（旧サイト等）</label>
              <input type="url" value={event.event_page_url || ''} onChange={e => updateField('event_page_url', e.target.value)} style={inp} placeholder="https://..." />
            </div>
          </div>

          {event.event_type === 'studio' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 16, marginTop: 0 }}>スタジオ設定</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={label}>スタジオ定員人数</label>
                  <input type="number" value={event.studio_capacity || ''} onChange={e => updateField('studio_capacity', e.target.value)} style={inp} placeholder="10" />
                  <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>定員超過で野外受付に切り替わります</p>
                </div>
                <div>
                  <label style={label}>追加料金 ¥（スタジオ・衣装等）</label>
                  <input type="number" value={event.studio_fee ?? 2000} onChange={e => updateField('studio_fee', e.target.value)} style={inp} placeholder="2000" />
                  <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>野外時はこの金額を引いた料金になります（基本2,000円）</p>
                </div>
              </div>
              <div>
                <label style={label}>スタジオHP URL</label>
                <input type="url" value={event.studio_url || ''} onChange={e => updateField('studio_url', e.target.value)} style={inp} placeholder="https://..." />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 場所・詳細タブ */}
      {activeTab === 'location' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 16, marginTop: 0 }}>公開場所情報</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>場所名 *</label>
              <input type="text" value={event.location_name || ''} onChange={e => updateField('location_name', e.target.value)} style={inp} placeholder="Studio gallery-o15＆16" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>住所</label>
              <input type="text" value={event.address || ''} onChange={e => updateField('address', e.target.value)} style={inp} placeholder="〒171-0021 東京都豊島区西池袋3丁目3-9" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Google Maps URL</label>
              <input type="url" value={event.map_address || ''} onChange={e => updateField('map_address', e.target.value)} style={inp} placeholder="https://maps.app.goo.gl/..." />
            </div>
            <div>
              <label style={label}>アクセス詳細（例：池袋駅 徒歩3分）</label>
              <input type="text" value={event.access_note || ''} onChange={e => updateField('access_note', e.target.value)} style={inp} placeholder="池袋駅 徒歩3分" />
            </div>
          </div>

          <div style={{ background: '#fff3e0', borderRadius: 12, padding: 20, border: '1px solid #ffe082' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e65100', marginBottom: 4, marginTop: 0 }}>🔒 非公開：集合場所（モデル・確定メールのみ）</h3>
            <p style={{ fontSize: 12, color: '#795548', marginBottom: 16 }}>ストリートの場合、予約確定メールとモデルLINEにのみ通知されます</p>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>集合場所名</label>
              <input type="text" value={event.meeting_place || ''} onChange={e => updateField('meeting_place', e.target.value)} style={inp} placeholder="ハチ公像前" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>集合場所 住所</label>
              <input type="text" value={event.meeting_address || ''} onChange={e => updateField('meeting_address', e.target.value)} style={inp} placeholder="〒150-0043 東京都渋谷区道玄坂2..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>集合場所 Google Maps URL</label>
              <input type="url" value={event.meeting_map_url || ''} onChange={e => updateField('meeting_map_url', e.target.value)} style={inp} placeholder="https://maps.app.goo.gl/..." />
            </div>
            {event.event_type === 'street' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="baggage" checked={event.baggage_storage ?? true} onChange={e => updateField('baggage_storage', e.target.checked)} style={{ width: 18, height: 18 }} />
                <label htmlFor="baggage" style={{ fontSize: 14, fontWeight: 600 }}>荷物預かりあり</label>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 16, marginTop: 0 }}>
              {event.event_type === 'studio' ? 'スタジオ利用規約（確定メール記載）' : 'ストリート伝達事項（確定メール記載）'}
            </h3>
            <textarea
              value={event.event_type === 'studio' ? (event.studio_rules || '') : (event.street_notes || '')}
              onChange={e => updateField(event.event_type === 'studio' ? 'studio_rules' : 'street_notes', e.target.value)}
              rows={5} style={{ ...inp, resize: 'vertical' }}
              placeholder={event.event_type === 'studio' ? 'スタジオより共有されているスタジオ利用規約...' : 'ストリートエリアの伝達事項...'}
            />
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 4, marginTop: 0 }}>前日リマインドメール 追加記入欄</h3>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>前日22時送信のメールに追加で記載したい内容</p>
            <textarea value={event.reminder_extra_note || ''} onChange={e => updateField('reminder_extra_note', e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="追加の注意事項など..." />
          </div>
        </div>
      )}

      {/* モデル・枠タブ */}
      {activeTab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* シフト提出済み一括追加 */}
          {shifts.filter(s => !entryModelIds.includes(s.model_id)).length > 0 && (
            <div style={{ background: '#e8f5e9', borderRadius: 12, padding: 16, border: '1px solid #a5d6a7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#2e7d32' }}>シフト提出済み（未追加）</span>
                  <span style={{ fontSize: 12, color: '#388e3c', marginLeft: 8 }}>{shifts.filter(s => !entryModelIds.includes(s.model_id)).length}名</span>
                </div>
                <button onClick={autoAddShiftedModels} disabled={autoAdding}
                  style={{ background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {autoAdding ? '追加中...' : '全員一括追加'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {shifts.filter(s => !entryModelIds.includes(s.model_id)).map(s => {
                  const m = models.find(m => m.id === s.model_id)
                  if (!m) return null
                  return (
                    <button key={m.id} onClick={() => addModelToEvent(m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '2px solid #a5d6a7', borderRadius: 20, padding: '4px 10px 4px 5px', cursor: 'pointer' }}>
                      {m.image && <img src={m.image} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2e7d32' }}>+ {m.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* モデル手動追加 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 12, marginTop: 0 }}>モデルを手動追加</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {models.filter(m => !entryModelIds.includes(m.id)).map(m => {
                const hasShift = shifts.some(s => s.model_id === m.id)
                return (
                  <button key={m.id} onClick={() => addModelToEvent(m.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: hasShift ? '#f1f8e9' : '#f8f5ff', border: `1px solid ${hasShift ? '#c5e1a5' : '#e0d5f5'}`, borderRadius: 20, padding: '5px 12px 5px 6px', cursor: 'pointer' }}>
                    {m.image && <img src={m.image} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#2f2244' }}>+ {m.name}</span>
                    {hasShift && <span style={{ fontSize: 10, color: '#388e3c', fontWeight: 700 }}>提出済</span>}
                  </button>
                )
              })}
              {models.filter(m => !entryModelIds.includes(m.id)).length === 0 && (
                <p style={{ color: '#999', fontSize: 13 }}>追加できるモデルがいません</p>
              )}
            </div>
          </div>

          {/* エントリー済みモデル・予約枠 */}
          {entries.map(entry => {
            const model = models.find(m => m.id === entry.model_id)
            const slots = (entry.booking_slots || []).sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0))
            const existingLabels = slots.map(s => s.slot_label)

            return (
              <div key={entry.id} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '2px solid #e0d5f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {model?.image && <img src={model.image} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#2f2244' }}>{model?.name}</span>
                  </div>
                  <button onClick={() => removeModelFromEvent(entry.id)}
                    style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                    削除
                  </button>
                </div>

                {/* 予約済みスロット */}
                {slots.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>登録済み予約枠</p>
                    {slots.map(slot => (
                      <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: slot.is_reserved ? '#fce4ec' : '#f8f5ff', borderRadius: 8, padding: '8px 12px' }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#2f2244' }}>{slot.slot_label}</span>
                        <span style={{ fontSize: 12, color: slot.is_reserved ? '#c62828' : '#388e3c', fontWeight: 600 }}>
                          {slot.is_reserved ? '予約済' : '空き'}
                        </span>
                        <span style={{ fontSize: 12, color: '#555' }}>¥</span>
                        <input type="number" defaultValue={slot.price}
                          onBlur={e => updateSlotPrice(entry.id, slot.id, e.target.value)}
                          style={{ width: 80, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, textAlign: 'right' }} />
                        {!slot.is_reserved && (
                          <button onClick={() => removeSlot(entry.id, slot.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, padding: '0 4px' }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 枠追加 */}
                <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>予約枠を追加</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {slotOptions.filter(s => !existingLabels.includes(s.label)).map(s => (
                    <button key={s.label} onClick={() => addSlot(entry.id, s)}
                      style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}>
                      + {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 通知設定タブ */}
      {activeTab === 'notify' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 4, marginTop: 0 }}>モデルLINE通知設定</h3>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>前日22時にモデルへ送信されるLINEメッセージの設定</p>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>集合時間オフセット（撮影開始の何分前に集合？）</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" value={event.model_assembly_offset_minutes || 30} onChange={e => updateField('model_assembly_offset_minutes', e.target.value)} style={{ ...inp, width: 80 }} />
                <span style={{ fontSize: 14, color: '#555' }}>分前（スタジオ: 30分、ストリート: 20分が目安）</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>ランチ情報</label>
              <input type="text" value={event.model_lunch_note || ''} onChange={e => updateField('model_lunch_note', e.target.value)} style={inp}
                placeholder="撮影会にて軽食、飲み物、昼食が用意されます。" />
            </div>

            <div>
              <label style={label}>伝達事項（都度変更）</label>
              <textarea value={event.model_extra_note || ''} onChange={e => updateField('model_extra_note', e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }}
                placeholder="当日の特記事項、注意事項など..." />
            </div>
          </div>

          <div style={{ background: '#e8f5e9', borderRadius: 12, padding: 20, border: '1px solid #a5d6a7' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2e7d32', marginBottom: 4, marginTop: 0 }}>手動LINE送信</h3>
            <p style={{ fontSize: 12, color: '#388e3c', marginBottom: 16 }}>エントリーモデル全員に今すぐLINEを送信します（当日予約対応等）</p>
            <button
              onClick={async () => {
                if (!confirm('エントリーモデル全員にLINE前日通知を送信しますか？')) return
                await fetch('/api/notifications/line', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'day_before', event_id: id })
                })
                alert('送信しました')
              }}
              style={{ background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              今すぐ前日通知を送信
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <button onClick={saveEvent} disabled={saving}
          style={{ background: saved ? '#388e3c' : '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
          {saving ? '保存中...' : saved ? '✓ 保存済み' : '保存する'}
        </button>
      </div>
    </div>
  )
}
