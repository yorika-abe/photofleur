'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const STATUS_LABELS = { submitted: '提出済み', confirmed: '確定', rejected: '却下', pending_approval: '承認待ち' }
const STATUS_COLORS = {
  submitted:        { bg: '#e3f2fd', color: '#1565c0' },
  confirmed:        { bg: '#e8f5e9', color: '#388e3c' },
  rejected:         { bg: '#fce4ec', color: '#c62828' },
  pending_approval: { bg: '#ffebee', color: '#c62828' },
}
const DOW = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return `${date.getMonth() + 1}/${date.getDate()}（${DOW[date.getDay()]}）`
}

function availabilityType(shift) {
  if (shift.available_slots?.[0]?.unavailable === true) return 'unavailable'
  const isAllDay = shift.available_from === '00:00' && shift.available_until === '00:00'
  return isAllDay ? 'allday' : 'partial'
}

const AVAILABILITY_SORT = { allday: 0, partial: 1, unavailable: 2 }

const AVAILABILITY_ICON = { allday: '🟢', partial: '🟢⚠️', unavailable: '❌' }

function availabilityLabel(shift) {
  const type = availabilityType(shift)
  if (type === 'unavailable') return '不参加'
  if (type === 'allday') return '終日参加可'
  return `${shift.available_from} 〜 ${shift.available_until}`
}

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending_approval')
  const [updating, setUpdating] = useState({})
  const [modelFilter, setModelFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/shifts?status=${filter}`)
    const data = await res.json()
    setShifts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); setModelFilter(''); setDateFilter('') }, [filter])

  async function updateStatus(shiftId, status) {
    setUpdating(prev => ({ ...prev, [shiftId]: true }))
    const res = await fetch('/api/admin/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: shiftId, status }),
    })
    const data = await res.json()
    setUpdating(prev => ({ ...prev, [shiftId]: false }))
    if (data?.error) {
      alert('更新に失敗しました: ' + data.error)
    } else {
      await load()
    }
  }

  const filters = [
    ['pending_approval', '承認待ち'],
    ['submitted', '提出済み'],
    ['rejected', '却下'],
    ['ended', '開催終了'],
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a1a2e', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '8px 0 24px', borderBottom: '2px solid #e5e5e5' }}>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#1a1a2e', borderBottom: '2px solid #1a1a2e', marginBottom: -2, cursor: 'default' }}>シフト承認</div>
        <Link href="/admin/shift-requests" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>シフト指定日管理</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filters.map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '2px solid', borderColor: filter === key ? '#0097a7' : '#ddd', background: filter === key ? '#0097a7' : '#fff', color: filter === key ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      {(filter === 'submitted' || filter === 'ended') && !loading && shifts.length > 0 && (() => {
        const models = [...new Map(shifts.map(s => [s.models?.name, s.models?.name])).entries()].map(([v]) => v).filter(Boolean).sort()
        const dates = [...new Set(shifts.map(s => s.event_date).filter(Boolean))].sort()
        const sel = { padding: '7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff' }
        return (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} style={sel}>
              <option value="">モデル：すべて</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={sel}>
              <option value="">日付：すべて</option>
              {dates.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </div>
        )
      })()}

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : shifts.length === 0 ? (
        <p style={{ color: '#999' }}>該当するシフトはありません。</p>
      ) : (() => {
        const displayed = shifts
          .filter(s =>
            (!modelFilter || s.models?.name === modelFilter) &&
            (!dateFilter || s.event_date === dateFilter)
          )
          .sort((a, b) => AVAILABILITY_SORT[availabilityType(a)] - AVAILABILITY_SORT[availabilityType(b)])
        return displayed.length === 0 ? (
          <p style={{ color: '#999' }}>該当するシフトはありません。</p>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(shift => {
            const sc = STATUS_COLORS[shift.status] || STATUS_COLORS.submitted
            const isPending = shift.status === 'pending_approval'
            const isUpdating = !!updating[shift.id]
            const avType = availabilityType(shift)
            const isUnavailable = avType === 'unavailable'
            return (
              <div key={shift.id} style={{ background: isUnavailable ? '#f5f5f5' : '#fff', borderRadius: 12, padding: '14px 18px', border: isPending ? '1.5px solid #ef9a9a' : '1px solid #e5e5e5', opacity: isUnavailable ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      {shift.models?.image && (
                        <Image src={shift.models.image} alt="" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{shift.models?.name}</span>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                        {STATUS_LABELS[shift.status]}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>
                      {formatDate(shift.event_date)}
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                        {shift.event_type === 'street' ? 'ストリート' : shift.event_type === 'studio' ? 'スタジオ' : '不定期'}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: isUnavailable ? '#999' : '#333', fontWeight: 600, marginBottom: 6 }}>
                      {AVAILABILITY_ICON[avType]} {availabilityLabel(shift)}
                    </div>

                    {shift.notes && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{shift.notes}</p>}
                  </div>

                  {filter !== 'ended' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {isPending ? (
                        <>
                          <button onClick={() => updateStatus(shift.id, 'submitted')} disabled={isUpdating}
                            style={{ padding: '7px 18px', background: '#0097a7', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isUpdating ? 0.6 : 1 }}>
                            {isUpdating ? '処理中...' : '承認する'}
                          </button>
                          <button onClick={() => updateStatus(shift.id, 'rejected')} disabled={isUpdating}
                            style={{ padding: '7px 14px', background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isUpdating ? 0.6 : 1 }}>
                            却下
                          </button>
                        </>
                      ) : (
                        <select value={shift.status} onChange={e => updateStatus(shift.id, e.target.value)} disabled={isUpdating}
                          style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: isUpdating ? 0.6 : 1 }}>
                          <option value="submitted">提出済み</option>
                          <option value="pending_approval">承認待ち</option>
                          <option value="rejected">却下</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )
      })()}
    </div>
  )
}
