'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [slotTemplates, setSlotTemplates] = useState(null) // カスタム予約枠テンプレート
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [autoAdding, setAutoAdding] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [products, setProducts] = useState([])
  const [modelsSubTab, setModelsSubTab] = useState('models')
  const [newProduct, setNewProduct] = useState({ name: '', image: '', description: '', price: 0, stock: 1, options: [] })
  const [uploadingProductImg, setUploadingProductImg] = useState(false)
  const [productImgProgress, setProductImgProgress] = useState(0)
  const [recalculating, setRecalculating] = useState(null) // entryId
  const [recalcDone, setRecalcDone] = useState(null) // entryId


  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const res = await fetch(`/api/admin/events/${id}`)
      if (!res.ok) { setLoading(false); return }
      const { event: ev, models: mods, entries: entriesWithSlots, shifts: shiftData } = await res.json()
      let galleryImages = []
      try { galleryImages = JSON.parse(ev?.gallery_images || '[]') } catch {}
      setEvent({ ...(ev || {}), gallery_images: galleryImages })
      setModels(mods || [])
      setEntries(entriesWithSlots || [])
      setShifts(shiftData || [])
      const productsRes = await fetch(`/api/admin/events/${id}/products`)
      setProducts(productsRes.ok ? await productsRes.json() : [])
      // 保存済みテンプレートがあれば使用、なければイベント種別のデフォルトを使用
      let savedTemplates = null
      try { savedTemplates = ev?.slot_templates ? JSON.parse(ev.slot_templates) : null } catch {}
      if (!savedTemplates) {
        savedTemplates = (ev?.event_type === 'street' ? STREET_SLOTS : STUDIO_SLOTS).map(s => ({ ...s }))
      }
      setSlotTemplates(savedTemplates)
    } catch (e) {
      console.error('load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function autoAddShiftedModels() {
    if (!event.event_date) return
    setAutoAdding(true)
    await fetch(`/api/admin/events/${id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_add', event, slotTemplates }),
    })
    setAutoAdding(false)
    await load()
  }

  function resetSlotTemplates(eventType) {
    setSlotTemplates((eventType === 'street' ? STREET_SLOTS : STUDIO_SLOTS).map(s => ({ ...s })))
  }

  function updateField(key, value) {
    if (key === 'event_type') {
      const newTemplates = (value === 'street' ? STREET_SLOTS : STUDIO_SLOTS).map(s => ({ ...s }))
      setSlotTemplates(newTemplates)
      fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, event_type: value }),
      })
      const hasSlots = entries.some(e => (e.booking_slots || []).length > 0)
      if (hasSlots && confirm('開催形式を変更しました。登録済みの予約枠を新しい形式にリセットしますか？\n（既存の予約枠はすべて削除されます）')) {
        resetAllSlots(value, newTemplates)
      }
      setEvent(prev => ({ ...prev, event_type: value }))
      return
    }
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
    const res = await fetch('/api/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
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
        studio_fee: event.studio_fee != null ? parseInt(event.studio_fee) : 2000,
        main_image: event.main_image,
        gallery_images: JSON.stringify(event.gallery_images || []),
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
      }),
    })
    setSaving(false)
    if (res.ok) {
      router.push('/admin/schedule')
    }
  }

  function uploadWithProgress(file, path) {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path)
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
      })
      xhr.addEventListener('load', () => {
        const data = JSON.parse(xhr.responseText)
        if (data.error) { reject(data.error); return }
        resolve(data.url)
      })
      xhr.addEventListener('error', () => reject('通信エラー'))
      xhr.open('POST', '/api/admin/upload')
      xhr.send(formData)
    })
  }

  async function uploadMainImage(file) {
    setUploading('main_image')
    setUploadProgress(0)
    const path = `events/${id}/main-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const url = await uploadWithProgress(file, path)
      updateField('main_image', url)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function uploadGalleryImages(files) {
    setUploading('gallery')
    setUploadProgress(0)
    try {
      const urls = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `events/${id}/gallery-${Date.now()}-${i}.${file.name.split('.').pop()}`
        const url = await uploadWithProgress(file, path)
        urls.push(url)
      }
      updateField('gallery_images', [...(event.gallery_images || []), ...urls])
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function addModelToEvent(modelId) {
    if (entries.find(e => e.model_id === modelId)) return
    const res = await fetch(`/api/admin/events/${id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_model', modelId, event, slotTemplates }),
    })
    const data = await res.json()
    if (data.entry) setEntries(prev => [...prev, data.entry])
  }

  async function removeModelFromEvent(entryId) {
    if (!confirm('このモデルをイベントから削除しますか？関連する予約枠も削除されます。')) return
    await fetch(`/api/admin/events/${id}/entries`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId }),
    })
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  async function addSlot(entryId, slot) {
    const res = await fetch(`/api/admin/events/${id}/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, slot, event }),
    })
    const data = await res.json()
    if (data.slot) setEntries(prev => prev.map(e => e.id === entryId ? { ...e, booking_slots: [...(e.booking_slots || []), data.slot] } : e))
  }

  async function removeSlot(entryId, slotId) {
    await fetch(`/api/admin/events/${id}/slots`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, booking_slots: e.booking_slots.filter(s => s.id !== slotId) } : e))
  }

  async function updateSlotPrice(entryId, slotId, price) {
    await fetch(`/api/admin/events/${id}/slots`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, price: parseInt(price) }),
    })
    setEntries(prev => prev.map(e => e.id === entryId ? {
      ...e, booking_slots: e.booking_slots.map(s => s.id === slotId ? { ...s, price: parseInt(price) } : s)
    } : e))
  }

  async function updateSlotMaxReservations(entryId, slotId, max) {
    const val = Math.max(1, parseInt(max) || 1)
    await fetch(`/api/admin/events/${id}/slots`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, max_reservations: val }),
    })
    setEntries(prev => prev.map(e => e.id === entryId ? {
      ...e, booking_slots: e.booking_slots.map(s => s.id === slotId ? { ...s, max_reservations: val } : s)
    } : e))
  }

  async function resetAllSlots(eventType, templates) {
    await fetch(`/api/admin/events/${id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_all_slots', eventType, templates, eventData: event }),
    })
    await load()
  }

  async function recalculatePrices(entryId) {
    setRecalculating(entryId)
    setRecalcDone(null)
    await fetch(`/api/admin/events/${id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recalculate_prices', entryId, event }),
    })
    await load()
    setRecalculating(null)
    setRecalcDone(entryId)
    setTimeout(() => setRecalcDone(null), 3000)
  }

  async function uploadProductImage(file) {
    setUploadingProductImg(true)
    setProductImgProgress(0)
    const path = `events/${id}/product-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const url = await uploadWithProgress(file, path)
      setNewProduct(p => ({ ...p, image: url }))
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploadingProductImg(false)
    setProductImgProgress(0)
  }

  async function addProduct() {
    if (!newProduct.name.trim()) { alert('商品名を入力してください'); return }
    const res = await fetch(`/api/admin/events/${id}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    })
    const data = await res.json()
    if (data.id) {
      setProducts(prev => [...prev, data])
      setNewProduct({ name: '', image: '', description: '', price: 0, stock: 1, options: [] })
    } else if (data.error) {
      alert('エラー: ' + data.error)
    }
  }

  async function removeProduct(productId) {
    if (!confirm('この商品を削除しますか？')) return
    await fetch(`/api/admin/events/${id}/products`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  async function updateProductOptions(productId, options) {
    await fetch(`/api/admin/events/${id}/products`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, options }),
    })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, options } : p))
  }

  async function updateProductStock(productId, stock) {
    await fetch(`/api/admin/events/${id}/products`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, stock: parseInt(stock) || 1 }),
    })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: parseInt(stock) || 1 } : p))
  }


  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const inp = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const label = { display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 5, color: '#555' }
  const entryModelIds = entries.map(e => e.model_id)
  const currentSlots = slotTemplates || (event.event_type === 'street' ? STREET_SLOTS : STUDIO_SLOTS)

  function updateSlotTemplate(idx, key, value) {
    setSlotTemplates(prev => {
      const next = [...(prev || currentSlots)]
      next[idx] = { ...next[idx], [key]: value }
      // ラベルを自動更新
      next[idx].label = `${next[idx].order}部 ${next[idx].start}〜${next[idx].end}`
      return next
    })
  }

  function addSlotTemplate() {
    setSlotTemplates(prev => {
      const list = prev || currentSlots
      const maxOrder = Math.max(...list.map(s => s.order), 0)
      return [...list, { label: `${maxOrder + 1}部 00:00〜00:00`, start: '00:00', end: '00:00', order: maxOrder + 1 }]
    })
  }

  function removeSlotTemplate(idx) {
    setSlotTemplates(prev => (prev || currentSlots).filter((_, i) => i !== idx))
  }

  const tabs = [
    { key: 'basic', label: '基本情報' },
    { key: 'gallery', label: 'ギャラリー' },
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
              <label style={label}>メインイメージ</label>
              {event.main_image && (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={event.main_image} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => updateField('main_image', '')}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>削除</button>
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#2f2244', color: '#fff', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: uploading === 'main_image' ? 0.7 : 1 }}>
                📷 画像をアップロード
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!uploading}
                  onChange={e => e.target.files?.[0] && uploadMainImage(e.target.files[0])} />
              </label>
              {uploading === 'main_image' && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 3 }}><span>アップロード中...</span><span>{uploadProgress}%</span></div>
                  <div style={{ background: '#eee', borderRadius: 99, height: 6 }}><div style={{ height: '100%', background: '#2f2244', borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.2s' }} /></div>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <input type="url" value={event.main_image || ''} onChange={e => updateField('main_image', e.target.value)} style={{ ...inp, fontSize: 12 }} placeholder="またはURLを直接入力" />
              </div>
            </div>
          </div>

          {(event.event_type === 'studio' || event.event_type === 'irregular') && (
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
                  <input type="number" value={event.studio_fee || 2000} onChange={e => updateField('studio_fee', e.target.value)} style={inp} placeholder="2000" />
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

      {/* ギャラリータブ */}
      {activeTab === 'gallery' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e5e5' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 4, marginTop: 0 }}>撮影イメージ ギャラリー</h3>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>複数枚登録できます。イベント詳細ページに表示されます。</p>

          {(event.gallery_images || []).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
              {(event.gallery_images || []).map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => updateField('gallery_images', (event.gallery_images || []).filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#2f2244', color: '#fff', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: uploading === 'gallery' ? 0.7 : 1 }}>
            📷 画像を追加（複数可）
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.length && uploadGalleryImages(Array.from(e.target.files))} />
          </label>

          {uploading === 'gallery' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 3 }}><span>アップロード中...</span><span>{uploadProgress}%</span></div>
              <div style={{ background: '#eee', borderRadius: 99, height: 6 }}><div style={{ height: '100%', background: '#2f2244', borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.2s' }} /></div>
            </div>
          )}

          {(event.gallery_images || []).length > 0 && (
            <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>変更後は「保存する」ボタンを押してください</p>
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
              <input type="text" value={event.address || ''} onChange={e => {
                const addr = e.target.value
                updateField('address', addr)
                if (addr) updateField('map_address', `https://maps.google.com/maps?q=${encodeURIComponent(addr)}`)
              }} style={inp} placeholder="〒171-0021 東京都豊島区西池袋3丁目3-9" />
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
              <input type="text" value={event.meeting_address || ''} onChange={e => {
                const addr = e.target.value
                updateField('meeting_address', addr)
                if (addr) updateField('meeting_map_url', `https://maps.google.com/maps?q=${encodeURIComponent(addr)}`)
              }} style={inp} placeholder="〒150-0043 東京都渋谷区道玄坂2..." />
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

          {/* 予約受付枠テンプレート管理 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e5e5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>予約受付枠の設定</h3>
                <span style={{ fontSize: 11, background: event.event_type === 'studio' ? '#fce4ec' : event.event_type === 'street' ? '#e0f7fa' : '#e8eaf6', color: event.event_type === 'studio' ? '#c2185b' : event.event_type === 'street' ? '#0097a7' : '#1a3560', borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>
                  {event.event_type === 'studio' ? 'スタジオ' : event.event_type === 'street' ? 'ストリート' : '不定期'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => resetSlotTemplates(event.event_type)}
                  style={{ fontSize: 12, background: '#f5f5f5', color: '#888', border: '1px solid #ddd', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>
                  デフォルトに戻す
                </button>
                <button onClick={addSlotTemplate}
                  style={{ fontSize: 12, background: '#e0f7fa', color: '#0097a7', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700 }}>
                  + 枠を追加
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentSlots.map((slot, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f8f8', borderRadius: 8, padding: '6px 10px' }}>
                  <span style={{ fontSize: 12, color: '#888', minWidth: 24, textAlign: 'right' }}>{slot.order}部</span>
                  <input type="time" value={slot.start} onChange={e => updateSlotTemplate(idx, 'start', e.target.value)}
                    style={{ padding: '3px 6px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontWeight: 600, width: 88 }} />
                  <span style={{ color: '#bbb', fontSize: 13 }}>〜</span>
                  <input type="time" value={slot.end} onChange={e => updateSlotTemplate(idx, 'end', e.target.value)}
                    style={{ padding: '3px 6px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontWeight: 600, width: 88 }} />
                  <span style={{ fontSize: 12, color: '#aaa', flex: 1 }}>{slot.label}</span>
                  <button onClick={() => removeSlotTemplate(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#aaa', margin: '8px 0 0' }}>変更後は「保存する」ボタンで保存してください</p>
          </div>

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

          {/* 手動追加セクション（モデル・予約商品） */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
            {/* サブタブ */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
              {[['models', 'モデルを追加'], ['products', '予約商品を追加']].map(([key, label]) => (
                <button key={key} onClick={() => setModelsSubTab(key)}
                  style={{ flex: 1, padding: '12px 8px', border: 'none', background: modelsSubTab === key ? '#2f2244' : '#f8f8f8', color: modelsSubTab === key ? '#fff' : '#666', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {modelsSubTab === 'models' && (
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
              )}

              {modelsSubTab === 'products' && (
                <div>
                  {/* 商品追加フォーム */}
                  <div style={{ background: '#f8fbff', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #e0ecf8' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3560', marginBottom: 12, marginTop: 0 }}>新しい予約商品を追加</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>商品名 *</label>
                          <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} placeholder="フォトブック" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>料金 ¥</label>
                          <input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} placeholder="3000" />
                        </div>
                      </div>
                      <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>画像</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {newProduct.image && (
                              <div style={{ position: 'relative' }}>
                                <img src={newProduct.image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
                                <button type="button" onClick={() => setNewProduct(p => ({ ...p, image: '' }))}
                                  style={{ position: 'absolute', top: -6, right: -6, background: '#e53935', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                              </div>
                            )}
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: uploadingProductImg ? '#ccc' : '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 12px', cursor: uploadingProductImg ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                              📷 {uploadingProductImg ? `${productImgProgress}%` : 'アップロード'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingProductImg}
                                onChange={e => e.target.files?.[0] && uploadProductImage(e.target.files[0])} />
                            </label>
                          </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>選択肢（オプション）</label>
                          <button type="button" onClick={() => setNewProduct(p => ({ ...p, options: [...p.options, { name: '', stock: 1 }] }))}
                            style={{ fontSize: 11, background: '#e8f0fe', color: '#1a3560', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontWeight: 700 }}>
                            + 選択肢を追加
                          </button>
                        </div>
                        {newProduct.options.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>在庫数（選択肢なし）</span>
                            <input type="number" min="1" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))}
                              style={{ width: 72, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {newProduct.options.map((opt, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input value={opt.name} onChange={e => setNewProduct(p => ({ ...p, options: p.options.map((o, i) => i === idx ? { ...o, name: e.target.value } : o) }))}
                                  placeholder="例: S / M / L / 1部..." style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                                <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>在庫</span>
                                <input type="number" min="0" value={opt.stock} onChange={e => setNewProduct(p => ({ ...p, options: p.options.map((o, i) => i === idx ? { ...o, stock: parseInt(e.target.value) || 0 } : o) }))}
                                  style={{ width: 60, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, textAlign: 'center' }} />
                                <button type="button" onClick={() => setNewProduct(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>詳細説明</label>
                        <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                          rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} placeholder="商品の説明..." />
                      </div>
                      <button onClick={addProduct}
                        style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, alignSelf: 'flex-start' }}>
                        + 追加する
                      </button>
                    </div>
                  </div>

                  {/* 登録済み商品リスト */}
                  {products.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#555', margin: 0 }}>登録済み予約商品</p>
                      {products.map(p => (
                        <div key={p.id} style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.image && <img src={p.image} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3560' }}>{p.name}</div>
                              {p.description && <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', whiteSpace: 'nowrap' }}>¥{(p.price || 0).toLocaleString()}</div>
                            <button onClick={() => removeProduct(p.id)}
                              style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>削除</button>
                          </div>
                          {/* 選択肢（options）または在庫 */}
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e8e8e8' }}>
                            {p.options?.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {p.options.map((opt, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '4px 8px' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1a3560' }}>{opt.name}</span>
                                    <span style={{ fontSize: 11, color: '#aaa' }}>在庫</span>
                                    <input type="number" min="0" defaultValue={opt.stock}
                                      style={{ width: 48, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, textAlign: 'center' }}
                                      onBlur={e => {
                                        const updated = p.options.map((o, i) => i === idx ? { ...o, stock: parseInt(e.target.value) || 0 } : o)
                                        updateProductOptions(p.id, updated)
                                      }} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: '#888' }}>在庫</span>
                                <input type="number" min="0" defaultValue={p.stock}
                                  style={{ width: 60, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13, textAlign: 'center' }}
                                  onBlur={e => updateProductStock(p.id, e.target.value)} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {products.length === 0 && (
                    <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>まだ予約商品がありません</p>
                  )}
                </div>
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
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => recalculatePrices(entry.id)} disabled={recalculating === entry.id}
                      style={{ background: recalcDone === entry.id ? '#e8f5e9' : '#e3f2fd', color: recalcDone === entry.id ? '#2e7d32' : '#1565c0', border: `1px solid ${recalcDone === entry.id ? '#a5d6a7' : '#90caf9'}`, borderRadius: 6, padding: '4px 10px', cursor: recalculating === entry.id ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
                      {recalculating === entry.id ? '計算中...' : recalcDone === entry.id ? '✓ 更新済み' : '料金再計算'}
                    </button>
                    <button onClick={() => removeModelFromEvent(entry.id)}
                      style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                      削除
                    </button>
                  </div>
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
                        <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>人数</span>
                        <input type="number" min="1" key={slot.id + '_max'} defaultValue={slot.max_reservations || 1}
                          onBlur={e => updateSlotMaxReservations(entry.id, slot.id, e.target.value)}
                          style={{ width: 48, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, textAlign: 'center' }} />
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
                  {currentSlots.filter(s => !existingLabels.includes(s.label)).map(s => (
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
