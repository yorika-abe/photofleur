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

function fmtDeadline(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}

// アクティブ選択ボタンの色: 終日/時間指定=緑, 不参加=赤
function choiceBtn(active, variant) {
  const isUnavail = variant === 'unavailable'
  return {
    fontSize: 12, padding: '4px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer',
    borderColor: active ? (isUnavail ? '#e53935' : '#43a047') : '#ddd',
    background: active ? (isUnavail ? '#fce4ec' : '#e8f5e9') : '#fff',
    color: active ? (isUnavail ? '#e53935' : '#2e7d32') : '#888',
    fontWeight: active ? 700 : 400,
  }
}

export default function ModelShiftsPage() {
  const [model, setModel] = useState(null)
  const [requestDates, setRequestDates] = useState([])
  const [myShifts, setMyShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [submitError, setSubmitError] = useState('')
  // 追加申請: { reqId: { open, from, until, allDay, notes, submitting, result } }
  const [extra, setExtra] = useState({})

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
        const isUnavailable = existing.available_slots?.[0]?.unavailable === true
        const isAllDay = !isUnavailable && existing.available_from === '00:00' && existing.available_until === '00:00'
        initForms[r.id] = {
          from: (!isAllDay && !isUnavailable) ? (existing.available_from || '09:00') : '09:00',
          until: (!isAllDay && !isUnavailable) ? (existing.available_until || '23:00') : '23:00',
          notes: existing.notes || '',
          allDay: isAllDay,
          unavailable: isUnavailable,
          submitted: true,
          shiftId: existing.id,
          locked: isDeadlinePast,
        }
      } else {
        initForms[r.id] = { from: '09:00', until: '23:00', notes: '', allDay: true, unavailable: false, submitted: false, locked: isDeadlinePast }
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
      const from = f.allDay || f.unavailable ? '00:00' : f.from
      const until = f.allDay || f.unavailable ? '00:00' : f.until
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
            unavailable: f.unavailable || false,
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

  async function submitExtra(req) {
    const e = extra[req.id] || {}
    setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitting: true, result: null } }))
    const from = e.allDay ? '00:00' : (e.from || '09:00')
    const until = e.allDay ? '00:00' : (e.until || '23:00')
    try {
      const res = await fetch('/api/model-portal/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: req.request_date,
          event_type: req.event_type,
          available_from: from,
          available_until: until,
          notes: e.notes || '',
          unavailable: false,
          status: 'pending_approval',
        }),
      })
      const data = await res.json()
      if (data?.error) {
        setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitting: false, result: 'error' } }))
      } else {
        setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitting: false, result: 'ok', open: false } }))
        await load()
      }
    } catch {
      setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitting: false, result: 'error' } }))
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const submittedCount = requestDates.filter(r => forms[r.id]?.submitted).length
  const pendingCount = requestDates.filter(r => !forms[r.id]?.submitted && !forms[r.id]?.locked).length
  const today = new Date().toISOString().split('T')[0]
  const pastShifts = myShifts.filter(s => s.event_date < today)

  // 追加申請できる日: 締め切り済み & 未提出 & 未申請
  const extraRequestDates = requestDates.filter(r => {
    const f = forms[r.id]
    return f?.locked && !f?.submitted
  })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>シフト提出</h1>
          {model && <p style={{ color: '#888', fontSize: 13, margin: 0 }}>{model.name} さんの出演可能時間を登録してください。</p>}
        </div>
        <Link href="/model-portal/shifts/history"
          style={{ fontSize: 13, color: '#0097a7', textDecoration: 'none', fontWeight: 600, background: '#e0f7fa', borderRadius: 8, padding: '7px 14px', whiteSpace: 'nowrap' }}>
          提出済み確認 →
        </Link>
      </div>

      {!model && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <p style={{ color: '#795548', margin: 0, fontSize: 13 }}>モデルアカウントが設定されていません。運営にご連絡ください。</p>
        </div>
      )}

      {submitResult === 'ok' && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#2e7d32', fontWeight: 600 }}>
          ✓ シフトを提出しました。
          <Link href="/model-portal/shifts/history" style={{ color: '#0097a7', marginLeft: 12, fontSize: 13 }}>提出内容を確認 →</Link>
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
              {submittedCount > 0 && <span style={{ color: '#0097a7', fontWeight: 600, marginRight: 8 }}>✓ {submittedCount}日提出済み</span>}
              {pendingCount > 0 && <span>未提出 {pendingCount}日</span>}
            </p>
            <button onClick={submitAll} disabled={submitting || pendingCount === 0}
              style={{ background: pendingCount === 0 ? '#ddd' : '#0097a7', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: pendingCount === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
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
                  border: f.submitted ? '2px solid #0097a7' : '1px solid #e0f0f4',
                  borderRadius: 12, padding: '12px 14px',
                  opacity: f.locked && !f.submitted ? 0.55 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: f.locked ? 0 : 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#1a1a2e' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: '#aaa' }}>（{dow}）</span>
                    <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                      {TYPE_LABELS[req.event_type] || req.event_type}
                    </span>
                    {f.submitted && (
                      <span style={{ fontSize: 11, background: '#e0f7fa', color: '#0097a7', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
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
                              opt.key
                            )}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {!f.unavailable && !f.allDay && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <input type="time" value={f.from || '09:00'} min="00:00" max="23:59"
                            onChange={e => updateForm(req.id, 'from', e.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#1a1a2e', width: 95 }} />
                          <span style={{ color: '#bbb' }}>〜</span>
                          <input type="time" value={f.until || '23:00'} min="00:00" max="23:59"
                            onChange={e => updateForm(req.id, 'until', e.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#1a1a2e', width: 95 }} />
                        </div>
                      )}
                      {!f.unavailable && (
                        <input value={f.notes || ''} onChange={e => updateForm(req.id, 'notes', e.target.value)}
                          placeholder="備考（任意）"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '4px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, color: '#555', background: '#f8f8f8' }} />
                      )}
                    </div>
                  )}

                  {f.locked && f.submitted && (
                    <div style={{ fontSize: 13, color: f.unavailable ? '#333' : '#555', marginTop: 6 }}>
                      {f.unavailable ? '不参加' : f.allDay ? '終日' : `${f.from} 〜 ${f.until}`}
                      {f.notes && <span style={{ color: '#aaa', marginLeft: 8, fontSize: 12 }}>{f.notes}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={submitAll} disabled={submitting || pendingCount === 0}
            style={{ width: '100%', background: pendingCount === 0 ? '#ddd' : '#0097a7', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', cursor: pendingCount === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: 15, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? '送信中...' : pendingCount === 0 ? 'すべて提出済みです' : `${pendingCount}日分をまとめて提出`}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link href="/model-portal/shifts/history" style={{ fontSize: 13, color: '#0097a7', fontWeight: 600 }}>
              提出済みシフトを確認・編集 →
            </Link>
          </div>

          {/* 追加申請セクション */}
          {extraRequestDates.length > 0 && (
            <div style={{ marginTop: 28, background: '#fffde7', border: '1px solid #fff176', borderRadius: 12, padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f57f17', margin: '0 0 4px' }}>シフト追加申請</p>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 14px' }}>締め切り後の参加申請です。運営の承認が必要です。</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {extraRequestDates.map(req => {
                  const { label, dow, dowIdx } = fmtDate(req.request_date)
                  const tc = TYPE_COLORS[req.event_type] || TYPE_COLORS.both
                  const ex = extra[req.id] || {}
                  return (
                    <div key={req.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #ffe082' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ex.open ? 10 : 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: dowIdx === 0 ? '#e53935' : dowIdx === 6 ? '#1565c0' : '#1a1a2e' }}>
                          {label}
                        </span>
                        <span style={{ fontSize: 12, color: '#aaa' }}>（{dow}）</span>
                        <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                          {TYPE_LABELS[req.event_type] || req.event_type}
                        </span>
                        {ex.result === 'ok' ? (
                          <span style={{ fontSize: 12, color: '#388e3c', fontWeight: 700, marginLeft: 'auto' }}>✓ 申請しました</span>
                        ) : (
                          <button onClick={() => setExtra(prev => ({ ...prev, [req.id]: { open: !ex.open, allDay: true, from: '09:00', until: '23:00', notes: '', ...prev[req.id] } }))}
                            style={{ marginLeft: 'auto', fontSize: 12, color: '#f57f17', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
                            {ex.open ? '閉じる' : '追加申請する'}
                          </button>
                        )}
                      </div>
                      {ex.open && (
                        <div>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                            {[{ key: 'allDay', label: '終日' }, { key: 'time', label: '時間指定' }].map(opt => (
                              <button key={opt.key}
                                onClick={() => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], allDay: opt.key === 'allDay' } }))}
                                style={choiceBtn(opt.key === 'allDay' ? ex.allDay !== false : ex.allDay === false, opt.key)}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {ex.allDay === false && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <input type="time" value={ex.from || '09:00'} min="00:00" max="23:59"
                                onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], from: e.target.value } }))}
                                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                              <span style={{ color: '#bbb' }}>〜</span>
                              <input type="time" value={ex.until || '23:00'} min="00:00" max="23:59"
                                onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], until: e.target.value } }))}
                                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                            </div>
                          )}
                          <input value={ex.notes || ''} onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], notes: e.target.value } }))}
                            placeholder="申請理由（任意）"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, color: '#555', background: '#fffde7', marginBottom: 8 }} />
                          <button onClick={() => submitExtra(req)} disabled={ex.submitting}
                            style={{ width: '100%', background: '#f57f17', color: '#fff', border: 'none', borderRadius: 7, padding: '8px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: ex.submitting ? 0.7 : 1 }}>
                            {ex.submitting ? '申請中...' : '追加申請を送る'}
                          </button>
                          {ex.result === 'error' && <p style={{ fontSize: 12, color: '#c62828', margin: '6px 0 0' }}>エラーが発生しました。再度お試しください。</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {pastShifts.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#bbb', letterSpacing: '0.1em', marginBottom: 8 }}>過去の提出履歴</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {pastShifts.slice(0, 10).map(shift => {
              const { label, dow, dowIdx } = fmtDate(shift.event_date)
              const isUnavailable = shift.available_slots?.[0]?.unavailable === true
              const isAllDay = !isUnavailable && shift.available_from === '00:00' && shift.available_until === '00:00'
              return (
                <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#f9f9f9', borderRadius: 8, padding: '8px 12px', opacity: 0.65 }}>
                  <span style={{ fontSize: 13, color: dowIdx === 0 ? '#e53935' : dowIdx === 6 ? '#1565c0' : '#555', fontWeight: 600 }}>
                    {label}（{dow}）
                  </span>
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    {isUnavailable ? '不参加' : isAllDay ? '終日' : `${shift.available_from}〜${shift.available_until}`}
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
