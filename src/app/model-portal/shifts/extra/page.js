'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_LABELS = { street: 'ST', studio: 'Stu', both: '両方' }
const TYPE_COLORS = { street: '#0097a7', studio: '#d81b60', both: '#555' }

export default function ExtraEntryPage() {
  const [extraDates, setExtraDates] = useState([])
  const [extra, setExtra] = useState({})
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
    const submittedDates = new Set(allShifts.map(s => s.event_date))

    const extras = (Array.isArray(reqData) ? reqData : []).filter(r =>
      r.request_date >= today && r.deadline && r.deadline < today && !submittedDates.has(r.request_date)
    )
    setExtraDates(extras)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/model-portal" style={{ fontSize: 13, color: '#0097a7', textDecoration: 'none' }}>← ポータルトップ</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '8px 0 4px' }}>追加エントリー申請</h1>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>締め切り後の参加申請です。承認が必要です。</p>
      </div>

      {extraDates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb', background: '#fafafa', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <p style={{ margin: 0, fontSize: 14 }}>現在、追加申請できる日程はありません</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {extraDates.map(req => {
          const d = new Date(req.request_date + 'T00:00:00')
          const label = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${DOW[d.getDay()]}）`
          const tc = TYPE_COLORS[req.event_type] || '#555'
          const ex = extra[req.id] || {}

          return (
            <div key={req.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #ffe082' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ex.open ? 12 : 0 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: d.getDay() === 0 ? '#e53935' : d.getDay() === 6 ? '#1565c0' : '#1a1a2e' }}>{label}</span>
                <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                  {TYPE_LABELS[req.event_type] || req.event_type}
                </span>
                {ex.result === 'ok'
                  ? <span style={{ fontSize: 12, color: '#388e3c', fontWeight: 700, marginLeft: 'auto' }}>✓ 申請しました</span>
                  : (
                    <button
                      onClick={() => setExtra(prev => ({ ...prev, [req.id]: { allDay: true, from: '09:00', until: '23:00', notes: '', ...prev[req.id], open: !ex.open } }))}
                      style={{ marginLeft: 'auto', fontSize: 12, color: '#f57f17', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 700 }}>
                      {ex.open ? '閉じる' : '申請する →'}
                    </button>
                  )
                }
              </div>

              {ex.open && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {[{ k: true, l: '終日' }, { k: false, l: '時間指定' }].map(opt => (
                      <button key={String(opt.k)}
                        onClick={() => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], allDay: opt.k } }))}
                        style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', borderColor: ex.allDay === opt.k ? '#43a047' : '#ddd', background: ex.allDay === opt.k ? '#e8f5e9' : '#fff', color: ex.allDay === opt.k ? '#2e7d32' : '#888', fontWeight: ex.allDay === opt.k ? 700 : 400 }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                  {!ex.allDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input type="time" value={ex.from || '09:00'}
                        onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], from: e.target.value } }))}
                        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                      <span style={{ color: '#bbb' }}>〜</span>
                      <input type="time" value={ex.until || '23:00'}
                        onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], until: e.target.value } }))}
                        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                    </div>
                  )}
                  <input value={ex.notes || ''} onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], notes: e.target.value } }))}
                    placeholder="申請理由（任意）"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '5px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, color: '#555', background: '#fffde7', marginBottom: 8 }} />
                  <button disabled={ex.submitting} onClick={async () => {
                    setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitting: true } }))
                    const from = ex.allDay !== false ? '00:00' : (ex.from || '09:00')
                    const until = ex.allDay !== false ? '00:00' : (ex.until || '23:00')
                    const res = await fetch('/api/model-portal/shifts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ event_date: req.request_date, event_type: req.event_type, available_from: from, available_until: until, notes: ex.notes || '', unavailable: false, status: 'pending_approval' }),
                    })
                    const data = await res.json()
                    setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], submitting: false, result: data?.error ? 'error' : 'ok', open: false } }))
                  }}
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
  )
}
