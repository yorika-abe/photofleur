'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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

function slotPreview(from, until) {
  if (!from || !until || (from === '00:00' && until === '00:00')) return '終日'
  const slots = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
  const fromMin = +from.split(':')[0] * 60 + +from.split(':')[1]
  const untilMin = +until.split(':')[0] * 60 + +until.split(':')[1]
  const active = slots.filter(s => +s.split(':')[0] * 60 >= fromMin && (+s.split(':')[0] + 1) * 60 <= untilMin)
  return active.length === 0 ? '対象枠なし' : active[0] + '〜' + active[active.length - 1].replace(':00', '') + ':00'
}

export default function ModelShiftsPage() {
  const [model, setModel] = useState(null)
  const [requestDates, setRequestDates] = useState([])
  const [myShifts, setMyShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({})
  const [submitting, setSubmitting] = useState(false)

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

    setRequestDates(futureReqs)
    setMyShifts(Array.isArray(shiftData) ? shiftData : [])

    const initForms = {}
    futureReqs.forEach(r => {
      const existing = (Array.isArray(shiftData) ? shiftData : []).find(s => s.event_date === r.request_date)
      if (existing) {
        const isAllDay = existing.available_from === '00:00' && existing.available_until === '00:00'
        initForms[r.id] = {
          from: isAllDay ? '09:00' : (existing.available_from || '09:00'),
          until: isAllDay ? '23:00' : (existing.available_until || '23:00'),
          notes: existing.notes || '',
          allDay: isAllDay,
          submitted: true,
          shiftId: existing.id,
        }
      } else {
        initForms[r.id] = { from: '09:00', until: '23:00', notes: '', allDay: true, submitted: false }
      }
    })
    setForms(initForms)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateForm(id, key, value) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  // まとめて提出
  async function submitAll() {
    const targets = requestDates.filter(r => forms[r.id])
    if (targets.length === 0) return
    setSubmitting(true)

    for (const req of targets) {
      const f = forms[req.id]
      const from = f.allDay ? '00:00' : f.from
      const until = f.allDay ? '00:00' : f.until
      await fetch('/api/model-portal/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_date_id: req.id,
          event_date: req.request_date,
          event_type: req.event_type,
          available_from: from,
          available_until: until,
          notes: f.notes,
        }),
      })
    }
    setSubmitting(false)
    await load()
    alert('シフトを提出しました')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const pendingCount = requestDates.filter(r => !forms[r.id]?.submitted).length
  const pastShifts = myShifts.filter(s => s.event_date < new Date().toISOString().split('T')[0])

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', marginBottom: 4 }}>シフト提出</h1>
      {model && <p style={{ color: '#888', marginBottom: 24, fontSize: 13 }}>{model.name} さんの出演可能時間を登録してください。</p>}

      {!model && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <p style={{ color: '#795548', margin: 0, fontSize: 13 }}>モデルアカウントが設定されていません。運営にご連絡ください。</p>
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
          {/* まとめて提出ボタン（上） */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
              {pendingCount > 0 ? `未提出 ${pendingCount}日` : 'すべて提出済み'}
            </p>
            <button
              onClick={submitAll}
              disabled={submitting}
              style={{ background: '#7c5cbf', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? '送信中...' : 'まとめて提出・更新'}
            </button>
          </div>

          {/* 日程リスト */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {requestDates.map(req => {
              const f = forms[req.id] || {}
              const { label, dow, dowIdx } = fmtDate(req.request_date)
              const isWeekend = dowIdx === 0 || dowIdx === 6
              const tc = TYPE_COLORS[req.event_type] || TYPE_COLORS.both
              const isDeadlinePast = req.deadline && req.deadline < new Date().toISOString().split('T')[0]
              const preview = f.allDay ? '終日' : slotPreview(f.from, f.until)

              return (
                <div key={req.id} style={{ background: '#fff', border: f.submitted ? '2px solid #7c5cbf' : '1px solid #e8e0f5', borderRadius: 12, padding: '14px 16px' }}>
                  {/* 1行目：日付・種別・ステータス */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#2f2244' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: isWeekend ? (dowIdx === 0 ? '#e53935' : '#1565c0') : '#888' }}>（{dow}）</span>
                    <span style={{ fontSize: 11, background: `${tc}22`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                      {TYPE_LABELS[req.event_type] || req.event_type}
                    </span>
                    {req.deadline && (
                      <span style={{ fontSize: 11, color: isDeadlinePast ? '#e53935' : '#aaa', marginLeft: 'auto' }}>
                        〆{fmtDeadline(req.deadline)}
                      </span>
                    )}
                    {f.submitted && (
                      <span style={{ fontSize: 11, background: '#ede7f6', color: '#7c5cbf', borderRadius: 4, padding: '2px 7px', fontWeight: 700, marginLeft: f.deadline ? 0 : 'auto' }}>✓ 提出済</span>
                    )}
                  </div>

                  {/* 2行目：時間設定 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* 終日トグル */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#555', userSelect: 'none' }}>
                      <input type="checkbox" checked={!!f.allDay} onChange={e => updateForm(req.id, 'allDay', e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: '#7c5cbf', cursor: 'pointer' }} />
                      終日
                    </label>

                    {!f.allDay && (
                      <>
                        <input type="time" value={f.from || '09:00'} min="00:00" max="23:00"
                          onChange={e => updateForm(req.id, 'from', e.target.value)}
                          style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 100 }} />
                        <span style={{ color: '#bbb' }}>〜</span>
                        <input type="time" value={f.until || '23:00'} min="00:00" max="23:59"
                          onChange={e => updateForm(req.id, 'until', e.target.value)}
                          style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#2f2244', width: 100 }} />
                      </>
                    )}

                    <span style={{ fontSize: 11, color: '#9575cd', background: '#f3e5f5', borderRadius: 5, padding: '3px 8px' }}>
                      {preview}
                    </span>

                    {/* 備考（折りたたみ式） */}
                    <input
                      value={f.notes || ''}
                      onChange={e => updateForm(req.id, 'notes', e.target.value)}
                      placeholder="備考（任意）"
                      style={{ flex: 1, minWidth: 120, padding: '5px 10px', border: '1px solid #ede8f5', borderRadius: 6, fontSize: 12, color: '#666', background: '#faf8ff' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* まとめて提出ボタン（下） */}
          <button
            onClick={submitAll}
            disabled={submitting}
            style={{ width: '100%', background: '#7c5cbf', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', cursor: 'pointer', fontWeight: 700, fontSize: 15, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? '送信中...' : `${requestDates.length}日分をまとめて提出・更新`}
          </button>
        </>
      )}

      {/* 過去履歴 */}
      {pastShifts.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>過去の提出履歴</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pastShifts.map(shift => {
              const { label, dow, dowIdx } = fmtDate(shift.event_date)
              const isAllDay = shift.available_from === '00:00' && shift.available_until === '00:00'
              return (
                <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9', borderRadius: 8, padding: '10px 14px', opacity: 0.7 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: dowIdx === 0 ? '#e53935' : dowIdx === 6 ? '#1565c0' : '#555' }}>
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
