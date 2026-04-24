'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

export default function ModelPortalHome() {
  const [model, setModel] = useState(null)
  const [allModels, setAllModels] = useState(null) // null = not admin, [] = admin with no selection
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [myShifts, setMyShifts] = useState([])
  const [extraDates, setExtraDates] = useState([]) // 追加申請できる日
  const [extra, setExtra] = useState({})
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/model-portal'; return }

      const params = new URLSearchParams(window.location.search)
      const modelId = params.get('model_id')
      const url = modelId ? `/api/model-portal/profile?model_id=${modelId}` : '/api/model-portal/profile'
      const res = await fetch(url)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()

      if (data.allModels !== undefined) {
        setAllModels(data.allModels)
        setLoading(false)
        return
      }

      const { model } = data
      if (!model) { setLoading(false); return }
      setModel(model)

      // 参加予定イベントを取得
      const today = new Date().toISOString().split('T')[0]
      const { data: entries } = await supabase
        .from('event_entries')
        .select('id, events(id, event_date, event_type, title, location_name, status)')
        .eq('model_id', model.id)

      const upcoming = (entries || [])
        .map(e => e.events)
        .filter(ev => ev && ev.status === 'active' && ev.event_date >= today)
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 5)

      setUpcomingEvents(upcoming)

      // 提出済みシフトと追加申請できる日を取得
      const today2 = new Date().toISOString().split('T')[0]
      const [shiftRes, reqRes2] = await Promise.all([
        fetch('/api/model-portal/shifts'),
        fetch('/api/admin/shift-requests'),
      ])
      const shiftData = await shiftRes.json()
      const reqData2 = await reqRes2.json()

      const allShifts = Array.isArray(shiftData) ? shiftData : []
      const futureShifts = allShifts
        .filter(s => s.event_date >= today2)
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 5)
      setMyShifts(futureShifts)

      // 追加申請: 締め切り済み & 未来 & 未提出の日程
      const submittedDates = new Set(allShifts.map(s => s.event_date))
      const extras = (Array.isArray(reqData2) ? reqData2 : []).filter(r =>
        r.request_date >= today2 && r.deadline && r.deadline < today2 && !submittedDates.has(r.request_date)
      )
      setExtraDates(extras)

      setLoading(false)
    }
    init()
  }, [])

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  // Admin: show model list
  if (allModels !== null) return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 24px' }}>モデルポータル確認</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allModels.map(m => (
          <a key={m.id} href={`/model-portal?model_id=${m.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8f4fb', overflow: 'hidden', flexShrink: 0 }}>
                {m.image ? <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#0d1f3a' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: m.status === 'active' ? '#388e3c' : '#999', marginTop: 2 }}>{m.status === 'active' ? '公開中' : m.status === 'pending' ? '承認待ち' : '非公開'}</div>
              </div>
              <span style={{ fontSize: 13, color: '#5bbfd6', fontWeight: 600 }}>ポータルを見る →</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )

  if (!model) return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <p style={{ color: '#666', marginBottom: 24 }}>モデルアカウントが見つかりません。</p>
      <a href="https://lin.ee/VgTzmhe" target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-block', background: '#06C755', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700 }}>
        LINEで運営に連絡
      </a>
    </div>
  )

  const statusColor = model.status === 'active' ? '#388e3c' : model.status === 'pending' ? '#e65100' : '#999'
  const statusLabel = model.status === 'active' ? '公開中' : model.status === 'pending' ? '承認待ち' : '非公開'

  const adminModelId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('model_id') : null
  const isAdminView = !!adminModelId

  return (
    <div style={{ background: '#fafcff', minHeight: '100vh' }}>

      {isAdminView && (
        <div style={{ background: '#1a3560', padding: '10px 20px' }}>
          <a href="/model-portal" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← モデル一覧に戻る</a>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ background: 'linear-gradient(135deg, #0d1f3a, #1a3a60)', color: '#fff', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1a3560', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(168,226,244,0.4)' }}>
            {model.image
              ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
            }
          </div>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 4px' }}>Model Portal</p>
            <h1 style={{ ...serif, fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 400, margin: '0 0 8px' }}>
              {model.name}
            </h1>
            <span style={{ fontSize: 12, background: statusColor, color: '#fff', borderRadius: 4, padding: '2px 10px', fontWeight: 600 }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>

        {/* 承認待ちメッセージ */}
        {model.status === 'pending' && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: '16px 20px', marginBottom: 24, fontSize: 14, color: '#795548' }}>
            プロフィールは現在審査中です。承認されると公開されます。
          </div>
        )}

        {/* メニュー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          {(isAdminView ? [
            { href: `/admin/models/${adminModelId}`, icon: '✏️', label: 'プロフィール編集', desc: '管理者用モデル編集' },
            { href: `/model-portal/bookings?model_id=${adminModelId}`, icon: '📋', label: '予約状況', desc: 'このモデルの予約一覧' },
            { href: '/admin/shifts', icon: '📅', label: 'シフト管理', desc: 'シフト一覧・承認' },
            { href: '/admin/blog', icon: '📝', label: 'ブログ管理', desc: '記事管理' },
          ] : [
            { href: '/model-portal/profile', icon: '✏️', label: 'プロフィール編集', desc: '写真・プロフィールを更新' },
            { href: '/model-portal/bookings', icon: '📋', label: '予約状況', desc: 'カメラマンSNS・空き確認' },
            { href: '/model-portal/shifts', icon: '📅', label: 'シフト提出', desc: '参加可能日程を登録' },
            { href: '/model-portal/blog', icon: '📝', label: 'ブログ', desc: '記事を書く' },
          ]).map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #d6ecf5', transition: 'box-shadow 0.2s' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0d1f3a', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* 追加エントリー申請 */}
        {!isAdminView && extraDates.length > 0 && (
          <div style={{ background: '#fffde7', borderRadius: 12, padding: '20px 24px', border: '1px solid #ffe082', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f57f17', margin: '0 0 2px' }}>追加エントリー申請</h2>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>締め切り後の参加申請です。承認が必要です。</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {extraDates.map(req => {
                const d = new Date(req.request_date + 'T00:00:00')
                const days = ['日', '月', '火', '水', '木', '金', '土']
                const label = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${days[d.getDay()]}）`
                const typeColors = { street: '#0097a7', studio: '#d81b60', both: '#555' }
                const typeLabels = { street: 'ST', studio: 'Stu', both: '両方' }
                const tc = typeColors[req.event_type] || '#555'
                const ex = extra[req.id] || {}
                return (
                  <div key={req.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ffe082' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ex.open ? 10 : 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: d.getDay() === 0 ? '#e53935' : d.getDay() === 6 ? '#1565c0' : '#1a1a2e' }}>{label}</span>
                      <span style={{ fontSize: 11, background: `${tc}20`, color: tc, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>{typeLabels[req.event_type] || req.event_type}</span>
                      {ex.result === 'ok'
                        ? <span style={{ fontSize: 12, color: '#388e3c', fontWeight: 700, marginLeft: 'auto' }}>✓ 申請しました</span>
                        : <button onClick={() => setExtra(prev => ({ ...prev, [req.id]: { allDay: true, from: '09:00', until: '23:00', notes: '', ...prev[req.id], open: !ex.open } }))}
                            style={{ marginLeft: 'auto', fontSize: 12, color: '#f57f17', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 700 }}>
                            {ex.open ? '閉じる' : '申請する →'}
                          </button>
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
                            <input type="time" value={ex.from || '09:00'} onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], from: e.target.value } }))}
                              style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontWeight: 600, width: 95 }} />
                            <span style={{ color: '#bbb' }}>〜</span>
                            <input type="time" value={ex.until || '23:00'} onChange={e => setExtra(prev => ({ ...prev, [req.id]: { ...prev[req.id], until: e.target.value } }))}
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
                          const res = await fetch('/api/model-portal/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_date: req.request_date, event_type: req.event_type, available_from: from, available_until: until, notes: ex.notes || '', unavailable: false, status: 'pending_approval' }) })
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
        )}

        {/* 提出済みシフト */}
        {!isAdminView && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e8e0f5', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0d1f3a', margin: 0 }}>提出済みシフト</h2>
              <Link href="/model-portal/shifts/history" style={{ fontSize: 13, color: '#7c5cbf', fontWeight: 600, textDecoration: 'none' }}>
                確認・編集 →
              </Link>
            </div>
            {myShifts.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>提出済みのシフトはありません。</p>
                <Link href="/model-portal/shifts" style={{ fontSize: 13, color: '#7c5cbf', fontWeight: 600, textDecoration: 'none', background: '#ede7f6', borderRadius: 8, padding: '7px 14px' }}>
                  シフトを提出 →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myShifts.map(shift => {
                  const d = new Date(shift.event_date + 'T00:00:00')
                  const days = ['日', '月', '火', '水', '木', '金', '土']
                  const label = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${days[d.getDay()]}）`
                  const isUnavailable = shift.available_slots?.[0]?.unavailable === true
                  const isAllDay = !isUnavailable && shift.available_from === '00:00' && shift.available_until === '00:00'
                  const statusColors = { submitted: '#0097a7', confirmed: '#388e3c', rejected: '#c62828', pending_approval: '#e65100' }
                  const statusLabels = { submitted: '提出済み', confirmed: '確定', rejected: '却下', pending_approval: '承認待ち' }
                  return (
                    <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf8ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #ede7f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: d.getDay() === 0 ? '#e53935' : d.getDay() === 6 ? '#1565c0' : '#0d1f3a' }}>{label}</span>
                        <span style={{ fontSize: 12, color: isUnavailable ? '#555' : '#aaa' }}>{isUnavailable ? '不参加' : isAllDay ? '終日' : `${shift.available_from}〜${shift.available_until}`}</span>
                      </div>
                      <span style={{ fontSize: 11, background: `${statusColors[shift.status]}20`, color: statusColors[shift.status] || '#7c5cbf', borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>
                        {statusLabels[shift.status] || shift.status}
                      </span>
                    </div>
                  )
                })}
                <div style={{ textAlign: 'right', marginTop: 4 }}>
                  <Link href="/model-portal/shifts" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>新しいシフトを提出 →</Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 参加予定イベント */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #d6ecf5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0d1f3a', marginTop: 0, marginBottom: 16 }}>
            公開中の参加イベント
          </h2>
          {upcomingEvents.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>現在出演予定のイベントはありません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingEvents.map(ev => (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fbff', borderRadius: 8, border: '1px solid #e8f4fb' }}>
                    <div>
                      <span style={{ fontSize: 11, background: ev.event_type === 'street' ? '#e8f5e9' : '#e8eaf6', color: ev.event_type === 'street' ? '#388e3c' : '#3949ab', borderRadius: 4, padding: '2px 7px', fontWeight: 600, marginRight: 8 }}>
                        {ev.event_type === 'street' ? 'ストリート' : ev.event_type === 'studio' ? 'スタジオ' : '不定期'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#0d1f3a' }}>{formatDate(ev.event_date)}</span>
                      {ev.title && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ev.title}</div>}
                    </div>
                    <span style={{ fontSize: 12, color: '#5bbfd6', fontWeight: 600 }}>詳細 →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
