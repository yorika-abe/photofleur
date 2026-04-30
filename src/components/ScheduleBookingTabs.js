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

export default function ScheduleBookingTabs({ events, entriesByEvent, slotsByEntry, bookingCounts, indoorCountByLabel }) {
  const [activeId, setActiveId] = useState(events[0]?.id || '')
  const [modal, setModal] = useState(null)
  const [selectedSlotId, setSelectedSlotId] = useState('')

  if (!events.length) return null

  const activeEvent = events.find(e => e.id === activeId)
  const activeEntries = (entriesByEvent[activeId] || []).filter(e => e.models)
  const now = new Date()
  const bookingOpen = !activeEvent?.booking_open_at || new Date(activeEvent.booking_open_at) <= now

  function openModal(entry) { setModal(entry); setSelectedSlotId('') }
  function closeModal() { setModal(null); setSelectedSlotId('') }

  const modalSlots = modal
    ? (slotsByEntry[modal.id] || []).map(slot => {
        const totalBookings = (bookingCounts || []).filter(b => b.slot_id === slot.id).length
        const indoorFull = activeEvent?.event_type === 'studio' && activeEvent?.studio_capacity
          ? (indoorCountByLabel[slot.slot_label] || 0) >= activeEvent.studio_capacity
          : false
        const fullyBooked = slot.is_reserved && totalBookings >= (slot.max_reservations || 1)
        return { ...slot, indoorFull, fullyBooked }
      })
    : []
  const availableSlots = modalSlots.filter(s => !s.fullyBooked)
  const selectedSlot = availableSlots.find(s => s.id === selectedSlotId)
  const modalPrices = availableSlots.map(s => s.price)
  const modalMinPrice = modalPrices.length ? Math.min(...modalPrices) : 0
  const modalAllSamePrice = modalPrices.length > 0 && modalPrices.every(p => p === modalPrices[0])
  const displayPrice = selectedSlot ? selectedSlot.price : modalMinPrice
  const showPriceRange = !selectedSlot && !modalAllSamePrice

  const validEntries = activeEntries.filter(e => {
    const slots = slotsByEntry[e.id] || []
    return slots.length > 0
  })

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
            <button key={ev.id} onClick={() => { setActiveId(ev.id); closeModal() }}
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

      {/* Model cards */}
      {!bookingOpen && activeEvent?.booking_open_at ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>予約受付開始</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: 0 }}>
            {formatOpenAt(activeEvent.booking_open_at)}〜
          </p>
        </div>
      ) : validEntries.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>モデル情報は準備中です。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          {validEntries.map(entry => {
            const model = entry.models
            const slots = slotsByEntry[entry.id] || []
            const cardPrices = slots.map(s => s.price)
            const cardMinPrice = cardPrices.length ? Math.min(...cardPrices) : 0
            const cardAllSame = cardPrices.length > 0 && cardPrices.every(p => p === cardPrices[0])
            const allFull = slots.length > 0 && slots.every(s => {
              const totalBookings = (bookingCounts || []).filter(b => b.slot_id === s.id).length
              return s.is_reserved && totalBookings >= (s.max_reservations || 1)
            })

            return (
              <div key={entry.id}
                onClick={() => !allFull && openModal(entry)}
                style={{ cursor: allFull ? 'default' : 'pointer', borderRadius: 14, overflow: 'hidden', border: '1px solid #e0ecf8', background: '#fff', opacity: allFull ? 0.6 : 1, transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { if (!allFull) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,53,96,0.12)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#f0f4fb' }}>
                  {model.image
                    ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👤</div>
                  }
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 2 }}>{model.name}</div>
                  {model.name_en && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{model.name_en}</div>}
                  <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
                    {allFull
                      ? <span style={{ color: '#c0a060', fontSize: 13 }}>満枠御礼</span>
                      : `¥${cardMinPrice.toLocaleString()}${cardAllSame ? '' : '〜'}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 700, width: '100%', display: 'flex', flexDirection: 'row', maxHeight: '90vh', position: 'relative' }}>
            {/* Photo */}
            <div style={{ width: '45%', flexShrink: 0, background: '#f0f4fb' }}>
              {modal.models.image
                ? <img src={modal.models.image} alt={modal.models.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>👤</div>
              }
            </div>
            {/* Info */}
            <div style={{ flex: 1, padding: '32px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>{modal.models.name}</div>
                {modal.models.name_en && <div style={{ fontSize: 13, color: '#aaa' }}>{modal.models.name_en}</div>}
              </div>

              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3560' }}>
                {availableSlots.length > 0
                  ? `¥${displayPrice.toLocaleString()}${showPriceRange ? '〜' : ''}`
                  : <span style={{ color: '#999', fontSize: 16 }}>満席</span>
                }
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>撮影時間を選択</label>
                  <select
                    value={selectedSlotId}
                    onChange={e => setSelectedSlotId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">選択してください</option>
                    {availableSlots.map(slot => (
                      <option key={slot.id} value={slot.id} disabled={slot.indoorFull && !slot.fullyBooked}>
                        {slot.slot_label}{slot.indoorFull ? '（企画定員超え割引）' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSlotId
                ? <Link href={`/confirm?slot_id=${selectedSlotId}`}
                    style={{ display: 'block', textAlign: 'center', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
                    予約する
                  </Link>
                : <div style={{ display: 'block', textAlign: 'center', background: '#ccc', color: '#fff', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
                    予約する
                  </div>
              }

              <Link href={`/models/${modal.models.id}`} style={{ textAlign: 'center', fontSize: 13, color: '#1a3560', textDecoration: 'none' }}>
                プロフィールを見る →
              </Link>

              {modal.models.twitter_url && (
                <a href={modal.models.twitter_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>
                  𝕏 /Twitter
                </a>
              )}
            </div>

            <button onClick={closeModal}
              style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>
              ×
            </button>
          </div>
        </div>
      )}

      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
