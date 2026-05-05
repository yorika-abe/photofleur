'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_LABELS = { street: 'ST', studio: 'Stu', both: '両方' }
const TYPE_COLORS = { street: '#0097a7', studio: '#d81b60', both: '#555' }
const STATUS_LABELS = { submitted: '提出済み', confirmed: '確定', rejected: '却下', pending_approval: '承認待ち' }
const STATUS_COLORS = {
  submitted: { bg: '#e0f7fa', color: '#00838f' },
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

function ShiftRow({ shift, requestDates, today, editing, setEditing, saving, setSaving, savedResult, setSavedResult, onSaved }) {
  const { label, dow, dowIdx } = fmtDate(shift.event_date)
  const isWeekend = dowIdx === 0 || dowIdx === 6
  const tc = TYPE_COLORS[shift.event_type] || TYPE_COLORS.both
  const sc = STATUS_COLORS[shift.status] || STATUS_COLORS.submitted
  const unavail = shift.available_slots?.[0]?.unavailable === true
  const isAllDay = !unavail && shift.available_from === '00:00' && shift.available_until === '00:00'
  const req = requestDates.find(r => r.request_date === shift.event_date)
  const deadline = req?.deadline || null
  const editable = deadline ? deadline >= today : shift.event_date >= today
  const isEditingThis = !!editing[shift.id]
  const e = editing[shift.id] || {}

  function startEdit() {
    const isAllD = !unavail && shift.available_from === '00:00' && shift.available_until === '00:00'
    setEditing(prev => ({
      ...prev,
      [shift.id]: {
        from: (!isAllD && !unavail) ? (shift.available_from || '09:00') : '09:00',
        until: (!isAllD && !unavail) ? (shift.available_until || '23:00') : '23:00',
        notes: shift.notes || '',
        allDay: isAllD,
        unavailable: unavail,
      }
    }))
    setSavedResult(prev => ({ ...prev, [shift.id]: null }))
  }

  async function saveEdit() {
    setSaving(prev => ({ ...prev, [shift.id]: true }))
    const from = e.unavailable || e.allDay ? '00:00' : e.from
    const until = e.unavailable || e.allDay ? '00:00' : e.until
    const res = await fetch('/api/model-portal/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_date: shift.event_date, event_type: shift.event_type,
        available_from: from, available_until: until,
        notes: e.notes, unavailable: e.unavailable || false,
      }),
    })
    const data = await res.json()
    setSaving(prev => ({ ...prev, [shift.id]: false }))
    if (data?.error) {
      setSavedResult(prev => ({ ...prev, [shift.id]: 'error' }))
    } else {
      setSavedResult(prev => ({ ...prev, [shift.id]: 'ok' }))
      setEditing(prev => { const n = { ...prev }; delete n[shift.id]; return n })
      onSaved()
    }
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0f0f4', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isEditingThis ? 12 : 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#1a1a2e' }}>
          {label}
        </span>
        <span style={{ fontSize: 12, color: '#aaa' }}>（{dow}）</span>
        <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
          {TYPE_LABELS[shift.event_type] || shift.event_type}
        </span>
        <span style={{ fontSize: 11, background: sc.bg, color: sc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
          {STATUS_LABELS[shift.status] || shift.status}
        </span>
        {deadline && <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>〆{deadline}</span>}
      </div>

      {!isEditingThis && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
              {unavail ? '不参加' : isAllDay ? '終日' : `${shift.available_from} 〜 ${shift.available_until}`}
            </span>
            {shift.notes && <p style={{ fontSize: 12, color: '#888', margin: '3px 0 0' }}>{shift.notes}</p>}
          </div>
          {editable && (
            <button onClick={startEdit}
              style={{ fontSize: 12, color: '#0097a7', background: '#e0f7fa', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
                if (opt.key === 'unavailable') setEditing(p => ({ ...p, [shift.id]: { ...p[shift.id], unavailable: true, allDay: false } }))
                else if (opt.key === 'allDay') setEditing(p => ({ ...p, [shift.id]: { ...p[shift.id], unavailable: false, allDay: true } }))
                else setEditing(p => ({ ...p, [shift.id]: { ...p[shift.id], unavailable: false, allDay: false } }))
              }}
                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', borderColor: opt.active ? (opt.key === 'unavailable' ? '#e53935' : '#43a047') : '#ddd', background: opt.active ? (opt.key === 'unavailable' ? '#fce4ec' : '#e8f5e9') : '#fff', color: opt.active ? (opt.key === 'unavailable' ? '#e53935' : '#2e7d32') : '#888', fontWeight: opt.active ? 700 : 400 }}>
                {opt.label}
              </button>
            ))}
          </div>
          {!e.unavailable && !e.allDay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="time" value={e.from || '09:00'} onChange={ev => setEditing(p => ({ ...p, [shift.id]: { ...p[shift.id], from: ev.target.value } }))}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 95 }} />
              <span style={{ color: '#bbb' }}>〜</span>
              <input type="time" value={e.until || '23:00'} onChange={ev => setEditing(p => ({ ...p, [shift.id]: { ...p[shift.id], until: ev.target.value } }))}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 95 }} />
            </div>
          )}
          {!e.unavailable && (
            <input value={e.notes || ''} onChange={ev => setEditing(p => ({ ...p, [shift.id]: { ...p[shift.id], notes: ev.target.value } }))}
              placeholder="備考（任意）"
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, color: '#555', background: '#f8f8f8', marginBottom: 8 }} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEdit} disabled={saving[shift.id]}
              style={{ flex: 1, background: '#0097a7', color: '#fff', border: 'none', borderRadius: 7, padding: '8px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving[shift.id] ? 0.7 : 1 }}>
              {saving[shift.id] ? '保存中...' : '保存'}
            </button>
            <button onClick={() => setEditing(p => { const n = { ...p }; delete n[shift.id]; return n })}
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
}

export default function ShiftHistoryPage() {
  const [shifts, setShifts] = useState([])
  const [requestDates, setRequestDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({})
  const [saving, setSaving] = useState({})
  const [savedResult, setSavedResult] = useState({})
  const [expandedMonths, setExpandedMonths] = useState({}) // 'YYYY-MM' -> boolean

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

  // 3ヶ月ウィンドウ（先月1日〜来月末）
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0]

  // 日付昇順ソート
  const sorted = [...shifts].sort((a, b) => a.event_date.localeCompare(b.event_date))

  const inWindow = sorted.filter(s => s.event_date >= windowStart && s.event_date <= windowEnd)
  const older = sorted.filter(s => s.event_date < windowStart)

  // 古いものを月ごとにグループ化
  const olderByMonth = {}
  for (const s of older) {
    const ym = s.event_date.slice(0, 7) // 'YYYY-MM'
    if (!olderByMonth[ym]) olderByMonth[ym] = []
    olderByMonth[ym].push(s)
  }
  const olderMonths = Object.keys(olderByMonth).sort().reverse() // 新しい月順

  function monthLabel(ym) {
    const [y, m] = ym.split('-')
    return `${y}年${parseInt(m)}月`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e5e5' }}>
        {[
          { key: 'submit', label: 'シフト提出', href: '/model-portal/shifts' },
          { key: 'extra', label: '追加・変更申請', href: '/model-portal/shifts/extra' },
          { key: 'history', label: '提出履歴', href: '/model-portal/shifts/history' },
        ].map(tab => tab.key === 'history' ? (
          <div key={tab.key} style={{ padding: '10px 18px', fontWeight: 700, fontSize: 14, color: '#1a1a2e', borderBottom: '2px solid #1a1a2e', marginBottom: -2, cursor: 'default' }}>{tab.label}</div>
        ) : (
          <Link key={tab.key} href={tab.href} style={{ padding: '10px 18px', fontWeight: 600, fontSize: 14, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>{tab.label}</Link>
        ))}
      </div>

      {shifts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb', background: '#fafafa', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={{ margin: 0, fontSize: 14 }}>提出履歴はありません</p>
        </div>
      )}

      {/* 3ヶ月ウィンドウ内のシフト */}
      {inWindow.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {inWindow.map(shift => (
            <ShiftRow key={shift.id} shift={shift} requestDates={requestDates} today={today}
              editing={editing} setEditing={setEditing}
              saving={saving} setSaving={setSaving}
              savedResult={savedResult} setSavedResult={setSavedResult}
              onSaved={load} />
          ))}
        </div>
      )}

      {/* 3ヶ月より前のシフト（月ごとにまとめ） */}
      {olderMonths.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {olderMonths.map(ym => {
            const isOpen = !!expandedMonths[ym]
            const monthShifts = olderByMonth[ym]
            return (
              <div key={ym} style={{ background: '#fff', border: '1px solid #e0f0f4', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#555', flex: 1 }}>
                    {monthLabel(ym)}の提出シフト（{monthShifts.length}件）
                  </span>
                  {isOpen ? (
                    <button onClick={() => setExpandedMonths(p => ({ ...p, [ym]: false }))}
                      style={{ fontSize: 12, color: '#888', background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
                      まとめる
                    </button>
                  ) : (
                    <button onClick={() => setExpandedMonths(p => ({ ...p, [ym]: true }))}
                      style={{ fontSize: 12, color: '#0097a7', background: '#e0f7fa', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
                      確認する
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {monthShifts.map(shift => (
                      <ShiftRow key={shift.id} shift={shift} requestDates={requestDates} today={today}
                        editing={editing} setEditing={setEditing}
                        saving={saving} setSaving={setSaving}
                        savedResult={savedResult} setSavedResult={setSavedResult}
                        onSaved={load} />
                    ))}
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
