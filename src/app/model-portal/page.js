'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function UpcomingEventTabs({ events }) {
  const types = [...new Set(events.map(e => e.event_type))].sort()
  const [tab, setTab] = useState(types[0] || 'street')
  const TYPE_LABEL = { street: 'ストリート', studio: 'スタジオ', irregular: '不定期' }
  const TYPE_COLOR = { street: { active: '#388e3c', bg: '#e8f5e9' }, studio: { active: '#3949ab', bg: '#e8eaf6' }, irregular: { active: '#e65100', bg: '#fff3e0' } }
  const filtered = events.filter(e => e.event_type === tab)

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #d6ecf5' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0d1f3a', marginTop: 0, marginBottom: 16 }}>公開中の参加イベント</h2>
      {events.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>現在出演予定のイベントはありません。</p>
      ) : (
        <>
          {types.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {types.map(t => {
                const c = TYPE_COLOR[t] || TYPE_COLOR.irregular
                const isActive = tab === t
                return (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: '5px 14px', borderRadius: 20, border: `2px solid ${isActive ? c.active : '#e5e5e5'}`, background: isActive ? c.bg : '#fff', color: isActive ? c.active : '#888', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {TYPE_LABEL[t] || t}
                  </button>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(ev => {
              const mm = String(new Date(ev.event_date + 'T00:00:00').getMonth() + 1).padStart(2, '0')
              const dd = String(new Date(ev.event_date + 'T00:00:00').getDate()).padStart(2, '0')
              return (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fbff', borderRadius: 10, border: '1px solid #e8f4fb' }}>
                    {ev.main_image && (
                      <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#0d1f3a' }}>{mm}/{dd}</span>
                      {ev.title && <span style={{ fontSize: 13, color: '#555', marginLeft: 8 }}>{ev.title}</span>}
                    </div>
                    <span style={{ fontSize: 12, color: '#5bbfd6', fontWeight: 600, flexShrink: 0 }}>詳細 →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function ModelPortalHome() {
  const [model, setModel] = useState(null)
  const [allModels, setAllModels] = useState(null) // null = not admin, [] = admin with no selection
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [pendingShiftCount, setPendingShiftCount] = useState(0)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
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
        .select('id, event_id')
        .eq('model_id', model.id)

      let upcoming = []
      if (entries && entries.length > 0) {
        const eventIds = entries.map(e => e.event_id).filter(Boolean)
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, event_date, event_type, title, main_image, status')
          .in('id', eventIds)
        upcoming = (eventsData || [])
          .filter(ev => ev.status !== 'cancelled' && ev.event_date >= today)
          .sort((a, b) => a.event_date.localeCompare(b.event_date))
          .slice(0, 5)
      }

      setUpcomingEvents(upcoming)

      // 新着提供写真カウント
      const lastViewed = document.cookie.split('; ').find(r => r.startsWith('model_photos_last_viewed='))?.split('=')[1] || null
      const photosRes = await fetch(`/api/model-portal/photos?model_id=${model.id}`)
      const photosData = await photosRes.json()
      const newCount = Array.isArray(photosData)
        ? (lastViewed ? photosData.filter(p => new Date(p.created_at) > new Date(lastViewed)).length : photosData.length)
        : 0
      setNewPhotoCount(newCount)

      // 未提出シフト数カウント
      const [reqRes, shiftRes] = await Promise.all([
        fetch('/api/admin/shift-requests'),
        fetch('/api/model-portal/shifts'),
      ])
      const reqData = await reqRes.json()
      const shiftData = await shiftRes.json()
      const todayStr = today
      const activeReqs = (Array.isArray(reqData) ? reqData : []).filter(r =>
        r.request_date >= todayStr && (!r.deadline || r.deadline >= todayStr)
      )
      const submittedDates = new Set((Array.isArray(shiftData) ? shiftData : []).map(s => s.event_date))
      setPendingShiftCount(activeReqs.filter(r => !submittedDates.has(r.request_date)).length)

      setLoading(false)
    }
    init()
  }, [])

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

  const hasPendingChange = model.status === 'active' && model.pending_data
  const statusColor = hasPendingChange ? '#1565c0' : model.status === 'active' ? '#388e3c' : model.status === 'pending' ? '#e65100' : '#999'
  const statusLabel = hasPendingChange ? '変更審査中' : model.status === 'active' ? '公開中' : model.status === 'pending' ? '承認待ち' : '非公開'

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
        {model.status === 'active' && model.pending_data && (
          <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 12, padding: '16px 20px', marginBottom: 24, fontSize: 14, color: '#1565c0' }}>
            プロフィールの変更申請を受け付けました。承認されると反映されます。現在は変更前の内容が公開されています。
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
            { href: '/model-portal/shifts', icon: '📅', label: 'シフト提出', desc: '参加可能日程を登録', badge: pendingShiftCount },
            { href: '/model-portal/blog', icon: '📝', label: 'ブログ', desc: '記事を書く' },
            { href: '/model-portal/private-info', icon: '🔒', label: '非公開登録情報', desc: '住所・連絡先・契約同意' },
            { href: '/model-portal/photos', icon: '📸', label: 'ご提供写真', desc: '提供いただいた写真を確認', badge: newPhotoCount },
          ]).map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #d6ecf5', transition: 'box-shadow 0.2s', position: 'relative' }}>
                {item.badge > 0 && (
                  <span style={{ position: 'absolute', top: 12, right: 12, background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700, minWidth: 22, textAlign: 'center' }}>
                    {item.badge}
                  </span>
                )}
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0d1f3a', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* 参加予定イベント */}
        <UpcomingEventTabs events={upcomingEvents} />
      </div>
    </div>
  )
}
