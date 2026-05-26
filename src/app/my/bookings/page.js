'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

const typeColors = {
  street: { bg: '#e0f7fa', color: '#0097a7', label: 'ストリート' },
  studio: { bg: '#fce4ec', color: '#c2185b', label: 'スタジオ' },
  irregular: { bg: '#e3f2fd', color: '#1a3560', label: '不定期' },
  private: { bg: '#f3e5f5', color: '#7b1fa2', label: 'リクエスト撮影' },
}

function QrButton({ verifyUrl }) {
  const [open, setOpen] = useState(false)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 12, fontWeight: 700, color: '#1a3560', background: '#e8f0fb', border: '1px solid #c5d8f5', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
        {open ? 'QRを閉じる' : '📱 受付QRを表示'}
      </button>
      {open && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <img src={qrSrc} alt="受付QRコード" style={{ width: 160, height: 160, borderRadius: 8, border: '1px solid #ddd' }} />
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>当日受付でご提示ください</div>
        </div>
      )}
    </div>
  )
}

export default function AllBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/my/bookings'; return }
      const res = await fetch('/api/customer/bookings')
      const { bookings } = await res.json()
      setBookings(bookings || [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 同日・非キャンセルの qr_token を集約
  const dateTokensMap = {}
  for (const b of bookings) {
    if (!b.cancelled_at && b.qr_token && b.event_date) {
      if (!dateTokensMap[b.event_date]) dateTokensMap[b.event_date] = []
      dateTokensMap[b.event_date].push(b.qr_token)
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/my" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← マイページ</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: '12px 0 28px' }}>予約履歴 すべて</h1>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#bbb' }}>
          <p style={{ marginBottom: 16 }}>まだ予約履歴がありません。</p>
          <Link href="/schedule" style={{ color: '#1a3560', fontWeight: 600 }}>スケジュールを見る →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => {
            const tokens = !b.cancelled_at && b.qr_token && b.event_date
              ? (dateTokensMap[b.event_date] || [b.qr_token])
              : []
            const verifyUrl = tokens.length > 1
              ? `${SITE_URL}/booking-verify?tokens=${tokens.join(',')}`
              : tokens.length === 1 ? `${SITE_URL}/booking-verify?token=${tokens[0]}` : null
            const isUpcoming = b.event_date && b.event_date >= today

            return (
              <BookingCard
                key={`${b.booking_type}-${b.id}`}
                b={b}
                verifyUrl={isUpcoming ? verifyUrl : null}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function BookingCard({ b, verifyUrl }) {
  const tc = typeColors[b.event_type] || { bg: '#f5f5f5', color: '#888', label: '' }
  const isPaid = b.payment_method === 'card'
  const isCancelled = !!b.cancelled_at

  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: 12,
      border: `1px solid ${isCancelled ? '#e0e0e0' : '#e0ecf8'}`,
      background: isCancelled ? '#fafafa' : '#f8fbff',
      opacity: isCancelled ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {tc.label && (
              <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                {tc.label}
              </span>
            )}
            {isCancelled && (
              <span style={{ fontSize: 11, background: '#ffebee', color: '#c62828', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                キャンセル済み
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{formatDate(b.event_date)}</span>
          </div>
          {b.event_title && <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 2 }}>{b.event_title}</div>}
          {b.location_name && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{b.location_name}</div>}
          {b.slot_label && <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{b.slot_label}</div>}
          {b.model_name && <div style={{ fontSize: 13, color: '#888' }}>モデル：{b.model_name}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 16 }}>¥{(b.final_price || 0).toLocaleString()}</div>
          {!isCancelled && b.payment_method && (
            <div style={{ fontSize: 12, color: isPaid ? '#0097a7' : '#1565c0', marginTop: 4 }}>
              {isPaid ? '💳 カード払い' : '💴 現金払い'}
            </div>
          )}
        </div>
      </div>
      {verifyUrl && <QrButton verifyUrl={verifyUrl} />}
    </div>
  )
}
