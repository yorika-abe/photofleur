'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending_approval')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    const query = supabase
      .from('model_shifts')
      .select('*, models(name, image)')
      .order('event_date', { ascending: true })

    if (filter !== 'all') query.eq('status', filter)

    const { data } = await query
    setShifts(data || [])
    setLoading(false)
  }

  async function approve(shiftId) {
    await supabase.from('model_shifts').update({ status: 'submitted' }).eq('id', shiftId)
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'submitted' } : s))
  }

  async function reject(shiftId) {
    await supabase.from('model_shifts').update({ status: 'rejected' }).eq('id', shiftId)
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'rejected' } : s))
  }

  async function updateShift(shiftId, field, value) {
    await supabase.from('model_shifts').update({ [field]: value }).eq('id', shiftId)
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, [field]: value } : s))
  }

  function formatDate(d) {
    if (!d) return ''
    const date = new Date(d + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${date.getMonth() + 1}/${date.getDate()}（${days[date.getDay()]}）`
  }

  const statusLabel = { submitted: '提出済み', confirmed: '確定', rejected: '却下', pending_approval: '承認待ち' }
  const statusColor = { submitted: { bg: '#e3f2fd', color: '#1565c0' }, confirmed: { bg: '#e8f5e9', color: '#388e3c' }, rejected: { bg: '#fce4ec', color: '#c62828' }, pending_approval: { bg: '#fff3e0', color: '#e65100' } }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>シフト管理・承認</h1>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['pending_approval', '承認待ち'], ['submitted', '提出済み'], ['confirmed', '確定'], ['rejected', '却下'], ['all', '全て']].map(([key, label]) => (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shifts.map(shift => {
            const sc = statusColor[shift.status] || statusColor.submitted
            const slots = shift.available_slots || []
            return (
              <div key={shift.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {shift.models?.image && <img src={shift.models.image} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#2f2244' }}>{shift.models?.name}</span>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                        {statusLabel[shift.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
                      {formatDate(shift.event_date)}　{shift.event_type === 'street' ? 'ストリート' : shift.event_type === 'studio' ? 'スタジオ' : '不定期'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {slots.map(s => (
                        <span key={s.start} style={{ background: '#f8f5ff', border: '1px solid #e0d5f5', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#2f2244', fontWeight: 600 }}>
                          {s.start}〜{s.end}
                        </span>
                      ))}
                    </div>
                    {shift.notes && <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{shift.notes}</p>}

                    {/* 運営による変更 */}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={shift.status} onChange={e => updateShift(shift.id, 'status', e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                        <option value="pending_approval">承認待ち</option>
                        <option value="submitted">提出済み（承認）</option>
                        <option value="confirmed">確定</option>
                        <option value="rejected">却下</option>
                      </select>
                    </div>
                  </div>

                  {shift.status === 'pending_approval' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => approve(shift.id)}
                        style={{ background: '#e8f5e9', color: '#388e3c', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        承認
                      </button>
                      <button onClick={() => reject(shift.id)}
                        style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        却下
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
