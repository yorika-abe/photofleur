'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import Cropper from 'react-easy-crop'

const PAYMENT_OPTIONS = [
  { value: 'cash', label: '現金のみ' },
  { value: 'card', label: '事前決済カードのみ' },
  { value: 'both', label: 'どちらも可' },
]

const EMPTY_FORM = {
  title: '', description: '', price: 0, image: '', payment_method: 'both',
  model_ids: [], stock: 1, require_event_details: false,
  hansellingItems: [{ label: '', amount: 0 }],
}

export default function PrivateProductsPage() {
  const [products, setProducts] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editId, setEditId] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [toast, setToast] = useState(null)
  const [copiedToken, setCopiedToken] = useState(null)
  const fileRef = useRef()
  const formRef = useRef()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/private-products').then(r => r.json())
    setProducts(res.products || [])
    setModels(res.models || [])
    setLoading(false)
  }

  function uploadImage(file) {
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onCropComplete = useCallback((_, pixels) => { setCroppedAreaPixels(pixels) }, [])

  async function confirmCrop() {
    if (!cropSrc || !croppedAreaPixels) return
    const src = cropSrc
    const pixels = croppedAreaPixels
    setCropSrc(null)
    setUploading(true)
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src
      })
      const canvas = document.createElement('canvas')
      canvas.width = pixels.width; canvas.height = pixels.height
      canvas.getContext('2d').drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, pixels.width, pixels.height)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85))
      URL.revokeObjectURL(src)
      const path = `private-products/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('images').upload(path, new File([blob], 'image.jpg', { type: 'image/jpeg' }))
      if (error) { alert('アップロード失敗'); return }
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      setForm(f => ({ ...f, image: publicUrl }))
    } catch (e) {
      URL.revokeObjectURL(src)
      alert('アップロードエラー: ' + e)
    } finally {
      setUploading(false)
    }
  }

  function startEdit(p) {
    setEditId(p.id)
    setForm({
      title: p.title || '',
      description: p.description || '',
      price: p.price || 0,
      image: p.image || '',
      payment_method: p.payment_method || 'both',
      model_ids: Array.isArray(p.model_ids) ? p.model_ids : (typeof p.model_ids === 'string' ? JSON.parse(p.model_ids) : (p.model_id ? [p.model_id] : [])),
      stock: p.stock ?? 1,
      require_event_details: p.require_event_details ?? false,
      hansellingItems: Array.isArray(p.hanselling_items) && p.hanselling_items.length > 0
        ? p.hanselling_items
        : (p.hanselling > 0 ? [{ label: '', amount: p.hanselling }] : [{ label: '', amount: 0 }]),
    })
    setExpanded(p.id)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  function toggleModel(m) {
    setForm(f => {
      const checked = (f.model_ids || []).includes(m.id)
      const newIds = checked ? f.model_ids.filter(id => id !== m.id) : [...(f.model_ids || []), m.id]
      // モデルが1人だけ選択された場合、そのモデルの画像を自動セット
      let newImage = f.image
      if (!checked && newIds.length === 1 && m.image) {
        newImage = m.image
      }
      return { ...f, model_ids: newIds, image: newImage }
    })
  }

  function updateHansellingItem(i, key, value) {
    setForm(f => ({ ...f, hansellingItems: f.hansellingItems.map((item, idx) => idx === i ? { ...item, [key]: value } : item) }))
  }
  function addHansellingItem() {
    setForm(f => ({ ...f, hansellingItems: [...f.hansellingItems, { label: '', amount: 0 }] }))
  }
  function removeHansellingItem(i) {
    setForm(f => ({ ...f, hansellingItems: f.hansellingItems.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    if (!form.title.trim()) { alert('商品名を入力してください'); return }
    setSaving(true)
    const { hansellingItems, ...restForm } = form
    const hanselling = hansellingItems.reduce((s, item) => s + (Number(item.amount) || 0), 0)
    const url = editId ? `/api/admin/private-products/${editId}` : '/api/admin/private-products'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...restForm, price: Number(form.price), stock: Number(form.stock), hanselling, hanselling_items: form.hansellingItems }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert('保存失敗: ' + (d.error || res.status))
      return
    }
    showToast(editId ? '更新しました' : '作成しました')
    setEditId(null)
    setForm(EMPTY_FORM)
    load()
  }

  async function toggleActive(p) {
    await fetch(`/api/admin/private-products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, is_active: !p.is_active }),
    })
    load()
  }

  async function deleteProduct(p) {
    if (!confirm(`「${p.title}」を削除しますか？`)) return
    await fetch(`/api/admin/private-products/${p.id}`, { method: 'DELETE' })
    showToast('削除しました')
    load()
  }

  function copyLink(token) {
    const url = `${origin}/p/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const isEditing = !!editId
  const formTitle = isEditing ? '編集' : '新規作成'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {cropSrc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={4 / 3}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <div style={{ background: '#1a1a2e', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, whiteSpace: 'nowrap' }}>ズーム</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#1a3560' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }}
                style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={confirmCrop}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#1a3560', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                この範囲でアップロード
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#1b5e20', color: '#fff', borderRadius: 10, padding: '12px 24px', fontWeight: 600, fontSize: 14, zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '12px 0 4px' }}>非公開商品管理</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 28 }}>リンクを共有した相手だけが予約できる商品を管理します</p>

      {/* 作成・編集フォーム */}
      <div ref={formRef} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 16 }}>{formTitle}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>商品名 *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="リクエスト撮影 60分コース" style={inp} />
          </div>
          <div>
            <label style={lbl}>料金 ¥</label>
            <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>在庫（予約受付数）</label>
            <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} style={inp} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>詳細説明</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="商品の詳細..." style={{ ...inp, resize: 'vertical' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>支払方法</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              {PAYMENT_OPTIONS.map(o => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="payment_method" value={o.value}
                    checked={form.payment_method === o.value}
                    onChange={() => setForm(f => ({ ...f, payment_method: o.value }))} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>対応モデル（任意・複数可）</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {models.map(m => {
                const checked = (form.model_ids || []).includes(m.id)
                return (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', background: checked ? '#c8e6c9' : '#f5f5f5', border: `1px solid ${checked ? '#4caf50' : '#ddd'}`, borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: checked ? 700 : 400 }}>
                    <input type="checkbox" checked={checked} style={{ display: 'none' }} onChange={() => toggleModel(m)} />
                    {checked ? '✓ ' : ''}{m.name}
                  </label>
                )
              })}
              {models.length === 0 && <span style={{ fontSize: 12, color: '#bbb' }}>モデルがいません</span>}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.require_event_details}
                onChange={e => setForm(f => ({ ...f, require_event_details: e.target.checked }))} />
              <span style={{ fontWeight: 600 }}>予約者に開催日・集合場所・撮影時間の入力を必須にする</span>
            </label>
            {form.require_event_details && (
              <p style={{ fontSize: 12, color: '#888', marginTop: 4, marginLeft: 24 }}>
                予約フォームに「開催日・集合解散場所・撮影時間」欄が必須項目として表示されます
              </p>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>販管費 <span style={{ fontWeight: 400, color: '#bbb', fontSize: 11 }}>（モデル報酬、スタッフ報酬、モデル交通費往復、スタッフ交通費往復）</span></label>
            {form.hansellingItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={item.label} onChange={e => updateHansellingItem(i, 'label', e.target.value)}
                  placeholder="項目名" style={{ ...inp, flex: 2 }} />
                <input type="number" min="0" value={item.amount} onChange={e => updateHansellingItem(i, 'amount', e.target.value)}
                  placeholder="0" style={{ ...inp, flex: 1 }} />
                {form.hansellingItems.length > 1 && (
                  <button onClick={() => removeHansellingItem(i)}
                    style={{ padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', color: '#e53935', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={addHansellingItem}
                style={{ fontSize: 12, color: '#1a3560', background: 'none', border: '1px solid #1a3560', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>+ 追加</button>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>
                合計 ¥{form.hansellingItems.reduce((s, item) => s + (Number(item.amount) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>画像</label>
            {form.image && (
              <div style={{ marginBottom: 8 }}>
                <img src={form.image} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                <button onClick={() => setForm(f => ({ ...f, image: '' }))}
                  style={{ marginLeft: 10, fontSize: 12, color: '#c62828', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
            <button onClick={() => fileRef.current.click()} disabled={uploading}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #1a3560', background: '#fff', color: '#1a3560', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {uploading ? 'アップロード中...' : '📷 画像をアップロード'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          {isEditing && (
            <button onClick={cancelEdit} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              キャンセル
            </button>
          )}
          <button onClick={save} disabled={saving}
            style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: saving ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '保存中...' : isEditing ? '更新する' : '+ 作成する'}
          </button>
        </div>
      </div>

      {/* 商品一覧 */}
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 12 }}>作成済み商品</div>
      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : products.length === 0 ? (
        <p style={{ color: '#999', fontSize: 14 }}>まだ商品がありません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {products.map(p => {
            const isExp = expanded === p.id && editId !== p.id
            const shareUrl = `${origin}/p/${p.token}`
            const payLabel = PAYMENT_OPTIONS.find(o => o.value === p.payment_method)?.label || ''
            return (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${p.is_active ? '#e5e5e5' : '#ffcdd2'}`, overflow: 'hidden', opacity: p.is_active ? 1 : 0.7 }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {p.image && <img src={p.image} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{p.title}</span>
                      {!p.is_active && <span style={{ fontSize: 11, background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>非公開</span>}
                      {p.require_event_details && <span style={{ fontSize: 11, background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>詳細入力必須</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      ¥{p.price.toLocaleString()} ／ {payLabel} ／ 残{p.stock}件
                      {p.models && <span> ／ {p.models.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#1a3560', fontWeight: 600 }}>{p.booking_count}件予約</span>
                    <button onClick={() => copyLink(p.token)}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #1a3560', background: copiedToken === p.token ? '#1a3560' : '#fff', color: copiedToken === p.token ? '#fff' : '#1a3560', cursor: 'pointer', fontWeight: 600 }}>
                      {copiedToken === p.token ? '✓ コピー済み' : '🔗 リンクコピー'}
                    </button>
                    <button onClick={() => startEdit(p)}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                      編集
                    </button>
                    <button onClick={() => setExpanded(isExp ? null : p.id)}
                      style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {isExp ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 10, wordBreak: 'break-all' }}>
                      共有リンク: <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560' }}>{shareUrl}</a>
                    </div>
                    {p.description && <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>{p.description}</p>}
                    {p.booking_count > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a3560', marginBottom: 8 }}>予約一覧</div>
                        <BookingList productId={p.id} onCancel={load} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button onClick={() => toggleActive(p)}
                        style={{ fontSize: 13, padding: '6px 16px', borderRadius: 8, border: `1px solid ${p.is_active ? '#e53935' : '#388e3c'}`, background: '#fff', color: p.is_active ? '#e53935' : '#388e3c', cursor: 'pointer', fontWeight: 600 }}>
                        {p.is_active ? '非公開にする' : '公開する'}
                      </button>
                      <button onClick={() => deleteProduct(p)}
                        style={{ fontSize: 13, padding: '6px 16px', borderRadius: 8, border: '1px solid #e53935', background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BookingList({ productId, onCancel }) {
  const [bookings, setBookings] = useState(null)

  async function load() {
    const d = await fetch(`/api/admin/private-products/${productId}`).then(r => r.json())
    setBookings(d.bookings || [])
  }

  useEffect(() => { load() }, [productId])

  async function cancelBooking(b) {
    if (!confirm(`${b.last_name} ${b.first_name || ''}さんの予約をキャンセルしますか？在庫が1件戻ります。`)) return
    await fetch(`/api/admin/private-bookings/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel: true }),
    })
    await load()
    onCancel?.()
  }

  if (!bookings) return <p style={{ fontSize: 12, color: '#aaa' }}>読み込み中...</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {bookings.map(b => (
        <div key={b.id} style={{ background: b.cancelled_at ? '#fafafa' : '#fff', border: `1px solid ${b.cancelled_at ? '#eee' : '#e5e5e5'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, opacity: b.cancelled_at ? 0.6 : 1 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{b.last_name} {b.first_name}</span>
            {b.nickname && <span style={{ color: '#888' }}>({b.nickname})</span>}
            <span style={{ color: '#888' }}>{b.email}</span>
            {b.phone && <span style={{ color: '#888' }}>{b.phone}</span>}
            <span style={{ fontSize: 11, background: b.payment_method === 'card' ? '#e8f5e9' : '#e3f2fd', color: b.payment_method === 'card' ? '#388e3c' : '#1565c0', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>
              {b.payment_method === 'card' ? 'カード' : '現金'}
            </span>
            {b.cancelled_at && (
              <span style={{ fontSize: 11, background: '#ffebee', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>キャンセル</span>
            )}
            {!b.cancelled_at && (
              <button onClick={() => cancelBooking(b)}
                style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 10px', borderRadius: 6, border: '1px solid #e53935', background: '#fff', color: '#e53935', cursor: 'pointer', fontWeight: 600 }}>
                キャンセル
              </button>
            )}
            <span style={{ color: '#bbb', fontSize: 11, marginLeft: b.cancelled_at ? 'auto' : 0 }}>{new Date(b.created_at).toLocaleDateString('ja-JP')}</span>
          </div>
          {(b.event_date_input || b.meeting_place || b.shooting_time) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#666', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {b.event_date_input && <span>📅 {b.event_date_input}</span>}
              {b.meeting_place && <span>📍 {b.meeting_place}</span>}
              {b.shooting_time && <span>⏰ {b.shooting_time}</span>}
            </div>
          )}
          {b.sns_url && <div style={{ marginTop: 4, fontSize: 12, color: '#1a3560' }}>{b.sns_url}</div>}
          {b.notes && <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>{b.notes}</div>}
        </div>
      ))}
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
