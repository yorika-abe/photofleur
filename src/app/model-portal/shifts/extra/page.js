'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_LABELS = { street: 'ST', studio: 'Stu', both: '両方' }
const TYPE_COLORS = { street: '#0097a7', studio: '#d81b60', both: '#555' }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    dow: DOW[d.getDay()],
    dowIdx: d.getDay(),
  }
}

function choiceBtn(active, isUnavail) {
  return {
    fontSize: 12, padding: '4px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer',
    borderColor: active ? (isUnavail ? '#e53935' : '#43a047') : '#ddd',
    background: active ? (isUnavail ? '#fce4ec' : '#e8f5e9') : '#fff',
    color: active ? (isUnavail ? '#e53935' : '#2e7d32') : '#888',
    fontWeight: active ? 700 : 400,
  }
}

export default function ExtraEntryPage() {
  const [dates, setDates] = useState([]) // { req, existing | null }
  const [forms, setForms] = useState({})
  const [open, setOpen] = useState({})
  const [submitting, setSubmitting] = useState({})
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login?redirect=/model-portal/shifts/extra'; return }

    const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', user.id).single()
    const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
    if (!roles.includes('model')) { window.location.href = '/'; return }

    const today = new Date().toISOString().split('T')[0]
    const [shiftRes, reqRes] = await Promise.all([
      fetch('/api/model-portal/shifts'),
      fetch('/api/admin/shift-requests'),
    ])
    const shiftData = await shiftRes.json()
    const reqData = await reqRes.json()

    const allShifts = Array.isArray(shiftData) ? shiftData : []
    // 締め切り済みの未来日程を全て取得（提出済み・未提出問わず）
    const deadlinePastReqs = (Array.isArray(reqData) ? reqData : []).filter(r =>
      r.request_date >= today && r.deadline && r.deadline < today
    )

    const combined = deadlinePastReqs.map(req => ({
      req,
      existing: allShifts.find(s => s.event_date === req.request_date) || null,
    }))
    setDates(combined)

    // フォーム初期値
    const initForms = {}
    combined.forEach(({ req, existing }) => {
      if (existing) {
        const isUnavail = existing.available_slots?.[0]?.unavailable === true
        const isAllDay = !isUnavail && existing.available_from === '00:00' && existing.available_until === '00:00'
        initForms[req.id] = {
          allDay: isAllDay,
          unavailable: isUnavail,
          from: (!isAllDay && !isUnavail) ? (existing.available_from || '09:00') : '09:00',
          until: (!isAllDay && !isUnavail) ? (existing.available_until || '23:00') : '23:00',
          notes: existing.notes || '',
        }
      } else {
        initForms[req.id] = { allDay: true, unavailable: false, from: '09:00', until: '23:00', notes: '' }
      }
    })
    setForms(initForms)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateForm(id, key, value) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  async function submit(req) {
    const f = forms[req.id]
    if (!f) return
    setSubmitting(prev => ({ ...prev, [req.id]: true }))
    const from = f.allDay || f.unavailable ? '00:00' : f.from
    const until = f.allDay || f.unavailable ? '00:00' : f.until
    const res = await fetch('/api/model-portal/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_date: req.request_date,
        event_type: req.event_type,
        available_from: from,
        available_until: until,
        notes: f.notes || '',
        unavailable: f.unavailable || false,
        status: 'pending_approval',
      }),
    })
    const data = await res.json()
    setSubmitting(prev => ({ ...prev, [req.id]: false }))
    setResults(prev => ({ ...prev, [req.id]: data?.error ? 'error' : 'ok' }))
    if (!data?.error) {
      setOpen(prev => ({ ...prev, [req.id]: false }))
      await load()
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/model-portal" style={{ fontSize: 13, color: '#0097a7', textDecoration: 'none' }}>← ポータルトップ</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '8px 0 4px' }}>追加エントリー・変更申請</h1>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>締め切り後の参加申請・内容変更です。承認が必要です。</p>
      </div>

      {dates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb', background: '#fafafa', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <p style={{ margin: 0, fontSize: 14 }}>現在、申請できる日程はありません</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dates.map(({ req, existing }) => {
          const { label, dow, dowIdx } = fmtDate(req.request_date)
          const isWeekend = dowIdx === 0 || dowIdx === 6
          const tc = TYPE_COLORS[req.event_type] || '#555'
          const f = forms[req.id] || {}
          const isOpen = !!open[req.id]
          const isPending = existing?.status === 'pending_approval'

          return (
            <div key={req.id} style={{
              background: '#fff', borderRadius: 12, padding: '14px 16px',
              border: isPending ? '1.5px solid #ffe082' : '1px solid #e0f0f4',
            }}>
              {/* ヘッダー行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: isOpen ? 12 : (existing ? 8 : 0) }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#1a1a2e' }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, color: '#aaa' }}>（{dow}）</span>
                <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                  {TYPE_LABELS[req.event_type] || req.event_type}
                </span>
                {isPending && (
                  <span style={{ fontSize: 11, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                    承認待ち
                  </span>
                )}
                {results[req.id] === 'ok' && (
                  <span style={{ fontSize: 12, color: '#388e3c', fontWeight: 700 }}>✓ 申請しました</span>
                )}
                <button
                  onClick={() => setOpen(prev => ({ ...prev, [req.id]: !prev[req.id] }))}
                  style={{ marginLeft: 'auto', fontSize: 12, color: '#0097a7', background: '#e0f7fa', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 700 }}>
                  {isOpen ? '閉じる' : existing ? '変更申請 →' : '申請する →'}
                </button>
              </div>

              {/* 現在の提出内容（提出済みの場合） */}
              {!isOpen && existing && (
                <div style={{ fontSize: 13, color: '#555', background: '#f8f8f8', borderRadius: 6, padding: '6px 10px' }}>
                  <span style={{ color: '#888', fontSize: 11, marginRight: 6 }}>現在の申請：</span>
                  {existing.available_slots?.[0]?.unavailable
                    ? '不参加'
                    : (existing.available_from === '00:00' && existing.available_until === '00:00')
                      ? '終日'
                      : `${existing.available_from} 〜 ${existing.available_until}`
                  }
                  {existing.notes && <span style={{ color: '#aaa', marginLeft: 8, fontSize: 12 }}>{existing.notes}</span>}
                </div>
              )}

              {/* 編集フォーム */}
              {isOpen && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {[
                      { key: 'allDay', label: '終日' },
                      { key: 'time', label: '時間指定' },
                      { key: 'unavailable', label: '不参加' },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => {
                        if (opt.key === 'unavailable') {
                          setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], unavailable: true, allDay: false } }))
                        } else if (opt.key === 'allDay') {
                          setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], unavailable: false, allDay: true } }))
                        } else {
                          setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], unavailable: false, allDay: false } }))
                        }
                      }}
                        style={choiceBtn(
                          opt.key === 'unavailable' ? f.unavailable : opt.key === 'allDay' ? (!f.unavailable && f.allDay) : (!f.unavailable && !f.allDay),
                          opt.key === 'unavailable'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {!f.unavailable && !f.allDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input type="time" value={f.from || '09:00'} min="00:00" max="23:59"
                        onChange={e => updateForm(req.id, 'from', e.target.value)}
                        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                      <span style={{ color: '#bbb' }}>〜</span>
                      <input type="time" value={f.until || '23:00'} min="00:00" max="23:59"
                        onChange={e => updateForm(req.id, 'until', e.target.value)}
                        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                    </div>
                  )}
                  {!f.unavailable && (
                    <input value={f.notes || ''} onChange={e => updateForm(req.id, 'notes', e.target.value)}
                      placeholder="備考・申請理由（任意）"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '5px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, color: '#555', background: '#f8f8f8', marginBottom: 8 }} />
                  )}
                  <button disabled={submitting[req.id]} onClick={() => submit(req)}
                    style={{ width: '100%', background: '#f57f17', color: '#fff', border: 'none', borderRadius: 7, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: submitting[req.id] ? 0.7 : 1 }}>
                    {submitting[req.id] ? '申請中...' : existing ? '変更申請を送る' : '追加申請を送る'}
                  </button>
                  {results[req.id] === 'error' && (
                    <p style={{ fontSize: 12, color: '#c62828', margin: '6px 0 0' }}>エラーが発生しました。再度お試しください。</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
