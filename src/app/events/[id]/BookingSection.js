'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function BookingSection({ entries, slotsByEntry, indoorCountBySlot, bookingCounts, bookingOpen, bookingOpenAt }) {
  const [modal, setModal] = useState(null) // entry
  const [selectedSlotId, setSelectedSlotId] = useState('')

  function openModal(entry) {
    setModal(entry)
    setSelectedSlotId('')
  }
  function closeModal() {
    setModal(null)
    setSelectedSlotId('')
  }

  if (!bookingOpen) {
    return (
      <div style={{ background: '#f8fbff', border: '1px solid #d6ecf5', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
        <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
          予約受付開始：<strong style={{ color: '#1a3560' }}>
            {new Date(bookingOpenAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </strong>
        </p>
      </div>
    )
  }

  const validEntries = (entries || []).filter(e => {
    if (!e.models) return false
    const slots = (slotsByEntry[e.id] || []).filter(s => s.slot_order !== 0)
    return slots.length > 0
  })

  if (validEntries.length === 0) {
    return <p style={{ color: '#999', marginBottom: 32 }}>予約枠はまだありません。</p>
  }

  // モーダル内のスロット情報
  const modalSlots = modal
    ? (slotsByEntry[modal.id] || []).filter(s => s.slot_order !== 0).map(slot => {
        const indoor = indoorCountBySlot[slot.id] || 0
        const maxIndoor = slot.max_reservations || 1
        const totalBookings = (bookingCounts || []).filter(b => b.slot_id === slot.id).length
        const indoorFull = indoor >= maxIndoor
        const fullyBooked = slot.is_reserved && indoorFull && totalBookings >= maxIndoor * 2
        return { ...slot, indoorFull, fullyBooked }
      })
    : []

  const availableSlots = modalSlots.filter(s => !s.fullyBooked)
  const basePrice = availableSlots[0]?.price || 0

  return (
    <>
      {/* モデルグリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
        {validEntries.map(entry => {
          const model = entry.models
          const slots = (slotsByEntry[entry.id] || []).filter(s => s.slot_order !== 0)
          const price = slots[0]?.price || 0
          const allFull = slots.every(s => {
            const indoor = indoorCountBySlot[s.id] || 0
            const totalBookings = (bookingCounts || []).filter(b => b.slot_id === s.id).length
            return s.is_reserved && indoor >= (s.max_reservations || 1) && totalBookings >= (s.max_reservations || 1) * 2
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
                  {allFull ? <span style={{ color: '#999' }}>満席</span> : `¥${price.toLocaleString()}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* モーダル */}
      {modal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 700, width: '100%', display: 'flex', flexDirection: 'row', maxHeight: '90vh' }}>
            {/* 写真 */}
            <div style={{ width: '45%', flexShrink: 0, background: '#f0f4fb' }}>
              {modal.models.image
                ? <img src={modal.models.image} alt={modal.models.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>👤</div>
              }
            </div>
            {/* 情報 */}
            <div style={{ flex: 1, padding: '32px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>{modal.models.name}</div>
                {modal.models.name_en && <div style={{ fontSize: 13, color: '#aaa' }}>{modal.models.name_en}</div>}
              </div>

              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3560' }}>
                ¥{basePrice.toLocaleString()}
              </div>

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
                      {slot.slot_label}{slot.indoorFull ? '（屋外のみ）' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSlotId && (
                <Link href={`/confirm?slot_id=${selectedSlotId}`}
                  style={{ display: 'block', textAlign: 'center', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
                  予約する
                </Link>
              )}
              {!selectedSlotId && (
                <div style={{ display: 'block', textAlign: 'center', background: '#ccc', color: '#fff', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
                  予約する
                </div>
              )}

              <Link href={`/models/${modal.models.id}`} style={{ textAlign: 'center', fontSize: 13, color: '#1a3560', textDecoration: 'none' }}>
                プロフィールを見る →
              </Link>

              <button onClick={closeModal}
                style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
