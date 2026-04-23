'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return {
    full: `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`,
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    dd: String(d.getDate()).padStart(2, '0'),
    dow: days[d.getDay()],
  }
}

const EVENT_TYPE_LABELS = {
  street: 'ストリート',
  studio: 'スタジオ',
  both: '両方',
}

// 指定された時間範囲に含まれる枠の例示
function getSlotPreview(from, until, type) {
  if (from === '00:00' && until === '00:00') return '終日OK'
  const slots = type === 'studio'
    ? ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00']
    : ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
  const [fh, fm] = from.split(':').map(Number)
  const [uh, um] = until.split(':').map(Number)
  const fromMin = fh * 60 + fm
  const untilMin = uh * 60 + um
  const active = slots.filter(s => {
    const [sh] = s.split(':').map(Number)
    return sh * 60 >= fromMin && (sh + 1) * 60 <= untilMin
  })
  if (active.length === 0) return '対象枠なし'
  return active.join('、') + ' の枠が対象'
}

export default function ModelShiftsPage() {
  const [model, setModel] = useState(null)
  const [requestDates, setRequestDates] = useState([])
  const [myShifts, setMyShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({}) // { [request_date_id]: { from, until, notes, allDay } }
  const [saving, setSaving] = useState({})
  const [deleting, setDeleting] = useState({})

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
    const futureReqs = (Array.isArray(reqData) ? reqData : [])
      .filter(r => r.request_date >= today)

    setRequestDates(futureReqs)
    setMyShifts(Array.isArray(shiftData) ? shiftData : [])

    // フォームの初期値設定（既存シフトがあれば反映）
    const initForms = {}
    futureReqs.forEach(r => {
      const existing = (Array.isArray(shiftData) ? shiftData : [])
        .find(s => s.event_date === r.request_date)
      if (existing) {
        const isAllDay = existing.available_from === '00:00' && existing.available_until === '00:00'
        initForms[r.id] = {
          from: isAllDay ? '09:00' : (existing.available_from || '09:00'),
          until: isAllDay ? '18:00' : (existing.available_until || '18:00'),
          notes: existing.notes || '',
          allDay: isAllDay,
          submitted: true,
          shiftId: existing.id,
        }
      } else {
        initForms[r.id] = { from: '09:00', until: '18:00', notes: '', allDay: false, submitted: false }
      }
    })
    setForms(initForms)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateForm(id, key, value) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  async function submitShift(req) {
    const f = forms[req.id]
    if (!f) return
    setSaving(prev => ({ ...prev, [req.id]: true }))

    const from = f.allDay ? '00:00' : f.from
    const until = f.allDay ? '00:00' : f.until

    const res = await fetch('/api/model-portal/shifts', {
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
    const data = await res.json()
    setSaving(prev => ({ ...prev, [req.id]: false }))
    if (data.error) { alert('エラー: ' + data.error); return }
    await load()
  }

  async function deleteShift(reqId, shiftId) {
    if (!confirm('このシフトを取り消しますか？')) return
    setDeleting(prev => ({ ...prev, [reqId]: true }))
    await fetch('/api/model-portal/shifts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: shiftId }),
    })
    setDeleting(prev => ({ ...prev, [reqId]: false }))
    await load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const pastShifts = myShifts.filter(s => s.event_date < new Date().toISOString().split('T')[0])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2f2244', marginBottom: 6 }}>シフト提出</h1>
      {model && <p style={{ color: '#666', marginBottom: 32, fontSize: 14 }}>{model.name} さん、出演可能な時間帯を登録してください。</p>}

      {!model && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <p style={{ color: '#795548', margin: 0, fontSize: 14 }}>モデルアカウントが設定されていません。運営にご連絡ください。</p>
        </div>
      )}

      {model && (
        <>
          {/* 運営指定日一覧 */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #e0d8f0' }}>
              提出が必要な日程
            </h2>

            {requestDates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                <p style={{ margin: 0 }}>現在、シフト提出の依頼はありません</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {requestDates.map(req => {
                  const f = forms[req.id] || {}
                  const d = formatDate(req.request_date)
                  const preview = !f.allDay ? getSlotPreview(f.from || '09:00', f.until || '18:00', req.event_type) : '終日OK'
                  const isDeadlinePast = req.deadline && req.deadline < new Date().toISOString().split('T')[0]

                  return (
                    <div key={req.id} style={{ background: '#fff', border: f.submitted ? '2px solid #7c5cbf' : '1px solid #e0d8f0', borderRadius: 14, padding: '22px 24px' }}>
                      {/* ヘッダー */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#2f2244' }}>{d.mm}/{d.dd}</span>
                            <span style={{ fontSize: 15, color: '#666' }}>（{d.dow}）</span>
                            <span style={{ fontSize: 11, background: '#f0eaff', color: '#7c5cbf', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                              {EVENT_TYPE_LABELS[req.event_type] || req.event_type}
                            </span>
                          </div>
                          {req.deadline && (
                            <div style={{ fontSize: 12, color: isDeadlinePast ? '#e53935' : '#888' }}>
                              締め切り：{formatDate(req.deadline).full}{isDeadlinePast && '（期限超過）'}
                            </div>
                          )}
                          {req.notes && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>📝 {req.notes}</div>}
                        </div>
                        {f.submitted && (
                          <span style={{ background: '#ede7f6', color: '#7c5cbf', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                            ✓ 提出済み
                          </span>
                        )}
                      </div>

                      {/* 時間入力 */}
                      <div style={{ background: '#faf8ff', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
                        {/* 終日チェック */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: f.allDay ? 0 : 14, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!f.allDay}
                            onChange={e => updateForm(req.id, 'allDay', e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#7c5cbf' }}
                          />
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#2f2244' }}>終日参加可能</span>
                            <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>（00:00〜00:00）</span>
                          </div>
                        </label>

                        {!f.allDay && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>出演可能な時間帯を設定</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>開始</label>
                                <input
                                  type="time"
                                  value={f.from || '09:00'}
                                  onChange={e => updateForm(req.id, 'from', e.target.value)}
                                  style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, fontWeight: 600, color: '#2f2244' }}
                                />
                              </div>
                              <span style={{ color: '#bbb', fontSize: 18 }}>〜</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>終了</label>
                                <input
                                  type="time"
                                  value={f.until || '18:00'}
                                  onChange={e => updateForm(req.id, 'until', e.target.value)}
                                  style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, fontWeight: 600, color: '#2f2244' }}
                                />
                              </div>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12, color: '#9575cd', background: '#ede7f6', borderRadius: 6, padding: '6px 10px', display: 'inline-block' }}>
                              📌 {preview}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 備考 */}
                      <div style={{ marginBottom: 16 }}>
                        <textarea
                          value={f.notes || ''}
                          onChange={e => updateForm(req.id, 'notes', e.target.value)}
                          rows={2}
                          placeholder="衣装や注意事項があれば（任意）"
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e0d8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', color: '#555' }}
                        />
                      </div>

                      {/* ボタン */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => submitShift(req)}
                          disabled={saving[req.id]}
                          style={{ background: '#7c5cbf', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving[req.id] ? 0.7 : 1 }}
                        >
                          {saving[req.id] ? '送信中...' : f.submitted ? '更新する' : 'シフトを提出'}
                        </button>
                        {f.submitted && f.shiftId && (
                          <button
                            onClick={() => deleteShift(req.id, f.shiftId)}
                            disabled={deleting[req.id]}
                            style={{ background: 'none', border: '1px solid #e0d8f0', color: '#e53935', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            {deleting[req.id] ? '取消中...' : '取り消す'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 過去のシフト */}
          {pastShifts.length > 0 && (
            <section>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #e0d8f0' }}>
                過去の提出履歴
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pastShifts.map(shift => {
                  const d = formatDate(shift.event_date)
                  const isAllDay = shift.available_from === '00:00' && shift.available_until === '00:00'
                  return (
                    <div key={shift.id} style={{ background: '#f9f9f9', borderRadius: 10, padding: '16px 18px', border: '1px solid #eee', opacity: 0.75 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#555' }}>{d.full}</span>
                          <span style={{ fontSize: 12, color: '#aaa', marginLeft: 10 }}>
                            {isAllDay ? '終日' : `${shift.available_from}〜${shift.available_until}`}
                          </span>
                          {shift.event_type && (
                            <span style={{ fontSize: 11, background: '#f0f0f0', color: '#888', borderRadius: 4, padding: '1px 6px', marginLeft: 8 }}>
                              {EVENT_TYPE_LABELS[shift.event_type] || shift.event_type}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, background: '#f0f0f0', color: '#888', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                          {shift.status === 'submitted' ? '提出済み' : shift.status === 'confirmed' ? '確定' : shift.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
