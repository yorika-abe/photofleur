'use client'

import { Suspense, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

function CompleteContent() {
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(null)
  const [slot, setSlot] = useState(null)
  const [model, setModel] = useState(null)
  const [event, setEvent] = useState(null)
  const [qrToken, setQrToken] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slotId = params.get('slot_id')
    const email = params.get('email')
    const qr = params.get('qr')
    if (qr) setQrToken(qr)

    if (!slotId || !email) { setLoading(false); return }

    async function load() {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('slot_id', slotId)
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setBooking(bookingData)

      const { data: slotData } = await supabase
        .from('booking_slots')
        .select('*, event_entry_id')
        .eq('id', slotId)
        .single()
      setSlot(slotData)

      if (slotData?.event_entry_id) {
        const { data: entry } = await supabase
          .from('event_entries')
          .select('model_id, event_id')
          .eq('id', slotData.event_entry_id)
          .single()

        if (entry) {
          const [{ data: modelData }, { data: eventData }] = await Promise.all([
            supabase.from('models').select('name, image').eq('id', entry.model_id).single(),
            supabase.from('events').select('event_date, location_name, event_type').eq('id', entry.event_id).single(),
          ])
          setModel(modelData)
          setEvent(eventData)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const qrImageUrl = qrToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken)}`
    : null

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: 0 }}>ご予約ありがとうございます</h1>
        </div>

        <p style={{ color: '#555', lineHeight: 1.8, marginBottom: 24, textAlign: 'center' }}>
          ご予約を受け付けました。確認メールをお送りしましたのでご確認ください。
        </p>

        {/* Booking details */}
        <div style={{ background: '#f8fbff', borderRadius: 12, padding: '20px', marginBottom: 24, border: '1px solid #d6ecf5' }}>
          {model && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {model.image && <img src={model.image} alt={model.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />}
              <span style={{ fontWeight: 700, fontSize: 17, color: '#1a3560' }}>{model.name}</span>
            </div>
          )}
          <div style={{ fontSize: 14, color: '#555', lineHeight: 2.2 }}>
            {booking && <div><strong>お名前：</strong>{booking.name}</div>}
            {event && <div><strong>開催日：</strong>{formatDate(event.event_date)}</div>}
            {slot && <div><strong>予約枠：</strong>{slot.slot_label}</div>}
            {booking?.is_outdoor && <div style={{ color: '#e65100' }}><strong>撮影形式：</strong>屋外撮影</div>}
            {booking && <div><strong>料金：</strong>¥{(booking.final_price || slot?.price || 0).toLocaleString()}</div>}
          </div>
        </div>

        {/* QR Code */}
        {qrImageUrl && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>当日受付時にこのQRコードをご提示ください</div>
            <img src={qrImageUrl} alt="受付QRコード" style={{ width: 160, height: 160, border: '1px solid #e5e5e5', borderRadius: 8 }} />
          </div>
        )}

        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.9, marginBottom: 28 }}>
          {event?.event_type === 'street' ? (
            <p>※ストリート撮影の集合場所は、開催3日前にメールでご案内します。</p>
          ) : (
            <p>※当日の詳細は、開催前日までにメールでご案内します。</p>
          )}
          <p>※ご不明点は公式LINEよりお問い合わせください。</p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/schedule" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
            スケジュール一覧
          </Link>
          <Link href="/" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', border: '2px solid #1a3560', color: '#1a3560', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
            トップへ
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>}>
      <CompleteContent />
    </Suspense>
  )
}
