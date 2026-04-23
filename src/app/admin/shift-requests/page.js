'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const EVENT_TYPE_LABELS = {
  street: 'ストリート',
  studio: 'スタジオ',
  both: '両方',
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${days[d.getDay()]}）`
}

export default function ShiftRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    request_date: '',
    event_type: 'both',
    notes: '',
    deadline: '',
  })

  async function load() {
    const res = await fetch('/api/admin/shift-requests')
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!form.request_date) return
    setSaving(true)
    const res = await fetch('/api/admin/shift-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { alert('エラー: ' + data.error); return }
    setForm({ request_date: '', event_type: 'both', notes: '', deadline: '' })
    setShowForm(false)
    load()
  }

  async function deleteRequest(id) {
    if (!confirm('この日付を削除しますか？')) return
    await fetch('/api/admin/shift-requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 32px' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: 0 }}>シフト提出指定日の管理</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '6px 0 0' }}>モデルにシフト提出を求める日付を登録します</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {showForm ? 'キャンセル' : '+ 日付を追加'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ background: '#fff', border: '2px solid #1a3560', borderRadius: 14, padding: '28px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>シフト提出日を追加</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>指定日 *</label>
              <input type="date" required style={inp} value={form.request_date}
                onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>撮影種別</label>
              <select style={inp} value={form.event_type}
                onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                <option value="both">両方（ストリート・スタジオ）</option>
                <option value="street">ストリートのみ</option>
                <option value="studio">スタジオのみ</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>シフト提出締め切り日</label>
            <input type="date" style={inp} value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>メモ（モデルへの連絡事項など）</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="衣装の指定や注意事項があれば" />
          </div>
          <button type="submit" disabled={saving}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', cursor: 'pointer', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '追加する'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>読み込み中...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p>まだシフト指定日が登録されていません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => {
            const isPast = r.request_date < new Date().toISOString().split('T')[0]
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: isPast ? 0.6 : 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 17, color: '#1a3560' }}>{formatDate(r.request_date)}</span>
                    <span style={{ fontSize: 11, background: '#e8f0fb', color: '#1a3560', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                      {EVENT_TYPE_LABELS[r.event_type] || r.event_type}
                    </span>
                    {isPast && <span style={{ fontSize: 11, color: '#bbb' }}>（過去）</span>}
                  </div>
                  {r.deadline && (
                    <div style={{ fontSize: 12, color: '#888' }}>締め切り：{formatDate(r.deadline)}</div>
                  )}
                  {r.notes && (
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{r.notes}</div>
                  )}
                </div>
                <button onClick={() => deleteRequest(r.id)}
                  style={{ background: 'none', border: '1px solid #e5e5e5', color: '#e53935', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  削除
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
