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
  hansellingItems: [{ label: '', amount: 0 }],
  optionGroups: [],
  hasSalePeriod: false, sale_start: '', sale_end: '',
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
    const src = cropSrc; const pixels = croppedAreaPixels
    setCropSrc(null); setUploading(true)
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
      URL.revokeObjectURL(src); alert('アップロードエラー: ' + e)
    } finally { setUploading(false) }
  }

  // 販管費
  function updateHansellingItem(i, key, value) {
    setForm(f => ({ ...f, hansellingItems: f.hansellingItems.map((item, idx) => idx === i ? { ...item, [key]: value } : item) }))
  }
  function addHansellingItem() { setForm(f => ({ ...f, hansellingItems: [...f.hansellingItems, { label: '', amount: 0 }] })) }
  function removeHansellingItem(i) { setForm(f => ({ ...f, hansellingItems: f.hansellingItems.filter((_, idx) => idx !== i) })) }

  // 選択肢グループ
  function addOptionGroup() { setForm(f => ({ ...f, optionGroups: [...f.optionGroups, { name: '', choices: [''], multiple: false }] })) }
  function removeOptionGroup(i) { setForm(f => ({ ...f, optionGroups: f.optionGroups.filter((_, idx) => idx !== i) })) }
  function updateOptionGroup(i, key, val) { setForm(f => ({ ...f, optionGroups: f.optionGroups.map((g, idx) => idx === i ? { ...g, [key]: val } : g) })) }
  function addGroupChoice(i) { setForm(f => ({ ...f, optionGroups: f.optionGroups.map((g, idx) => idx === i ? { ...g, choices: [...g.choices, ''] } : g) })) }
  function removeGroupChoice(i, ci) { setForm(f => ({ ...f, optionGroups: f.optionGroups.map((g, idx) => idx === i ? { ...g, choices: g.choices.filter((_, j) => j !== ci) } : g) })) }
  function updateGroupChoice(i, ci, val) { setForm(f => ({ ...f, optionGroups: f.optionGroups.map((g, idx) => idx === i ? { ...g, choices: g.choices.map((c, j) => j === ci ? val : c) } : g) })) }

  function startEdit(g) {
    setEditId(g.id)
    const optionGroups = (g.options?.type === 'groups' ? g.options.groups : []).map(gr => ({
      name: gr.name || '',
      choices: gr.choices?.length > 0 ? gr.choices : [''],
      multiple: gr.multiple || false,
    }))
    setForm({
      title: g.title || '',
      description: g.description || '',
      price: g.price || 0,
      image: g.image || '',
      payment_method: g.payment_method || 'both',
      stock: g.stock ?? -1,
      hansellingItems: g.hanselling > 0 ? [{ label: '', amount: g.hanselling }] : [{ label: '', amount: 0 }],
      optionGroups,
      hasSalePeriod: !!(g.sale_start || g.sale_end),
      sale_start: g.sale_start || '',
      sale_end: g.sale_end || '',
    })
    setExpanded(g.id)
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM) }

  async function save() {
    if (!form.title.trim()) { alert('商品名を入力してください'); return }
    setSaving(true)
    const hanselling = form.hansellingItems.reduce((s, item) => s + (Number(item.amount) || 0), 0)
    const validGroups = form.optionGroups.filter(g => g.name.trim() && g.choices.some(c => c.trim()))
    const options = validGroups.length > 0
      ? { type: 'groups', groups: validGroups.map(g => ({ type: 'manual', name: g.name, choices: g.choices.filter(c => c.trim()), multiple: g.multiple })) }
      : null
    const url = editId ? `/api/admin/goods/${editId}` : '/api/admin/goods'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, description: form.description || null,
        price: Number(form.price), stock: Number(form.stock),
        image: form.image || null, payment_method: form.payment_method,
        hanselling, options,
        sale_start: form.hasSalePeriod && form.sale_start ? form.sale_start : null,
        sale_end: form.hasSalePeriod && form.sale_end ? form.sale_end : null,
      }),
    })
    setSaving(false)
    if (!res.ok) { alert('保存失敗'); return }
    showToast(editId ? '更新しました' : '作成しました')
    setEditId(null); setForm(EMPTY_FORM); load()
  }

  async function toggleActive(g) {
    await fetch(`/api/admin/goods/${g.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...g, is_active: !g.is_active }),
    })
    load()
  }

  async function deleteGoods(g) {
    if (!confirm(`「${g.title}」を削除しますか？`)) return
    await fetch(`/api/admin/goods/${g.id}`, { method: 'DELETE' })
    showToast('削除しました'); load()
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

          {/* 基本情報 */}
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

          {/* 選択肢グループ */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={lbl}>選択肢グループ <span style={{ fontWeight: 400, color: '#bbb', fontSize: 11 }}>（カラー・サイズなど）</span></label>
              <button type="button" onClick={addOptionGroup}
                style={{ fontSize: 12, color: '#1a3560', background: 'none', border: '1px solid #1a3560', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
                + グループを追加
              </button>
            </div>
            {form.optionGroups.length === 0 && (
              <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>選択肢グループなし</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.optionGroups.map((group, i) => (
                <div key={i} style={{ background: '#f8f8fc', border: '1px solid #e0e0e0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1a3560' }}>📝 手動選択肢</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: '#666' }}>
                        <input type="checkbox" checked={group.multiple === true}
                          onChange={e => updateOptionGroup(i, 'multiple', e.target.checked)} />
                        複数選択可
                      </label>
                    </div>
                    <button type="button" onClick={() => removeOptionGroup(i)}
                      style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>
                  <input value={group.name} onChange={e => updateOptionGroup(i, 'name', e.target.value)}
                    placeholder="グループ名（例：カラー）" style={{ ...inp, marginBottom: 8 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.choices.map((choice, ci) => (
                      <div key={ci} style={{ display: 'flex', gap: 6 }}>
                        <input value={choice} onChange={e => updateGroupChoice(i, ci, e.target.value)}
                          placeholder={`選択肢 ${ci + 1}`} style={{ ...inp, flex: 1 }} />
                        {group.choices.length > 1 && (
                          <button type="button" onClick={() => removeGroupChoice(i, ci)}
                            style={{ padding: '0 10px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', color: '#e53935', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addGroupChoice(i)}
                    style={{ marginTop: 6, fontSize: 12, color: '#555', background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '3px 10px', cursor: 'pointer' }}>
                    + 選択肢を追加
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 販管費 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>販管費 <span style={{ fontWeight: 400, color: '#bbb', fontSize: 11 }}>（仕入れ・送料・手数料など）</span></label>
            {form.hansellingItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={item.label} onChange={e => updateHansellingItem(i, 'label', e.target.value)}
                  placeholder="項目名" style={{ ...inp, flex: 2 }} />
                <input type="number" min="0" value={item.amount} onChange={e => updateHansellingItem(i, 'amount', e.target.value)}
                  placeholder="0" style={{ ...inp, flex: 1 }} />
                {form.hansellingItems.length > 1 && (
                  <button type="button" onClick={() => removeHansellingItem(i)}
                    style={{ padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', color: '#e53935', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button type="button" onClick={addHansellingItem}
                style={{ fontSize: 12, color: '#1a3560', background: 'none', border: '1px solid #1a3560', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>+ 追加</button>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>
                合計 ¥{form.hansellingItems.reduce((s, item) => s + (Number(item.amount) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 販売期間 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={form.hasSalePeriod}
                onChange={e => setForm(f => ({ ...f, hasSalePeriod: e.target.checked, sale_start: '', sale_end: '' }))} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>販売期間を設定する</span>
            </label>
            {form.hasSalePeriod && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={lbl}>販売開始日（任意）</label>
                  <input type="date" value={form.sale_start}
                    onChange={e => setForm(f => ({ ...f, sale_start: e.target.value }))} style={inp} />
                </div>
                <span style={{ fontSize: 16, color: '#bbb', marginTop: 18 }}>〜</span>
                <div>
                  <label style={lbl}>販売終了日（任意）</label>
                  <input type="date" value={form.sale_end}
                    onChange={e => setForm(f => ({ ...f, sale_end: e.target.value }))} style={inp} />
                </div>
              </div>
            )}
          </div>

          {/* 画像 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>画像</label>
            {form.image && (
              <div style={{ marginBottom: 8 }}>
                <img src={form.image} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))}
                  style={{ marginLeft: 10, fontSize: 12, color: '#c62828', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current.click()} disabled={uploading}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #1a3560', background: '#fff', color: '#1a3560', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {uploading ? 'アップロード中...' : '📷 画像をアップロード'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          {isEditing && (
            <button type="button" onClick={cancelEdit}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              キャンセル
            </button>
          )}
          <button type="button" onClick={save} disabled={saving}
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
            const optionCount = g.options?.groups?.length || 0
            const today = new Date().toISOString().split('T')[0]
            const beforeStart = g.sale_start && today < g.sale_start
            const afterEnd = g.sale_end && today > g.sale_end
            return (
              <div key={g.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${g.is_active && !beforeStart && !afterEnd ? '#e5e5e5' : '#ffcdd2'}`, overflow: 'hidden', opacity: g.is_active ? 1 : 0.7 }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {g.image && <img src={g.image} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{g.title}</span>
                      {!g.is_active && <span style={{ fontSize: 11, background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>非公開</span>}
                      {beforeStart && <span style={{ fontSize: 11, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>販売前</span>}
                      {afterEnd && <span style={{ fontSize: 11, background: '#fce4ec', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>販売終了</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      ¥{g.price.toLocaleString()} ／ {payLabel} ／ {stockLabel}
                      {optionCount > 0 && <span> ／ 選択肢{optionCount}グループ</span>}
                      {g.sale_start && <span> ／ {g.sale_start}〜</span>}
                      {g.sale_end && <span>{g.sale_start ? '' : ' ／ 〜'}{g.sale_end}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#3949ab', fontWeight: 600 }}>{g.order_count}件注文</span>
                    <button type="button" onClick={() => startEdit(g)}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                      編集
                    </button>
                    <button type="button" onClick={() => setExpanded(isExp ? null : g.id)}
                      style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {isExp ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                    {g.description && <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>{g.description}</p>}
                    {optionCount > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>選択肢グループ</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {g.options.groups.map((gr, i) => (
                            <div key={i} style={{ fontSize: 12, background: '#e8eaf6', color: '#3949ab', borderRadius: 6, padding: '3px 10px' }}>
                              {gr.name}: {gr.choices.join(' / ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {g.hanselling > 0 && (
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>販管費: ¥{g.hanselling.toLocaleString()}</div>
                    )}
                    {g.order_count > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a3560', marginBottom: 8 }}>注文一覧</div>
                        <OrderList goodsId={g.id} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="button" onClick={() => toggleActive(g)}
                        style={{ fontSize: 13, padding: '6px 16px', borderRadius: 8, border: `1px solid ${g.is_active ? '#e53935' : '#388e3c'}`, background: '#fff', color: g.is_active ? '#e53935' : '#388e3c', cursor: 'pointer', fontWeight: 600 }}>
                        {g.is_active ? '非公開にする' : '公開する'}
                      </button>
                      <button type="button" onClick={() => deleteGoods(g)}
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
    fetch(`/api/admin/goods/${goodsId}`).then(r => r.json()).then(d => setOrders(d.orders || []))
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
          {o.options_selected && Object.keys(o.options_selected).length > 0 && (
            <span style={{ fontSize: 11, color: '#555', background: '#f5f5f5', borderRadius: 4, padding: '1px 7px' }}>
              {Object.entries(o.options_selected).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`).join(' | ')}
            </span>
          )}
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
