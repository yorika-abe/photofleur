'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function ModelBookingsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/model-portal/bookings'; return }

      const res = await fetch('/api/model-portal/bookings')
      if (!res.ok) { setLoading(false); return }
      const { events } = await res.json()
      setEvents(events || [])
      setLoading(false)
    }
    load()
  }, [])

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← ポータルトップ</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 24px' }}>予約状況</h1>

      {events.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '40px', border: '1px solid #d6ecf5', textAlign: 'center', color: '#aaa' }}>
          現在出演予定のイベントはありません。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {events.map(({ event, slots }) => {
            const typeLabel = event.event_type === 'street' ? 'ストリート' : event.event_type === 'studio' ? 'スタジオ' : '不定期'
            const typeColor = event.event_type === 'street' ? { bg: '#e8f5e9', color: '#388e3c' } : event.event_type === 'studio' ? { bg: '#e8eaf6', color: '#3949ab' } : { bg: '#fff3e0', color: '#e65100' }

            return (
              <div key={event.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #d6ecf5', overflow: 'hidden' }}>
                {/* Event header */}
                <div style={{ background: 'linear-gradient(135deg, #0d1f3a, #1a3a60)', color: '#fff', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: typeColor.bg, color: typeColor.color, borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>{typeLabel}</span>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{formatDate(event.event_date)}</span>
                    {event.title && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{event.title}</span>}
                  </div>
                  {event.location_name && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>📍 {event.location_name}</div>
                  )}
                </div>

                {/* Slots */}
                <div style={{ padding: '16px 20px' }}>
                  {slots.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>予約枠が設定されていません。</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {slots.map(slot => {
                        const booked = !!slot.booking

                        return (
                          <div key={slot.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: `1px solid ${booked ? '#b2dfdb' : '#e8f4fb'}`,
                            background: booked ? '#e0f2f1' : '#f8fbff',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', minWidth: 80 }}>
                              {slot.slot_label}
                            </div>

                            {booked ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, background: '#00897b', color: '#fff', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>予約済み</span>
                                <span style={{ fontSize: 13, color: '#444' }}>
                                  {slot.booking.last_name}{slot.booking.first_name} 様
                                </span>
                                {slot.booking.sns_url ? (
                                  <a href={slot.booking.sns_url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 13, color: '#1a3560', fontWeight: 600, wordBreak: 'break-all' }}>
                                    📷 {slot.booking.sns_url}
                                  </a>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#999' }}>SNS未登録</span>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 22 }}>🈳</span>
                                <span style={{ fontSize: 13, color: '#999' }}>空き</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
