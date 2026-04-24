'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_LABELS = { street: 'ST', studio: 'Stu', both: '両方' }
const TYPE_COLORS = { street: '#0097a7', studio: '#d81b60', both: '#7c5cbf' }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    dow: DOW[d.getDay()],
    dowIdx: d.getDay(),
  }
}

function fmtDeadline(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}


export default function ModelShiftsPage() {
  const [model, setModel] = useState(null)
  const [requestDates, setRequestDates] = useState([])
  const [myShifts, setMyShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null) // 'ok' | 'error'
  const [submitError, setSubmitError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login?redirect=/model-portal/shifts'; return }

    const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', user.id).single()
    const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
    if (!roles.includes('model')) { window.location.href = '/'; return }

    const { data: modelData } = await supabase.from('models').select('*').eq('user_id', user.id).single()
    setModel(modelData)

    const [reqRes, shiftRes] = await Promise.all([
      fetch('/api/admin/shift-requests'),
      fetch('/api/model-portal/shifts'),
    ])
    const reqData = await reqRes.json()
    const shiftData = await shiftRes.json()

    const today = new Date().toISOString().split('T')[0]
    const futureReqs = (Array.isArray(reqData) ? reqData : []).filter(r => r.request_date >= today)
    const shifts = Array.isArray(shiftData) ? shiftData : []

    setRequestDates(futureReqs)
    setMyShifts(shifts)

    const initForms = {}
    futureReqs.forEach(r => {
      const existing = shifts.find(s => s.event_date === r.request_date)
      const isDeadlinePast = r.deadline && r.deadline < today

      if (existing) {
        const isAllDay = existing.available_from === '00:00' && existing.available_until === '00:00'
        initForms[r.id] = {
          from: isAllDay ? '09:00' : (existing.available_from || '09:00'),
          until: isAllDay ? '23:00' : (existing.available_until || '23:00'),
          notes: existing.notes || '',
          allDay: isAllDay,
          submitted: true,
          shiftId: existing.id,
          locked: isDeadlinePast,
        }
      } else {
        initForms[r.id] = { from: '09:00', until: '23:00', notes: '', allDay: true, submitted: false, locked: isDeadlinePast }
      }
    })
    setForms(initForms)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateForm(id, key, value) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  async function submitAll() {
    const targets = requestDates.filter(r => forms[r.id] && !forms[r.id]?.locked)
    if (targets.length === 0) return
    setSubmitting(true)
    setSubmitResult(null)
    setSubmitError('')

    const errors = []
    for (const req of targets) {
      const f = forms[req.id]
      const from = f.allDay ? '00:00' : f.from
      const until = f.allDay ? '00:00' : f.until
      try {
        const res = await fetch('/api/model-portal/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_date: req.request_date,
            event_type: req.event_type,
            available_from: from,
            available_until: until,
            notes: f.notes,
          }),
        })
        const data = await res.json()
        if (data?.error) errors.push(data.error)
      } catch (e) {
        errors.push(e.message)
      }
    }

    setSubmitting(false)
    if (errors.length > 0) {
      setSubmitResult('error')
      setSubmitError(errors[0])
    } else {
      setSubmitResult('ok')
    }
    await load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const submittedCount = requestDates.filter(r => forms[r.id]?.submitted).length
  const pendingCount = requestDates.filter(r => !forms[r.id]?.submitted && !forms[r.id]?.locked).length
  const today = new Date().toISOString().split('T')[0]
  const pastShifts = myShifts.filter(s => s.event_date < today)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', marginBottom: 4 }}>シフト提出</h1>
          {model && <p style={{ color: '#888', fontSize: 13, margin: 0 }}>{model.name} さんの出演可能時間を登録してください。</p>}
        </div>
        <Link href="/model-portal/shifts/history"
          style={{ fontSize: 13, color: '#7c5cbf', textDecoration: 'none', fontWeight: 600, background: '#ede7f6', borderRadius: 8, padding: '7px 14px', whiteSpace: 'nowrap' }}>
          提出済み確認 →
        </Link>
      </div>

      {!model && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <p style={{ color: '#795548', margin: 0, fontSize: 13 }}>モデルアカウントが設定されていません。運営にご連絡ください。</p>
        </div>
      )}

      {/* 提出結果フィードバック */}
      {submitResult === 'ok' && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#2e7d32', fontWeight: 600 }}>
          ✓ シフトを提出しました。
          <Link href="/model-portal/shifts/history" style={{ color: '#7c5cbf', marginLeft: 12, fontSize: 13 }}>提出内容を確認 →</Link>
        </div>
      )}
      {submitResult === 'error' && (
        <div style={{ background: '#fce4ec', border: '1px solid #f48fb1', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#c62828' }}>
          送信エラー: {submitError || '再度お試しください。'}
        </div>
      )}

      {model && requestDates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb', background: '#fafafa', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <p style={{ margin: 0, fontSize: 14 }}>現在、シフト提出の依頼はありません</p>
        </div>
      )}

      {model && requestDates.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
              {submittedCount > 0 && <span style={{ color: '#7c5cbf', fontWeight: 600, marginRight: 8 }}>✓ {submittedCount}日提出済み</span>}
              {pendingCount > 0 && <span>未提出 {pendingCount}日</span>}
            </p>
            <button onClick={submitAll} disabled={submitting || pendingCount === 0}
              style={{ background: pendingCount === 0 ? '#ddd' : '#7c5cbf', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: pendingCount === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? '送信中...' : 'まとめて提出'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {requestDates.map(req => {
              const f = forms[req.id] || {}
              const { label, dow, dowIdx } = fmtDate(req.request_date)
              const isWeekend = dowIdx === 0 || dowIdx === 6
              const tc = TYPE_COLORS[req.event_type] || TYPE_COLORS.both

              return (
                <div key={req.id} style={{
                  background: '#fff',
                  border: f.submitted ? '2px solid #7c5cbf' : '1px solid #e8e0f5',
                  borderRadius: 12, padding: '12px 14px',
                  opacity: f.locked ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: f.locked ? 0 : 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#2f2244' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: '#aaa' }}>（{dow}）</span>
                    <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                      {TYPE_LABELS[req.event_type] || req.event_type}
                    </span>

                    {f.submitted && (
                      <span style={{ fontSize: 11, background: '#ede7f6', color: '#7c5cbf', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                        ✓ 提出済み
                      </span>
                    )}
                    {req.deadline && (
                      <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>
                        〆{fmtDeadline(req.deadline)}
                      </span>
                    )}
                    {f.locked && (
                      <span style={{ fontSize: 11, color: '#e53935', fontWeight: 600 }}>締め切り済み</span>
                    )}
                  </div>

                  {!f.locked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: '#555', userSelect: 'none' }}>
                        <input type="checkbox" checked={!!f.allDay} onChange={e => updateForm(req.id, 'allDay', e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#7c5cbf', cursor: 'pointer' }} />
                        終日
                      </label>

                      {!f.allDay && (
                        <>
                          <input type="time" value={f.from || '09:00'} min="00:00" max="23:59"
                            onChange={e => updateForm(req.id, 'from', e.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 95 }} />
                          <span style={{ color: '#bbb' }}>〜</span>
                          <input type="time" value={f.until || '23:00'} min="00:00" max="23:59"
                            onChange={e => updateForm(req.id, 'until', e.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 95 }} />
                        </>
                      )}

                      <input value={f.notes || ''} onChange={e => updateForm(req.id, 'notes', e.target.value)}
                        placeholder="備考（任意）"
                        style={{ flex: 1, minWidth: 100, padding: '4px 10px', border: '1px solid #ede8f5', borderRadius: 6, fontSize: 12, color: '#666', background: '#faf8ff' }} />
                    </div>
                  )}

                  {f.locked && f.submitted && (
                    <div style={{ fontSize: 12, color: '#7c5cbf', marginTop: 4 }}>
                      {forms[req.id]?.allDay ? '終日' : `${forms[req.id]?.from} 〜 ${forms[req.id]?.until}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={submitAll} disabled={submitting || pendingCount === 0}
            style={{ width: '100%', background: pendingCount === 0 ? '#ddd' : '#7c5cbf', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', cursor: pendingCount === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: 15, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? '送信中...' : pendingCount === 0 ? 'すべて提出済みです' : `${pendingCount}日分をまとめて提出`}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link href="/model-portal/shifts/history" style={{ fontSize: 13, color: '#7c5cbf', fontWeight: 600 }}>
              提出済みシフトを確認・編集 →
            </Link>
          </div>
        </>
      )}

      {pastShifts.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#bbb', letterSpacing: '0.1em', marginBottom: 8 }}>過去の提出履歴</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {pastShifts.slice(0, 10).map(shift => {
              const { label, dow, dowIdx } = fmtDate(shift.event_date)
              const isAllDay = shift.available_from === '00:00' && shift.available_until === '00:00'
              return (
                <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#f9f9f9', borderRadius: 8, padding: '8px 12px', opacity: 0.65 }}>
                  <span style={{ fontSize: 13, color: dowIdx === 0 ? '#e53935' : dowIdx === 6 ? '#1565c0' : '#555', fontWeight: 600 }}>
                    {label}（{dow}）
                  </span>
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    {isAllDay ? '終日' : `${shift.available_from}〜${shift.available_until}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
