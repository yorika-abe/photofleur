'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

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
}

export default function AllBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

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
          {bookings.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  )
}

function BookingCard({ b }) {
  const tc = typeColors[b.event_type] || { bg: '#f5f5f5', color: '#888', label: '' }
  const isPaid = b.payment_method === 'card'
  return (
    <div style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e0ecf8', background: '#f8fbff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {tc.label && <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{tc.label}</span>}
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{formatDate(b.event_date)}</span>
          </div>
          {b.event_title && <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 2 }}>{b.event_title}</div>}
          {b.location_name && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{b.location_name}</div>}
          <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{b.slot_label}</div>
          {b.model_name && <div style={{ fontSize: 13, color: '#888' }}>モデル：{b.model_name}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 16 }}>¥{(b.final_price || 0).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: isPaid ? '#0097a7' : '#1565c0', marginTop: 4 }}>
            {isPaid ? '💳 カード払い' : '💴 現金払い'}
          </div>
        </div>
      </div>
    </div>
  )
}
