'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_LABELS = { street: 'ST', studio: 'Stu', both: '両方' }
const TYPE_COLORS = { street: '#0097a7', studio: '#d81b60', both: '#7c5cbf' }
const STATUS_LABELS = { submitted: '提出済み', confirmed: '確定', rejected: '却下', pending_approval: '承認待ち' }
const STATUS_COLORS = {
  submitted: { bg: '#ede7f6', color: '#7c5cbf' },
  confirmed: { bg: '#e8f5e9', color: '#388e3c' },
  rejected: { bg: '#fce4ec', color: '#c62828' },
  pending_approval: { bg: '#fff3e0', color: '#e65100' },
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    dow: DOW[d.getDay()],
    dowIdx: d.getDay(),
  }
}

export default function ShiftHistoryPage() {
  const [shifts, setShifts] = useState([])
  const [requestDates, setRequestDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({}) // shiftId -> { from, until, notes, allDay }
  const [saving, setSaving] = useState({})
  const [savedResult, setSavedResult] = useState({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login?redirect=/model-portal/shifts/history'; return }

    const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', user.id).single()
    const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
    if (!roles.includes('model')) { window.location.href = '/'; return }

    const [shiftRes, reqRes] = await Promise.all([
      fetch('/api/model-portal/shifts'),
      fetch('/api/admin/shift-requests'),
    ])
    const shiftData = await shiftRes.json()
    const reqData = await reqRes.json()

    setShifts(Array.isArray(shiftData) ? shiftData : [])
    setRequestDates(Array.isArray(reqData) ? reqData : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]

  function getDeadline(shift) {
    const req = requestDates.find(r => r.request_date === shift.event_date)
    return req?.deadline || null
  }

  function isEditable(shift) {
    const deadline = getDeadline(shift)
    if (!deadline) return shift.event_date >= today
    return deadline >= today
  }

  function isUnavailable(shift) {
    return shift.available_slots?.[0]?.unavailable === true
  }

  function startEdit(shift) {
    const unavail = isUnavailable(shift)
    const isAllDay = !unavail && shift.available_from === '00:00' && shift.available_until === '00:00'
    setEditing(prev => ({
      ...prev,
      [shift.id]: {
        from: (!isAllDay && !unavail) ? (shift.available_from || '09:00') : '09:00',
        until: (!isAllDay && !unavail) ? (shift.available_until || '23:00') : '23:00',
        notes: shift.notes || '',
        allDay: isAllDay,
        unavailable: unavail,
      }
    }))
    setSavedResult(prev => ({ ...prev, [shift.id]: null }))
  }

  function cancelEdit(shiftId) {
    setEditing(prev => { const n = { ...prev }; delete n[shiftId]; return n })
  }

  function updateEdit(shiftId, key, value) {
    setEditing(prev => ({ ...prev, [shiftId]: { ...prev[shiftId], [key]: value } }))
  }

  async function saveEdit(shift) {
    const e = editing[shift.id]
    if (!e) return
    setSaving(prev => ({ ...prev, [shift.id]: true }))

    const from = e.unavailable || e.allDay ? '00:00' : e.from
    const until = e.unavailable || e.allDay ? '00:00' : e.until

    const res = await fetch('/api/model-portal/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_date: shift.event_date,
        event_type: shift.event_type,
        available_from: from,
        available_until: until,
        notes: e.notes,
        unavailable: e.unavailable || false,
      }),
    })
    const data = await res.json()
    setSaving(prev => ({ ...prev, [shift.id]: false }))

    if (data?.error) {
      setSavedResult(prev => ({ ...prev, [shift.id]: 'error' }))
    } else {
      setSavedResult(prev => ({ ...prev, [shift.id]: 'ok' }))
      cancelEdit(shift.id)
      await load()
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const futureShifts = shifts.filter(s => s.event_date >= today)
  const pastShifts = shifts.filter(s => s.event_date < today)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Link href="/model-portal/shifts" style={{ fontSize: 13, color: '#7c5cbf', textDecoration: 'none' }}>← シフト提出</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', marginBottom: 4, marginTop: 6 }}>提出済みシフト</h1>
        </div>
      </div>

      {shifts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb', background: '#fafafa', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={{ margin: 0, fontSize: 14 }}>提出済みのシフトはありません</p>
        </div>
      )}

      {futureShifts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#7c5cbf', letterSpacing: '0.1em', marginBottom: 10 }}>今後の予定</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {futureShifts.map(shift => {
              const { label, dow, dowIdx } = fmtDate(shift.event_date)
              const isWeekend = dowIdx === 0 || dowIdx === 6
              const tc = TYPE_COLORS[shift.event_type] || TYPE_COLORS.both
              const sc = STATUS_COLORS[shift.status] || STATUS_COLORS.submitted
              const unavail = isUnavailable(shift)
              const isAllDay = !unavail && shift.available_from === '00:00' && shift.available_until === '00:00'
              const deadline = getDeadline(shift)
              const editable = isEditable(shift)
              const isEditingThis = !!editing[shift.id]
              const e = editing[shift.id] || {}

              return (
                <div key={shift.id} style={{
                  background: '#fff',
                  border: '1.5px solid #e8e0f5',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isEditingThis ? 12 : 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#2f2244' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: '#aaa' }}>（{dow}）</span>
                    <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                      {TYPE_LABELS[shift.event_type] || shift.event_type}
                    </span>
                    <span style={{ fontSize: 11, background: sc.bg, color: sc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                      {STATUS_LABELS[shift.status] || shift.status}
                    </span>
                    {deadline && (
                      <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>
                        〆{deadline}
                      </span>
                    )}
                  </div>

                  {!isEditingThis && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: unavail ? '#e53935' : '#7c5cbf' }}>
                          {unavail ? '不参加' : isAllDay ? '終日' : `${shift.available_from} 〜 ${shift.available_until}`}
                        </span>
                        {shift.notes && (
                          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{shift.notes}</p>
                        )}
                      </div>
                      {editable && (
                        <button onClick={() => startEdit(shift)}
                          style={{ fontSize: 12, color: '#7c5cbf', background: '#ede7f6', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          変更
                        </button>
                      )}
                    </div>
                  )}

                  {isEditingThis && (
                    <div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {[
                          { key: 'allDay', label: '終日', active: !e.unavailable && e.allDay },
                          { key: 'time', label: '時間指定', active: !e.unavailable && !e.allDay },
                          { key: 'unavailable', label: '不参加', active: e.unavailable },
                        ].map(opt => (
                          <button key={opt.key} onClick={() => {
                            if (opt.key === 'unavailable') {
                              setEditing(prev => ({ ...prev, [shift.id]: { ...prev[shift.id], unavailable: true, allDay: false } }))
                            } else if (opt.key === 'allDay') {
                              setEditing(prev => ({ ...prev, [shift.id]: { ...prev[shift.id], unavailable: false, allDay: true } }))
                            } else {
                              setEditing(prev => ({ ...prev, [shift.id]: { ...prev[shift.id], unavailable: false, allDay: false } }))
                            }
                          }}
                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1.5px solid', borderColor: opt.active ? (opt.key === 'unavailable' ? '#e53935' : '#7c5cbf') : '#ddd', background: opt.active ? (opt.key === 'unavailable' ? '#fce4ec' : '#ede7f6') : '#fff', color: opt.active ? (opt.key === 'unavailable' ? '#e53935' : '#7c5cbf') : '#888', fontWeight: opt.active ? 700 : 400, cursor: 'pointer' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {!e.unavailable && !e.allDay && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <input type="time" value={e.from || '09:00'} min="00:00" max="23:59"
                            onChange={ev => updateEdit(shift.id, 'from', ev.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 95 }} />
                          <span style={{ color: '#bbb' }}>〜</span>
                          <input type="time" value={e.until || '23:00'} min="00:00" max="23:59"
                            onChange={ev => updateEdit(shift.id, 'until', ev.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 95 }} />
                        </div>
                      )}
                      {!e.unavailable && (
                      <input value={e.notes || ''} onChange={ev => updateEdit(shift.id, 'notes', ev.target.value)}
                        placeholder="備考（任意）"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', border: '1px solid #ede8f5', borderRadius: 6, fontSize: 12, color: '#666', background: '#faf8ff', marginBottom: 8 }} />
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(shift)} disabled={saving[shift.id]}
                          style={{ flex: 1, background: '#7c5cbf', color: '#fff', border: 'none', borderRadius: 7, padding: '8px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving[shift.id] ? 0.7 : 1 }}>
                          {saving[shift.id] ? '保存中...' : '保存'}
                        </button>
                        <button onClick={() => cancelEdit(shift.id)}
                          style={{ padding: '8px 16px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                          キャンセル
                        </button>
                      </div>
                      {savedResult[shift.id] === 'error' && (
                        <p style={{ fontSize: 12, color: '#c62828', margin: '6px 0 0' }}>保存に失敗しました。もう一度お試しください。</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pastShifts.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#bbb', letterSpacing: '0.1em', marginBottom: 10 }}>過去の提出履歴</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pastShifts.map(shift => {
              const { label, dow, dowIdx } = fmtDate(shift.event_date)
              const unavail = isUnavailable(shift)
              const isAllDay = !unavail && shift.available_from === '00:00' && shift.available_until === '00:00'
              const sc = STATUS_COLORS[shift.status] || STATUS_COLORS.submitted
              return (
                <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9', borderRadius: 8, padding: '9px 14px', opacity: 0.65 }}>
                  <span style={{ fontSize: 13, color: dowIdx === 0 ? '#e53935' : dowIdx === 6 ? '#1565c0' : '#555', fontWeight: 600 }}>
                    {label}（{dow}）
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: unavail ? '#e53935' : '#aaa' }}>
                      {unavail ? '不参加' : isAllDay ? '終日' : `${shift.available_from}〜${shift.available_until}`}
                    </span>
                    <span style={{ fontSize: 11, background: sc.bg, color: sc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                      {STATUS_LABELS[shift.status] || shift.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
