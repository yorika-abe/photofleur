'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '')
}

export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', slug: '', memo: '' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)
  const dragIdx = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/blog/categories')
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) { alert('カテゴリー名を入力してください'); return }
    setSaving(true)
    const slug = form.slug || slugify(form.name)
    if (editId) {
      const cat = categories.find(c => c.id === editId)
      await fetch('/api/admin/blog/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, name: form.name, slug, memo: form.memo, display_order: cat?.display_order ?? 0 }) })
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order ?? 0)) + 1 : 0
      await fetch('/api/admin/blog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, slug, memo: form.memo, display_order: maxOrder }) })
    }
    setForm({ name: '', slug: '', memo: '' })
    setEditId(null)
    setSaving(false)
    await load()
  }

  async function remove(id) {
    if (!confirm('このカテゴリーを削除しますか？')) return
    await fetch('/api/admin/blog/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  function startEdit(cat) {
    setEditId(cat.id)
    setForm({ name: cat.name, slug: cat.slug, memo: cat.memo || '' })
  }

  function onDragStart(i) { dragIdx.current = i }
  function onDragOver(e, i) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    setCategories(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx.current, 1)
      next.splice(i, 0, moved)
      dragIdx.current = i
      return next
    })
  }
  async function onDrop() {
    dragIdx.current = null
    setReordering(true)
    await Promise.all(
      categories.map((cat, i) =>
        fetch('/api/admin/blog/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cat.id, display_order: i }),
        })
      )
    )
    setReordering(false)
    await load()
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin/blog" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← ブログ管理</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '8px 0 24px' }}>カテゴリー管理</h1>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5', marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', margin: '0 0 16px' }}>{editId ? 'カテゴリーを編集' : '新規カテゴリー追加'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>カテゴリー名</label>
            <input style={inp} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
              placeholder="ロケーションレポート" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>スラッグ</label>
            <input style={inp} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="location-report" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#888' }}>メモ（管理画面のみ表示）</label>
          <textarea style={{ ...inp, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} value={form.memo}
            onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
            placeholder="このカテゴリーについてのメモを入力..." />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={save} disabled={saving}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? '保存中...' : editId ? '更新' : '追加'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ name: '', slug: '' }) }}
              style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, cursor: 'pointer' }}>
              キャンセル
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : categories.length === 0 ? (
        <p style={{ color: '#999' }}>カテゴリーがありません。</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
            ↕ ドラッグ＆ドロップで並び替え可能{reordering ? '　保存中...' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat, i) => (
              <div key={cat.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOver(e, i)}
                onDrop={onDrop}
                style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 12, cursor: 'grab', userSelect: 'none' }}>
                <div style={{ color: '#ccc', fontSize: 18, flexShrink: 0 }}>⠿</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>/{cat.slug}</div>
                  {cat.memo && <div style={{ fontSize: 12, color: '#999', marginTop: 3, background: '#fffde7', borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>📝 {cat.memo}</div>}
                </div>
                <button onClick={() => startEdit(cat)}
                  style={{ background: '#f0f4fb', color: '#1a3560', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  編集
                </button>
                <button onClick={() => remove(cat.id)}
                  style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                  削除
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
