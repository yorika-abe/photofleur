'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const TYPE_LABEL = { street: 'ストリート', studio: 'スタジオ', irregular: '不定期' }
const TYPE_COLOR = {
  street: { bg: '#e8f5e9', color: '#388e3c' },
  studio: { bg: '#e8eaf6', color: '#3949ab' },
  irregular: { bg: '#fff3e0', color: '#e65100' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

function SlotList({ slots }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {slots.map(slot => {
        const booked = !!slot.booking
        return (
          <div key={slot.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${booked ? '#b2dfdb' : '#e8f4fb'}`,
            background: booked ? '#e0f2f1' : '#f8fbff',
            gap: 10, flexWrap: 'wrap',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', minWidth: 80 }}>
              {slot.slot_label}
            </div>
            {booked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: '#00897b', color: '#fff', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>予約済み</span>
                <span style={{ fontSize: 13, color: '#444' }}>
                  {slot.booking.nickname || `${slot.booking.last_name}${slot.booking.first_name}`} 様
                </span>
                {slot.booking.sns_url ? (
                  <a href={slot.booking.sns_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#1a3560', fontWeight: 600, wordBreak: 'break-all' }}>
                    📷 {slot.booking.sns_url}
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: '#999' }}>SNS未登録</span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>🈳</span>
                <span style={{ fontSize: 12, color: '#999' }}>空き</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventCard({ event, slots, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const tc = TYPE_COLOR[event.event_type] || TYPE_COLOR.irregular
  const tl = TYPE_LABEL[event.event_type] || event.event_type

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #d6ecf5', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, #0d1f3a, #1a3a60)',
        color: '#fff', padding: '12px 16px', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>{tl}</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{formatDate(event.event_date)}</span>
        {event.title && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{event.title}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 14, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px' }}>
          {slots.length === 0
            ? <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>予約枠が設定されていません。</p>
            : <SlotList slots={slots} />
          }
        </div>
      )}
    </div>
  )
}

export default function ModelBookingsPage() {
  const [events, setEvents] = useState([])
  const [past, setPast] = useState([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/model-portal/bookings'; return }

      const params = new URLSearchParams(window.location.search)
      const modelId = params.get('model_id')
      const url = modelId ? `/api/model-portal/bookings?model_id=${modelId}` : '/api/model-portal/bookings'
      const res = await fetch(url)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setEvents(data.events || [])
      setPast(data.past || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← ポータルトップ</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 24px' }}>予約状況</h1>

      {events.length === 0 && past.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '40px', border: '1px solid #d6ecf5', textAlign: 'center', color: '#aaa' }}>
          現在出演予定のイベントはありません。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(({ event, slots }) => (
            <EventCard key={event.id} event={event} slots={slots} defaultOpen={true} />
          ))}

          {past.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginTop: 8, marginBottom: 4, paddingLeft: 4 }}>
                過去のイベント
              </div>
              {past.map(({ event, slots }) => (
                <EventCard key={event.id} event={event} slots={slots} defaultOpen={false} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
