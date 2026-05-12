'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'

export default function BookingSection({ entries, slotsByEntry, indoorCountBySlot, indoorCountByLabel, studioCapacity, eventType, bookingCounts, bookingOpen, bookingOpenAt, eventDate = '', eventLocation = '' }) {
  const [modal, setModal] = useState(null) // entry
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [cartAdded, setCartAdded] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const { addItem } = useCart()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customer/profile').then(r => r.json()).then(({ email }) => {
      setIsLoggedIn(!!email)
    }).catch(() => setIsLoggedIn(false))
  }, [])

  function requireLogin(action) {
    if (isLoggedIn === true) { action(); return }
    setShowLoginPrompt(true)
  }

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
    const slots = (slotsByEntry[e.id] || [])
    return slots.length > 0
  })

  if (validEntries.length === 0) {
    return <p style={{ color: '#999', marginBottom: 32 }}>予約枠はまだありません。</p>
  }

  // モーダル内のスロット情報
  const modalSlots = modal
    ? (slotsByEntry[modal.id] || []).map(slot => {
        const totalBookings = (bookingCounts || []).filter(b => b.slot_id === slot.id).length
        // スタジオ：同時間帯の全モデル合計屋内予約数 vs スタジオ定員
        // その他：表示しない
        const indoorFull = eventType === 'studio' && studioCapacity
          ? (indoorCountByLabel[slot.slot_label] || 0) >= studioCapacity
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

  return (
    <>
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560', marginBottom: 8 }}>ログインが必要です</div>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>予約するにはログインしてください。</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="/login" style={{ display: 'block', padding: '12px', borderRadius: 10, background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>ログインする</a>
              <button onClick={() => setShowLoginPrompt(false)} style={{ padding: '10px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
      {/* モデルグリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 40 }}>
        {validEntries.map(entry => {
          const model = entry.models
          const slots = slotsByEntry[entry.id] || []
          const cardPrices = slots.map(s => s.price)
          const cardMinPrice = cardPrices.length ? Math.min(...cardPrices) : 0
          const cardAllSame = cardPrices.length > 0 && cardPrices.every(p => p === cardPrices[0])
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
              <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: '#f0f4fb' }}>
                {model.image
                  ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👤</div>
                }
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 2 }}>{model.name}</div>
                {model.name_en && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{model.name_en}</div>}
                <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
                  {allFull ? <span style={{ color: '#e53935', fontWeight: 700, fontSize: 12 }}>満枠御礼</span> : `¥${cardMinPrice.toLocaleString()}${cardAllSame ? '' : '〜'}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* モーダル */}
      {modal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <style>{`
            .booking-modal-inner { display: flex; flex-direction: row; }
            .booking-modal-image { width: 45%; flex-shrink: 0; background: #f0f4fb; }
            .booking-modal-body { flex: 1; padding: 32px 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 20; }
            @media (max-width: 600px) {
              .booking-modal-inner { flex-direction: column; }
              .booking-modal-image { width: 100% !important; height: 220px; flex-shrink: 0; }
              .booking-modal-body { padding: 20px 18px; }
            }
          `}</style>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="booking-modal-inner">
            {/* 写真 */}
            <div className="booking-modal-image">
              {modal.models.image
                ? <img src={modal.models.image} alt={modal.models.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>👤</div>
              }
            </div>
            {/* 情報 */}
            <div className="booking-modal-body">
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>{modal.models.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {modal.models.name_en && <div style={{ fontSize: 13, color: '#aaa' }}>{modal.models.name_en}</div>}
                </div>
              </div>

              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3560' }}>
                ¥{displayPrice.toLocaleString()}{showPriceRange ? '〜' : ''}
              </div>

              {availableSlots.length === 0 ? (
                <div style={{ background: '#f8fbff', border: '1px solid #b8d9f0', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: '#1a3560', letterSpacing: 2 }}>満枠御礼</div>
                  <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>ご予約可能な枠がございません。</p>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>撮影時間を選択</label>
                    <select
                      value={selectedSlotId}
                      onChange={e => setSelectedSlotId(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="">選択してください</option>
                      {modalSlots.map(slot => (
                        <option key={slot.id} value={slot.id} disabled={slot.fullyBooked || (slot.indoorFull && !slot.fullyBooked)}>
                          {slot.slot_label}{slot.fullyBooked ? '（在庫なし）' : slot.indoorFull ? '（企画定員超え割引）' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSlotId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={() => requireLogin(() => router.push(`/confirm?slot_id=${selectedSlotId}`))}
                        style={{ display: 'block', width: '100%', textAlign: 'center', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                        今すぐ予約する
                      </button>
                      <button onClick={() => requireLogin(() => {
                        const slot = availableSlots.find(s => s.id === selectedSlotId)
                        addItem({
                          type: 'slot',
                          slotId: selectedSlotId,
                          name: modal.models.name,
                          image: modal.models.image,
                          slotLabel: slot?.slot_label || '',
                          eventDate,
                          eventLocation,
                          price: slot?.price || 0,
                        })
                        setCartAdded(true)
                        setTimeout(() => setCartAdded(false), 2500)
                      })}
                        style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px solid #1a3560', background: cartAdded ? '#e8f5e9' : '#fff', color: cartAdded ? '#2e7d32' : '#1a3560', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        {cartAdded ? '✓ カートに追加しました' : '🛒 カートに追加'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'block', textAlign: 'center', background: '#ccc', color: '#fff', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
                      予約する
                    </div>
                  )}
                </>
              )}

              <Link href={`/models/${modal.models.id}`} style={{ textAlign: 'center', fontSize: 13, color: '#1a3560', textDecoration: 'none' }}>
                プロフィールを見る →
              </Link>

              {modal.models.twitter_url && (
                <a href={modal.models.twitter_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>
                  𝕏 /Twitter
                </a>
              )}

              <button onClick={closeModal}
                style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>
                ×
              </button>
            </div>
            </div>{/* booking-modal-inner */}
          </div>
        </div>
      )}
    </>
  )
}
