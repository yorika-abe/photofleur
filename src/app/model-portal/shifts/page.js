'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_LABELS = { street: 'ST', studio: 'Stu', both: '両方' }
const TYPE_COLORS = { street: '#0097a7', studio: '#d81b60', both: '#555' }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return { label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`, dow: DOW[d.getDay()], dowIdx: d.getDay() }
}

function fmtDeadline(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}

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
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [savingId, setSavingId] = useState(null)

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
          editing: false,
        }
      } else {
        initForms[r.id] = { from: '09:00', until: '23:00', notes: '', allDay: true, unavailable: false, submitted: false, locked: isDeadlinePast, editing: false }
      }
    })
    setForms(initForms)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateForm(id, key, value) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  async function submitSingle(req) {
    setSavingId(req.id)
    const f = forms[req.id]
    const from = f.allDay || f.unavailable ? '00:00' : f.from
    const until = f.allDay || f.unavailable ? '00:00' : f.until
    await fetch('/api/model-portal/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_date: req.request_date, event_type: req.event_type, available_from: from, available_until: until, notes: f.notes, unavailable: f.unavailable || false }),
    })
    setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitted: true, editing: false } }))
    setSavingId(null)
  }

  async function submitAll() {
    const targets = requestDates.filter(r => forms[r.id] && !forms[r.id]?.locked && !forms[r.id]?.submitted)
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
          body: JSON.stringify({ event_date: req.request_date, event_type: req.event_type, available_from: from, available_until: until, notes: f.notes, unavailable: f.unavailable || false }),
        })
        const data = await res.json()
        if (data?.error) errors.push(data.error)
      } catch (e) { errors.push(e.message) }
    }
    setSubmitting(false)
    if (errors.length > 0) { setSubmitResult('error'); setSubmitError(errors[0]) }
    else setSubmitResult('ok')
    await load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const submittedCount = requestDates.filter(r => forms[r.id]?.submitted).length
  const pendingCount = requestDates.filter(r => !forms[r.id]?.submitted && !forms[r.id]?.locked).length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>シフト提出</h1>
          {model && <p style={{ color: '#888', fontSize: 13, margin: 0 }}>{model.name} さんの出演可能時間を登録してください。</p>}
        </div>
        <Link href="/model-portal/shifts/extra"
          style={{ fontSize: 13, color: '#0097a7', textDecoration: 'none', fontWeight: 600, background: '#e0f7fa', borderRadius: 8, padding: '7px 14px', whiteSpace: 'nowrap' }}>
          追加エントリー・変更申請 →
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
              const isEditing = !f.submitted || f.editing
              const isSaving = savingId === req.id

              // Summary text for submitted/locked
              const summaryText = f.unavailable ? '不参加' : f.allDay ? '終日' : `${f.from} 〜 ${f.until}`

              return (
                <div key={req.id} style={{
                  background: '#fff',
                  border: f.submitted && !f.editing ? '2px solid #1a1a2e' : '1px solid #bbb',
                  borderRadius: 12, padding: '12px 14px',
                  opacity: f.locked && !f.submitted ? 0.55 : 1,
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                      <span style={{ fontSize: 11, color: f.locked ? '#e53935' : '#bbb', marginLeft: 'auto', fontWeight: f.locked ? 600 : 400 }}>
                        〆{fmtDeadline(req.deadline)}{f.locked ? '　締め切り済み' : ''}
                      </span>
                    )}
                  </div>

                  {/* 提出済み・非編集モード */}
                  {f.submitted && !f.editing && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 14, color: f.unavailable ? '#e53935' : '#333', fontWeight: 600 }}>
                        {summaryText}
                        {f.notes && <span style={{ color: '#aaa', marginLeft: 8, fontSize: 12, fontWeight: 400 }}>{f.notes}</span>}
                      </span>
                      {!f.locked && (
                        <button onClick={() => setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], editing: true } }))}
                          style={{ fontSize: 12, padding: '4px 14px', borderRadius: 6, border: '1px solid #0097a7', background: '#e0f7fa', color: '#0097a7', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>
                          変更
                        </button>
                      )}
                    </div>
                  )}

                  {/* 未提出 or 編集モード */}
                  {isEditing && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {[
                          { key: 'allDay', label: '終日' },
                          { key: 'time', label: '時間指定' },
                          { key: 'unavailable', label: '不参加' },
                        ].map(opt => (
                          <button key={opt.key} onClick={() => {
                            if (opt.key === 'unavailable') setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], unavailable: true, allDay: false } }))
                            else if (opt.key === 'allDay') setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], unavailable: false, allDay: true } }))
                            else setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], unavailable: false, allDay: false } }))
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
                          style={{ width: '100%', boxSizing: 'border-box', padding: '4px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, color: '#555', background: '#f8f8f8', marginBottom: 8 }} />
                      )}

                      {/* 編集モード時：保存・キャンセルボタン */}
                      {f.editing && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button onClick={() => submitSingle(req)} disabled={isSaving}
                            style={{ background: '#0097a7', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving ? '保存中...' : '保存する'}
                          </button>
                          <button onClick={() => setForms(prev => ({ ...prev, [req.id]: { ...prev[req.id], editing: false } }))}
                            style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 7, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            キャンセル
                          </button>
                        </div>
                      )}
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
        </>
      )}
    </div>
  )
}
