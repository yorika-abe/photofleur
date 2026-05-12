'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${date.getMonth() + 1}/${date.getDate()}（${days[date.getDay()]}）`
}

const TODAY = new Date().toISOString().split('T')[0]

export default function AdminSchedulePage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('upcoming')
  const [saving, setSaving] = useState(false)
  const [reusing, setReusing] = useState(null)
  const [cameraNotify, setCameraNotify] = useState(null)
  const [cameraNotifySending, setCameraNotifySending] = useState(false)
  const [cameraNotifySent, setCameraNotifySent] = useState(false)
  const [modelNotify, setModelNotify] = useState(null)
  const [modelNotifySending, setModelNotifySending] = useState(false)
  const [modelNotifySent, setModelNotifySent] = useState(false)
  const [xNotify, setXNotify] = useState(null)
  const [xNotifySending, setXNotifySending] = useState(false)
  const [xNotifySent, setXNotifySent] = useState(false)
  const [featuringSaving, setFeaturingSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/events')
    const data = await res.json()
    const list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : null)
    if (!list) {
      setLoadError(data.error || JSON.stringify(data))
      setEvents([])
    } else {
      setEvents(list)
    }
    setLoading(false)
  }

  async function createNewEvent() {
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_date: today, event_type: 'street', title: '', status: 'draft' }),
    })
    const data = await res.json()
    const created = data.event || data
    if (created.error || !created.id) { alert('エラー: ' + (created.error || 'unknown')); setSaving(false); return }
    window.location.href = `/admin/schedule/${created.id}`
    setSaving(false)
  }

  function buildEventDateLabel(eventDate, eventEndDate) {
    if (!eventDate) return ''
    const days = ['日', '月', '火', '水', '木', '金', '土']
    const d = new Date(eventDate + 'T00:00:00')
    const base = `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
    if (!eventEndDate || eventEndDate === eventDate) return base
    const ed = new Date(eventEndDate + 'T00:00:00')
    return `${base}〜${ed.getMonth() + 1}/${ed.getDate()}（${days[ed.getDay()]}）`
  }

  function buildBookingLabel(bookingOpenAt) {
    if (!bookingOpenAt) return ''
    const bd = new Date(bookingOpenAt)
    return `${bd.getMonth() + 1}/${bd.getDate()} ${String(bd.getHours()).padStart(2, '0')}:${String(bd.getMinutes()).padStart(2, '0')}`
  }

  async function toggleStatus(ev) {
    const newStatus = ev.status === 'active' ? 'draft' : 'active'
    await fetch('/api/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ev.id, status: newStatus }),
    })
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: newStatus } : e))

    if (newStatus === 'active') {
      setModelNotifySent(false)
      setModelNotify({ ev })
      setCameraNotifySent(false)
      setCameraNotify({ ev })
      setXNotifySent(false)
      setXNotify({ ev })
    }
  }

  async function sendModelNotify() {
    if (!modelNotify) return
    setModelNotifySending(true)
    const ev = modelNotify.ev
    const siteUrl = window.location.origin
    const eventLabel = buildEventDateLabel(ev.event_date, ev.event_end_date)
    const bookingLabel = buildBookingLabel(ev.booking_open_at)
    const { templates } = await fetch('/api/admin/line-templates').then(r => r.json())
    const template = templates?.event_publish ?? `📢開催イベントが解放されました。\n\n📍{{event_date}} {{title}}\n予約受付開始日→{{booking_open_at}}~\n\n詳細は🔗{{event_url}}`
    const message = template
      .replace('{{event_date}}', eventLabel)
      .replace('{{title}}', ev.title || ev.location_name || '')
      .replace('{{booking_open_at}}', bookingLabel)
      .replace('{{event_url}}', `${siteUrl}/schedule/${ev.id}`)
    await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: 'group' }),
    })
    setModelNotifySending(false)
    setModelNotifySent(true)
  }

  async function sendXNotify() {
    if (!xNotify) return
    setXNotifySending(true)
    const ev = xNotify.ev
    const siteUrl = window.location.origin
    const eventLabel = buildEventDateLabel(ev.event_date, ev.event_end_date)
    const bookingLabel = buildBookingLabel(ev.booking_open_at)
    const { templates } = await fetch('/api/admin/line-templates').then(r => r.json())
    const template = templates?.x_event_publish ?? `📢お知らせ\n【開催イベントが公開されました】\n\n{{event_date}} {{title}}\n{{subtitle}}\n\n{{description}}\n\n予約受付開始：{{booking_open_at}}~\n{{event_url}}`
    const text = template
      .replace(/\{\{event_date\}\}/g, eventLabel)
      .replace(/\{\{title\}\}/g, ev.title || '')
      .replace(/\{\{subtitle\}\}/g, ev.subtitle || '')
      .replace(/\{\{description\}\}/g, ev.description || '')
      .replace(/\{\{booking_open_at\}\}/g, bookingLabel)
      .replace(/\{\{event_url\}\}/g, `${siteUrl}/schedule/${ev.id}`)
    await fetch('/api/admin/x-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, imageUrl: ev.thumbnail_image || null }),
    })
    setXNotifySending(false)
    setXNotifySent(true)
  }

  async function sendCameraNotify() {
    if (!cameraNotify) return
    setCameraNotifySending(true)
    const ev = cameraNotify.ev
    const siteUrl = window.location.origin
    const eventLabel = buildEventDateLabel(ev.event_date, ev.event_end_date)
    const bookingLabel = buildBookingLabel(ev.booking_open_at)
    const { templates } = await fetch('/api/admin/line-templates').then(r => r.json())
    const template = templates?.camera_event_publish ?? `【イベント公開のお知らせ📸】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント詳細が公開されました！\n\n{{description}}\n\n予約受付開始は\n🗓️{{booking_open_at}}〜\n\nイベント詳細はリンクからご確認ください💖\n🔗{{event_url}}`
    const message = template
      .replace('{{event_date}}', eventLabel)
      .replace('{{title}}', ev.title || '')
      .replace('{{subtitle}}', ev.subtitle || '')
      .replace('{{description}}', ev.description || '')
      .replace('{{booking_open_at}}', bookingLabel)
      .replace('{{event_url}}', `${siteUrl}/schedule/${ev.id}`)
    await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: 'camera', image_url: ev.thumbnail_image || null }),
    })
    setCameraNotifySending(false)
    setCameraNotifySent(true)
  }

  async function toggleFeatured(ev) {
    setFeaturingSaving(true)
    const isFeatured = ev.is_featured
    await fetch('/api/admin/events/feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: isFeatured ? null : ev.id }),
    })
    setEvents(prev => prev.map(e => ({ ...e, is_featured: !isFeatured && e.id === ev.id })))
    setFeaturingSaving(false)
  }

  async function deleteEvent(id) {
    if (!confirm('このイベントを削除しますか？')) return
    const res = await fetch('/api/admin/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (json.archived) {
      alert(`予約履歴が ${json.bookingCount} 件あるため、完全削除ではなく非表示にしました。\n予約履歴・メルマガ対象はそのまま保持されます。`)
    }
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  async function reuseEvent(ev) {
    if (!confirm(`「${ev.title || ev.location_name}」の内容をコピーして新規作成しますか？\n開催日・予約受付・モデルは引き継がれません。`)) return
    setReusing(ev.id)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: ev.event_type,
        title: ev.title,
        location_name: ev.location_name,
        address: ev.address,
        map_address: ev.map_address,
        access_note: ev.access_note,
        studio_url: ev.studio_url,
        studio_capacity: ev.studio_capacity,
        studio_fee: ev.studio_fee,
        meeting_place: ev.meeting_place,
        meeting_address: ev.meeting_address,
        meeting_map_url: ev.meeting_map_url,
        baggage_storage: ev.baggage_storage,
        model_assembly_offset_minutes: ev.model_assembly_offset_minutes,
        model_extra_note: ev.model_extra_note,
        model_lunch_note: ev.model_lunch_note,
        studio_rules: ev.studio_rules,
        slot_templates: ev.slot_templates,
        main_image: ev.main_image,
        status: 'draft',
        booking_open_at: null,
      }),
    })
    const data = await res.json()
    const created = data.event || data
    setReusing(null)
    if (created.error || !created.id) { alert('エラー: ' + (created.error || 'unknown')); return }
    window.location.href = `/admin/schedule/${created.id}`
  }

  const upcoming = events.filter(ev => ev.event_date >= TODAY || !ev.event_date)
  const past = events.filter(ev => ev.event_date && ev.event_date < TODAY)

  const tabEvents = tab === 'upcoming' ? upcoming : past

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>スケジュール管理</h1>
        <button onClick={createNewEvent} disabled={saving}
          style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {saving ? '作成中...' : '+ 新規作成'}
        </button>
      </div>

      {loadError && <div style={{ background: '#fce4ec', border: '1px solid #ef9a9a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#c62828' }}>エラー: {loadError}</div>}

      {modelNotify && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1b5e20', fontSize: 14, marginBottom: 4 }}>👥 モデル全体グループLINEに配信しますか？</div>
            <div style={{ fontSize: 13, color: '#2e7d32' }}>「{modelNotify.ev.title || modelNotify.ev.location_name}」の公開をモデルに告知します</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {modelNotifySent ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>✅ 送信済み</span>
            ) : (
              <button onClick={sendModelNotify} disabled={modelNotifySending}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: modelNotifySending ? '#ccc' : '#388e3c', color: '#fff', fontWeight: 700, fontSize: 13, cursor: modelNotifySending ? 'not-allowed' : 'pointer' }}>
                {modelNotifySending ? '送信中...' : 'はい、送信する'}
              </button>
            )}
            <button onClick={() => setModelNotify(null)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#888', fontSize: 13, cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {cameraNotify && (
        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 12, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 14, marginBottom: 4 }}>📣 公式LINE（カメラマン向け）でも告知しますか？</div>
            <div style={{ fontSize: 13, color: '#1565c0' }}>「{cameraNotify.ev.title || cameraNotify.ev.location_name}」を公開告知します{cameraNotify.ev.thumbnail_image ? '（サムネイル画像も送信）' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {cameraNotifySent ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>✅ 送信済み</span>
            ) : (
              <button onClick={sendCameraNotify} disabled={cameraNotifySending}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: cameraNotifySending ? '#ccc' : '#f57c00', color: '#fff', fontWeight: 700, fontSize: 13, cursor: cameraNotifySending ? 'not-allowed' : 'pointer' }}>
                {cameraNotifySending ? '送信中...' : 'はい、送信する'}
              </button>
            )}
            <button onClick={() => setCameraNotify(null)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#888', fontSize: 13, cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {xNotify && (
        <div style={{ background: '#f3f3f3', border: '1px solid #ccc', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#000', fontSize: 14, marginBottom: 4 }}>𝕏 Xにも投稿しますか？</div>
            <div style={{ fontSize: 13, color: '#555' }}>「{xNotify.ev.title || xNotify.ev.location_name}」{xNotify.ev.thumbnail_image ? '（サムネイル画像付き）' : ''}をXに投稿します</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {xNotifySent ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>✅ 投稿済み</span>
            ) : (
              <button disabled
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#aaa', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'not-allowed' }}>
                課金設定後利用可能
              </button>
            )}
            <button onClick={() => setXNotify(null)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#888', fontSize: 13, cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e5e5' }}>
        {[
          { key: 'upcoming', label: '開催予定', count: upcoming.length },
          { key: 'past', label: '開催終了', count: past.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #2f2244' : '2px solid transparent',
              marginBottom: -2, padding: '10px 20px', cursor: 'pointer', fontWeight: tab === t.key ? 700 : 500,
              fontSize: 14, color: tab === t.key ? '#2f2244' : '#999', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {t.label}
            <span style={{ background: tab === t.key ? '#2f2244' : '#ddd', color: tab === t.key ? '#fff' : '#777', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tabEvents.length === 0 ? (
          <p style={{ color: '#999' }}>{tab === 'upcoming' ? '開催予定のイベントはありません。' : '開催終了したイベントはありません。'}</p>
        ) : tabEvents.map(ev => {
          const models = ev.event_entries?.map(e => e.models).filter(Boolean) || []
          const typeLabel = ev.event_type === 'street' ? 'ストリート' : ev.event_type === 'studio' ? 'スタジオ' : '不定期'
          const typeColor = ev.event_type === 'street' ? { bg: '#e0f7fa', color: '#0097a7' } : ev.event_type === 'studio' ? { bg: '#fce4ec', color: '#c2185b' } : { bg: '#e3f2fd', color: '#1a3560' }
          const isActive = ev.status === 'active'
          const isPast = tab === 'past'

          return (
            <div key={ev.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', opacity: isPast ? 0.85 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, flex: 1, minWidth: 0 }}>
                  {ev.main_image && (
                    <div style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: '#f0f4fb' }}>
                      <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: typeColor.bg, color: typeColor.color, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{typeLabel}</span>
                      {isPast && (
                        <span style={{ background: '#eeeeee', color: '#777', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>開催終了</span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: 17, color: '#2f2244' }}>
                        {formatDate(ev.event_date)}{ev.event_end_date && ev.event_end_date !== ev.event_date ? `〜${formatDate(ev.event_end_date)}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{ev.title || ev.location_name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ev.location_name}</div>
                    {models.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {models.map((m, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8f5ff', borderRadius: 20, padding: '3px 10px 3px 4px' }}>
                            {m.image && <img src={m.image} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />}
                            <span style={{ fontSize: 12, color: '#2f2244', fontWeight: 600 }}>{m.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isPast ? (
                    <>
                      <button onClick={() => reuseEvent(ev)} disabled={reusing === ev.id}
                        style={{ background: '#e8f0fe', color: '#1a3560', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {reusing === ev.id ? '作成中...' : '再使用する'}
                      </button>
                      <Link href={`/admin/schedule/${ev.id}`}
                        style={{ background: '#f5f5f5', color: '#555', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                        編集
                      </Link>
                      <button onClick={() => deleteEvent(ev.id)}
                        style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        削除
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => toggleStatus(ev)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid', borderColor: isActive ? '#388e3c' : '#ccc', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: isActive ? '#388e3c' : '#aaa' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? '#388e3c' : '#ccc', display: 'inline-block' }} />
                        {isActive ? '表示中' : '非表示'}
                      </button>
                      {isActive && (
                        <button onClick={() => toggleFeatured(ev)}
                          title={ev.is_featured ? 'お気に入り解除' : 'お気に入りに設定（1件まで）'}
                          style={{ background: 'none', border: '1.5px solid', borderColor: ev.is_featured ? '#f59e0b' : '#e5e5e5', borderRadius: 20, padding: '5px 10px', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>
                          {ev.is_featured ? '⭐️' : '☆'}
                        </button>
                      )}
                      <Link href={`/admin/schedule/${ev.id}`}
                        style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                        編集
                      </Link>
                      <button onClick={() => deleteEvent(ev.id)}
                        style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        削除
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
