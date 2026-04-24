'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STATUS_LABELS = { submitted: '提出済み', confirmed: '確定', rejected: '却下', pending_approval: '承認待ち' }
const STATUS_COLORS = {
  submitted:        { bg: '#e3f2fd', color: '#1565c0' },
  confirmed:        { bg: '#e8f5e9', color: '#388e3c' },
  rejected:         { bg: '#fce4ec', color: '#c62828' },
  pending_approval: { bg: '#fff3e0', color: '#e65100' },
}
const DOW = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return `${date.getMonth() + 1}/${date.getDate()}（${DOW[date.getDay()]}）`
}

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('submitted')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/shifts?status=${filter}`)
    const data = await res.json()
    setShifts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function updateStatus(shiftId, status) {
    await fetch('/api/admin/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: shiftId, status }),
    })
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status } : s))
  }

  const filters = [
    ['submitted', '提出済み'],
    ['confirmed', '確定'],
    ['pending_approval', '承認待ち'],
    ['rejected', '却下'],
    ['all', '全て'],
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>シフト管理・承認</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filters.map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '2px solid', borderColor: filter === key ? '#2f2244' : '#ddd', background: filter === key ? '#2f2244' : '#fff', color: filter === key ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : shifts.length === 0 ? (
        <p style={{ color: '#999' }}>該当するシフトはありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shifts.map(shift => {
            const sc = STATUS_COLORS[shift.status] || STATUS_COLORS.submitted
            const isAllDay = shift.available_from === '00:00' && shift.available_until === '00:00'
            return (
              <div key={shift.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      {shift.models?.image && (
                        <img src={shift.models.image} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      )}
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#2f2244' }}>{shift.models?.name}</span>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                        {STATUS_LABELS[shift.status]}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>
                      {formatDate(shift.event_date)}
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                        {shift.event_type === 'street' ? 'ストリート' : shift.event_type === 'studio' ? 'スタジオ' : '両方'}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#7c5cbf', fontWeight: 600, marginBottom: 6 }}>
                      {isAllDay ? '終日参加可' : `${shift.available_from} 〜 ${shift.available_until}`}
                    </div>

                    {shift.notes && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{shift.notes}</p>}
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <select value={shift.status} onChange={e => updateStatus(shift.id, e.target.value)}
                      style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                      <option value="submitted">提出済み</option>
                      <option value="confirmed">確定</option>
                      <option value="pending_approval">承認待ち</option>
                      <option value="rejected">却下</option>
                    </select>
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
