'use client'

import { useState } from 'react'
import Link from 'next/link'

const PERIOD_LABELS = { monthly: '/月', yearly: '/年' }

function toMonthly(amount, period) {
  return period === 'yearly' ? Math.round(amount / 12) : amount
}

export default function FixedCostsClient({ initialCosts, isOwner }) {
  const [costs, setCosts] = useState(initialCosts)
  const [form, setForm] = useState({ name: '', amount: '', period: 'monthly', note: '' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const monthlyTotal = costs.reduce((sum, c) => sum + toMonthly(c.amount, c.period), 0)

  function openNew() {
    setForm({ name: '', amount: '', period: 'monthly', note: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({ name: c.name, amount: String(c.amount), period: c.period, note: c.note || '' })
    setEditingId(c.id)
    setShowForm(true)
  }

  async function save() {
    if (!form.name || !form.amount) return
    setSaving(true)
    const body = { name: form.name, amount: parseInt(form.amount), period: form.period, note: form.note || null }
    if (editingId) {
      const res = await fetch('/api/admin/fixed-costs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...body }),
      })
      const data = await res.json()
      if (data.cost) setCosts(prev => prev.map(c => c.id === editingId ? data.cost : c))
    } else {
      const res = await fetch('/api/admin/fixed-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.cost) setCosts(prev => [...prev, data.cost])
    }
    setSaving(false)
    setShowForm(false)
  }

  async function deleteCost(id, name) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch('/api/admin/fixed-costs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCosts(prev => prev.filter(c => c.id !== id))
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: 0 }}>固定費管理</h1>
        {isOwner && (
          <button onClick={openNew}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            + 追加
          </button>
        )}
      </div>

      {/* 月合計カード */}
      <div style={{ background: '#1a3560', borderRadius: 14, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>月間固定費 合計（/年は÷12で換算）</div>
        <div style={{ fontSize: 32, fontWeight: 700 }}>
          ¥{monthlyTotal.toLocaleString()}
          <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>/月</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>年間換算: ¥{(monthlyTotal * 12).toLocaleString()}</div>
      </div>

      {/* 追加・編集フォーム */}
      {showForm && isOwner && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', margin: '0 0 16px' }}>
            {editingId ? '固定費を編集' : '固定費を追加'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>名前</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例：Vercel Pro、Supabase、Resend" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>金額（円）</label>
                <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>サイクル</label>
                <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  style={{ ...inp, cursor: 'pointer' }}>
                  <option value="monthly">/月（月額）</option>
                  <option value="yearly">/年（年額）</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>メモ（任意）</label>
              <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="例：無料枠超過時のみ、更新月は3月" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={save} disabled={saving || !form.name || !form.amount}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: saving || !form.name || !form.amount ? '#ccc' : '#1a3560', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一覧 */}
      {costs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#bbb', padding: 40, fontSize: 14 }}>
          {isOwner ? '「+ 追加」から固定費を登録してください' : '固定費はまだ登録されていません'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {costs.map(c => {
            const monthly = toMonthly(c.amount, c.period)
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{c.name}</span>
                    <span style={{ background: c.period === 'yearly' ? '#fef3c7' : '#e0f2fe', color: c.period === 'yearly' ? '#92400e' : '#0369a1', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>
                      {PERIOD_LABELS[c.period]}
                    </span>
                  </div>
                  {c.note && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{c.note}</div>}
                  <div style={{ fontSize: 14, color: '#333' }}>
                    ¥{c.amount.toLocaleString()}{PERIOD_LABELS[c.period]}
                    {c.period === 'yearly' && (
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>（月換算: ¥{monthly.toLocaleString()}）</span>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(c)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      編集
                    </button>
                    <button onClick={() => deleteCost(c.id, c.name)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#fce4ec', color: '#c62828', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      削除
                    </button>
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
