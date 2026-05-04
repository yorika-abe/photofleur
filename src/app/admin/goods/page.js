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
  title: '', description: '', price: 0, image: '', payment_method: 'both', stock: -1,
}

export default function GoodsAdminPage() {
  const [goods, setGoods] = useState([])
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
  const fileRef = useRef()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/goods').then(r => r.json())
    setGoods(res.goods || [])
    setLoading(false)
  }

  function uploadImage(file) {
    setCropSrc(URL.createObjectURL(file))
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
      const path = `goods/${Date.now()}.jpg`
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

  function startEdit(g) {
    setEditId(g.id)
    setForm({
      title: g.title || '',
      description: g.description || '',
      price: g.price || 0,
      image: g.image || '',
      payment_method: g.payment_method || 'both',
      stock: g.stock ?? -1,
    })
    setExpanded(g.id)
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM) }

  async function save() {
    if (!form.title.trim()) { alert('商品名を入力してください'); return }
    setSaving(true)
    const url = editId ? `/api/admin/goods/${editId}` : '/api/admin/goods'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) }),
    })
    setSaving(false)
    if (!res.ok) { alert('保存失敗'); return }
    showToast(editId ? '更新しました' : '作成しました')
    setEditId(null)
    setForm(EMPTY_FORM)
    load()
  }

  async function toggleActive(g) {
    await fetch(`/api/admin/goods/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...g, is_active: !g.is_active }),
    })
    load()
  }

  async function deleteGoods(g) {
    if (!confirm(`「${g.title}」を削除しますか？`)) return
    await fetch(`/api/admin/goods/${g.id}`, { method: 'DELETE' })
    showToast('削除しました')
    load()
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const isEditing = !!editId

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
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '12px 0 4px' }}>グッズ管理</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 28 }}>
        イベントに関係なく販売するグッズを管理します。公開中の商品は <a href="/shop" target="_blank" style={{ color: '#1a3560' }}>/shop</a> に表示されます。
      </p>

      {/* 作成・編集フォーム */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 16 }}>{isEditing ? '編集' : '新規作成'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>商品名 *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="PhotoFleurオリジナルステッカー" style={inp} />
          </div>
          <div>
            <label style={lbl}>料金 ¥</label>
            <input type="number" min="0" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>在庫数（-1で無制限）</label>
            <input type="number" min="-1" value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} style={inp} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>詳細説明</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="商品の詳細説明..." style={{ ...inp, resize: 'vertical' }} />
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
            <button onClick={cancelEdit}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
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
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 12 }}>作成済みグッズ</div>
      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : goods.length === 0 ? (
        <p style={{ color: '#999', fontSize: 14 }}>まだグッズがありません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goods.map(g => {
            const isExp = expanded === g.id && editId !== g.id
            const payLabel = PAYMENT_OPTIONS.find(o => o.value === g.payment_method)?.label || ''
            const stockLabel = g.stock === -1 ? '無制限' : `残${g.stock}個`
            return (
              <div key={g.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${g.is_active ? '#e5e5e5' : '#ffcdd2'}`, overflow: 'hidden', opacity: g.is_active ? 1 : 0.7 }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {g.image && <img src={g.image} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{g.title}</span>
                      {!g.is_active && <span style={{ fontSize: 11, background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>非公開</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      ¥{g.price.toLocaleString()} ／ {payLabel} ／ {stockLabel}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#3949ab', fontWeight: 600 }}>{g.order_count}件注文</span>
                    <button onClick={() => startEdit(g)}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                      編集
                    </button>
                    <button onClick={() => setExpanded(isExp ? null : g.id)}
                      style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {isExp ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                    {g.description && <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>{g.description}</p>}
                    {g.order_count > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a3560', marginBottom: 8 }}>注文一覧</div>
                        <OrderList goodsId={g.id} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button onClick={() => toggleActive(g)}
                        style={{ fontSize: 13, padding: '6px 16px', borderRadius: 8, border: `1px solid ${g.is_active ? '#e53935' : '#388e3c'}`, background: '#fff', color: g.is_active ? '#e53935' : '#388e3c', cursor: 'pointer', fontWeight: 600 }}>
                        {g.is_active ? '非公開にする' : '公開する'}
                      </button>
                      <button onClick={() => deleteGoods(g)}
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

function OrderList({ goodsId }) {
  const [orders, setOrders] = useState(null)
  useEffect(() => {
    fetch(`/api/admin/goods/${goodsId}`)
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
  }, [goodsId])

  if (!orders) return <p style={{ fontSize: 12, color: '#aaa' }}>読み込み中...</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {orders.map(o => (
        <div key={o.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 12px', fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{o.last_name} {o.first_name}</span>
          <span style={{ color: '#888' }}>{o.email}</span>
          {o.phone && <span style={{ color: '#888' }}>{o.phone}</span>}
          <span style={{ fontSize: 11, background: '#e8eaf6', color: '#3949ab', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>×{o.quantity}</span>
          <span style={{ fontSize: 11, background: o.payment_method === 'card' ? '#e8f5e9' : '#fff3e0', color: o.payment_method === 'card' ? '#388e3c' : '#e65100', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>
            {o.payment_method === 'card' ? 'カード' : '現金'}
          </span>
          {o.cancelled_at && <span style={{ fontSize: 11, background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>キャンセル済</span>}
          {o.notes && <span style={{ color: '#999', fontSize: 12 }}>{o.notes}</span>}
          <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: 11 }}>{new Date(o.created_at).toLocaleDateString('ja-JP')}</span>
        </div>
      ))}
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
