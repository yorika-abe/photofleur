'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${date.getMonth() + 1}/${date.getDate()}（${days[date.getDay()]}）`
}

export default function AdminSchedulePage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ event_date: '', event_type: 'street', title: '', location_name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/events')
    const data = await res.json()
    if (!Array.isArray(data)) {
      setLoadError(data.error || JSON.stringify(data))
      setEvents([])
    } else {
      setEvents(data)
    }
    setLoading(false)
  }

  async function createEvent(e) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_date: form.event_date,
        event_type: form.event_type,
        title: form.title || null,
        location_name: form.location_name,
        status: 'draft',
      }),
    })
    const data = await res.json()
    if (data.error) { alert('エラー: ' + data.error); setSaving(false); return }
    window.location.href = `/admin/schedule/${data.id}`
    setSaving(false)
  }

  async function toggleStatus(ev) {
    const newStatus = ev.status === 'active' ? 'draft' : 'active'
    await fetch('/api/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ev.id, status: newStatus }),
    })
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: newStatus } : e))
  }

  async function deleteEvent(id) {
    if (!confirm('このイベントを削除しますか？関連する予約枠・予約も削除されます。')) return
    await fetch('/api/admin/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const inp = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>スケジュール管理</h1>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {showForm ? 'キャンセル' : '+ 新規作成'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createEvent} style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '2px solid #2f2244', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginBottom: 18 }}>新規イベント作成</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>開催日 *</label>
              <input type="date" required value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>種類 *</label>
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} style={inp}>
                <option value="street">ストリート</option>
                <option value="studio">スタジオ</option>
                <option value="irregular">不定期</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>タイトル（例：ドレス撮影会）</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="ドレス撮影会" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>場所名 *</label>
            <input type="text" required value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} style={inp} placeholder="Studio gallery-o15＆16" />
          </div>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>作成後に詳細設定・モデル追加・予約枠設定ができます</p>
          <button type="submit" disabled={saving}
            style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {saving ? '作成中...' : 'イベントを作成して編集へ'}
          </button>
        </form>
      )}

      {loadError && <div style={{ background: '#fce4ec', border: '1px solid #ef9a9a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#c62828' }}>エラー: {loadError}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.length === 0 && !loadError ? <p style={{ color: '#999' }}>イベントはありません。</p> : events.map(ev => {
          const models = ev.event_entries?.map(e => e.models).filter(Boolean) || []
          const typeLabel = ev.event_type === 'street' ? 'ストリート' : ev.event_type === 'studio' ? 'スタジオ' : '不定期'
          const typeColor = ev.event_type === 'street' ? { bg: '#e0f7fa', color: '#0097a7' } : ev.event_type === 'studio' ? { bg: '#fce4ec', color: '#c2185b' } : { bg: '#e8eaf6', color: '#1a3560' }
          const isActive = ev.status === 'active'
          const isPast = ev.event_date < new Date().toISOString().split('T')[0]

          return (
            <div key={ev.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', opacity: isPast ? 0.75 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: typeColor.bg, color: typeColor.color, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{typeLabel}</span>
                    {isPast ? (
                      <span style={{ background: '#eeeeee', color: '#777', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>開催終了</span>
                    ) : (
                      <span style={{ background: isActive ? '#e8f5e9' : '#f5f5f5', color: isActive ? '#388e3c' : '#999', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                        {isActive ? '表示中' : '非表示'}
                      </span>
                    )}
                    <span style={{ fontWeight: 700, fontSize: 17, color: '#2f2244' }}>{formatDate(ev.event_date)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{ev.title || ev.location_name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ev.location_name}</div>
                  {models.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {models.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8f5ff', borderRadius: 20, padding: '3px 10px 3px 4px' }}>
                          {m.image && <img src={m.image} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />}
                          <span style={{ fontSize: 12, color: '#2f2244', fontWeight: 600 }}>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleStatus(ev)}
                    style={{ background: isActive ? '#fff3e0' : '#e8f5e9', color: isActive ? '#e65100' : '#388e3c', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {isActive ? '非表示にする' : '表示する'}
                  </button>
                  <Link href={`/admin/schedule/${ev.id}`}
                    style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                    編集
                  </Link>
                  <button onClick={() => deleteEvent(ev.id)}
                    style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    削除
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
