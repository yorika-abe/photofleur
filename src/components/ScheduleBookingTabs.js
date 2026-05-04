'use client'

import { useState } from 'react'
import BookingSection from '@/app/events/[id]/BookingSection'
import ProductCards from '@/app/events/[id]/ProductCards'

function formatOpenAt(isoStr) {
  return new Date(isoStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function ScheduleBookingTabs({ events, entriesByEvent, slotsByEntry, bookingCounts, indoorCountBySlot, indoorCountByLabel, productsByEvent = {} }) {
  const [activeId, setActiveId] = useState(events[0]?.id || '')

  if (!events.length) return null

  const activeEvent = events.find(e => e.id === activeId)
  const activeEntries = (entriesByEvent[activeId] || []).filter(e => e.models)
  const now = new Date()
  const bookingOpen = !activeEvent?.booking_open_at || new Date(activeEvent.booking_open_at) <= now

  const activeProducts = productsByEvent[activeId] || []
  const activeSlotLabels = [...new Set(
    Object.values(
      Object.fromEntries(
        (activeEntries).map(e => [e.id, (slotsByEntry[e.id] || []).map(s => s.slot_label)])
      )
    ).flat()
  )]
  const activeEventModels = [...new Map(activeEntries.map(e => [e.model_id, e.models])).values()]

  return (
    <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 24 }}>
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
              {ev.title && (
                <span style={{ marginLeft: 6, fontWeight: 400 }}>
                  {ev.title}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Booking section — same component as event detail page */}
      {!bookingOpen && activeEvent?.booking_open_at ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>予約受付開始</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: 0 }}>
            {formatOpenAt(activeEvent.booking_open_at)}〜
          </p>
        </div>
      ) : (
        <BookingSection
          entries={activeEntries}
          slotsByEntry={slotsByEntry}
          indoorCountBySlot={indoorCountBySlot}
          indoorCountByLabel={indoorCountByLabel}
          studioCapacity={activeEvent?.studio_capacity || null}
          eventType={activeEvent?.event_type}
          bookingCounts={bookingCounts}
          bookingOpen={bookingOpen}
          bookingOpenAt={activeEvent?.booking_open_at}
          eventDate={activeEvent?.event_date || ''}
          eventLocation={activeEvent?.location_name || ''}
        />
      )}

      {/* Products */}
      {activeProducts.length > 0 && (
        <ProductCards
          products={activeProducts}
          eventId={activeId}
          slotLabels={activeSlotLabels}
          eventModels={activeEventModels}
        />
      )}

      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
