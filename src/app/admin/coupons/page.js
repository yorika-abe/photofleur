'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '', discount_type: 'fixed', discount_value: '', max_uses: '', valid_from: '', valid_until: '', description: '', is_active: true,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }

  async function create(e) {
    e.preventDefault()
    if (!form.code || !form.discount_value) return
    setSaving(true)

    const { error } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      description: form.description || null,
      is_active: form.is_active,
    })

    if (error) { alert('エラー: ' + error.message) }
    else {
      setShowForm(false)
      setForm({ code: '', discount_type: 'fixed', discount_value: '', max_uses: '', valid_from: '', valid_until: '', description: '', is_active: true })
      load()
    }
    setSaving(false)
  }

  async function toggleActive(coupon) {
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id)
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function deleteCoupon(id) {
    if (!confirm('このクーポンを削除しますか？')) return
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>クーポン管理</h1>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {showForm ? 'キャンセル' : '+ 新規作成'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '2px solid #2f2244', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginTop: 0, marginBottom: 20 }}>新規クーポン作成</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>クーポンコード <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SUMMER2025" required />
              <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>※ 自動で大文字変換されます</p>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>割引種類 <span style={{ color: 'red' }}>*</span></label>
              <select style={inp} value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                <option value="fixed">固定額割引（円）</option>
                <option value="percent">割合割引（%）</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
                割引{form.discount_type === 'fixed' ? '額（円）' : '率（%）'} <span style={{ color: 'red' }}>*</span>
              </label>
              <input type="number" style={inp} value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'fixed' ? '500' : '10'} required min="1" max={form.discount_type === 'percent' ? '100' : undefined} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>最大使用回数（空白=無制限）</label>
              <input type="number" style={inp} value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="100" min="1" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>有効開始日（任意）</label>
              <input type="datetime-local" style={inp} value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>有効期限（任意）</label>
              <input type="datetime-local" style={inp} value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>メモ・説明（任意）</label>
            <input style={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="初回参加者向けなど" />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            作成後すぐに有効化する
          </label>

          <button type="submit" disabled={saving}
            style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {saving ? '作成中...' : 'クーポンを作成'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : coupons.length === 0 ? (
        <p style={{ color: '#999' }}>クーポンはありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coupons.map(c => {
            const usagePercent = c.max_uses ? Math.round((c.used_count / c.max_uses) * 100) : null
            const isExpired = c.valid_until && new Date(c.valid_until) < new Date()
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', opacity: (!c.is_active || isExpired) ? 0.65 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#2f2244', background: '#f8f5ff', padding: '3px 12px', borderRadius: 6 }}>{c.code}</span>
                      <span style={{ background: c.discount_type === 'fixed' ? '#e8f5e9' : '#e8eaf6', color: c.discount_type === 'fixed' ? '#388e3c' : '#3949ab', borderRadius: 4, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>
                        {c.discount_type === 'fixed' ? `¥${c.discount_value.toLocaleString()} OFF` : `${c.discount_value}% OFF`}
                      </span>
                      {!c.is_active && <span style={{ background: '#f5f5f5', color: '#999', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>無効</span>}
                      {isExpired && <span style={{ background: '#fce4ec', color: '#c62828', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>期限切れ</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#777', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>使用: {c.used_count || 0}{c.max_uses ? `/${c.max_uses}回` : '回'}</span>
                      {usagePercent !== null && <span>({usagePercent}%)</span>}
                      {c.valid_until && <span>期限: {new Date(c.valid_until).toLocaleDateString('ja-JP')}</span>}
                      {c.description && <span>📝 {c.description}</span>}
                    </div>
                    {c.max_uses && (
                      <div style={{ marginTop: 8, height: 4, background: '#f0f0f0', borderRadius: 2, width: 200, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, usagePercent)}%`, height: '100%', background: usagePercent >= 90 ? '#c62828' : '#388e3c', borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleActive(c)}
                      style={{ background: c.is_active ? '#fff3e0' : '#e8f5e9', color: c.is_active ? '#e65100' : '#388e3c', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {c.is_active ? '無効化' : '有効化'}
                    </button>
                    <button onClick={() => deleteCoupon(c.id)}
                      style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      削除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
