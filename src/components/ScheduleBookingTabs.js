'use client'

import { useState } from 'react'
import Link from 'next/link'

function formatOpenAt(isoStr) {
  return new Date(isoStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function ScheduleBookingTabs({ events, entriesByEvent }) {
  const [activeId, setActiveId] = useState(events[0]?.id || '')

  if (!events.length) return null

  const activeEvent = events.find(e => e.id === activeId)
  const activeEntries = (entriesByEvent[activeId] || []).filter(e => e.models)
  const now = new Date()
  const bookingOpen = !activeEvent?.booking_open_at || new Date(activeEvent.booking_open_at) <= now

  const mm = activeEvent?.event_date?.slice(5, 7) || ''
  const dd = activeEvent?.event_date?.slice(8, 10) || ''

  return (
    <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3560', marginBottom: 20 }}>
        モデルを選んで予約
      </h2>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 28, paddingBottom: 4 }}
        className="hide-scrollbar">
        {events.map(ev => {
          const tabMm = ev.event_date.slice(5, 7)
          const tabDd = ev.event_date.slice(8, 10)
          const isActive = ev.id === activeId
          return (
            <button key={ev.id} onClick={() => setActiveId(ev.id)}
              style={{
                background: isActive ? '#1a1a1a' : '#f0f0f0',
                color: isActive ? '#fff' : '#444',
                border: 'none', borderRadius: 6,
                padding: '8px 16px', cursor: 'pointer',
                whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600,
                flexShrink: 0, transition: 'background 0.2s',
              }}>
              {tabMm}/{tabDd}
              {(ev.location_name || ev.title) && (
                <span style={{ marginLeft: 6, fontWeight: 400 }}>
                  {ev.location_name || ev.title}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Booking not open yet */}
      {!bookingOpen && activeEvent?.booking_open_at && (
        <div style={{ background: '#f8fbff', border: '1px solid #d6ecf5', borderRadius: 10, padding: '14px 20px', marginBottom: 24 }}>
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
            📅 予約受付開始：
            <strong style={{ color: '#1a3560', marginLeft: 4 }}>
              {formatOpenAt(activeEvent.booking_open_at)}〜
            </strong>
          </p>
        </div>
      )}

      {/* Model cards */}
      {activeEntries.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>モデル情報は準備中です。</p>
      ) : (
        <div className="booking-model-grid">
          {activeEntries.map(entry => {
            const model = entry.models
            const price = activeEvent?.event_type === 'studio' ? model.studio_price : model.street_price
            return (
              <Link key={entry.id} href={`/events/${activeId}`} style={{ textDecoration: 'none', display: 'block' }} className="booking-model-card">
                <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4', background: '#ebebeb', marginBottom: 8, position: 'relative' }}>
                  {model.image
                    ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', display: 'block' }} className="booking-model-img" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 32 }}>👤</div>
                  }
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{mm}/{dd} {model.name}</div>
                {price
                  ? <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>¥{Number(price).toLocaleString()}</div>
                  : <div style={{ fontSize: 12, color: '#aaa' }}>料金はお問い合わせください</div>
                }
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .booking-model-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 16px;
        }
        .booking-model-card:hover .booking-model-img { transform: scale(1.04); }
        @media (max-width: 560px) {
          .booking-model-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; }
        }
      `}</style>
    </div>
  )
}
