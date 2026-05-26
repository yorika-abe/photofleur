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
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#1a3560', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginBottom: open ? 12 : 0 }}>
        {open ? 'QRコードを閉じる' : '📱 QRコードを表示'}
      </button>
      {open && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <img src={qrSrc} alt="受付QRコード" style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid #ddd' }} />
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>当日受付でご提示ください</div>
        </div>
      )}
    </div>
  )
}

export default function AllBookingsPage() {
  const [groups, setGroups] = useState([])
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
      const all = bookings || []

      // 同日グループにまとめる
      const dateMap = {}
      for (const b of all) {
        const key = b.event_date || 'unknown'
        if (!dateMap[key]) dateMap[key] = []
        dateMap[key].push(b)
      }

      const sorted = Object.entries(dateMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, items]) => ({ date, items }))

      setGroups(sorted)
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

      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#bbb' }}>
          <p style={{ marginBottom: 16 }}>まだ予約履歴がありません。</p>
          <Link href="/schedule" style={{ color: '#1a3560', fontWeight: 600 }}>スケジュールを見る →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.map(({ date, items }) => {
            const isUpcoming = date >= today
            const nonCancelled = items.filter(b => !b.cancelled_at)
            const regularWithToken = nonCancelled.filter(b => b.booking_type === 'regular' && b.qr_token)
            const privateWithToken = nonCancelled.filter(b => b.booking_type === 'private' && b.qr_token)

            let verifyUrl = null
            if (isUpcoming && regularWithToken.length > 1) {
              verifyUrl = `${SITE_URL}/booking-verify?tokens=${regularWithToken.map(b => b.qr_token).join(',')}`
            } else if (isUpcoming && regularWithToken.length === 1) {
              verifyUrl = `${SITE_URL}/booking-verify?token=${regularWithToken[0].qr_token}`
            } else if (isUpcoming && privateWithToken.length === 1) {
              verifyUrl = `${SITE_URL}/booking-verify?token=${privateWithToken[0].qr_token}`
            }

            return (
              <div key={date} style={{ border: '1px solid #dce8f5', borderRadius: 14, overflow: 'hidden', background: isUpcoming ? '#f8fbff' : '#fafafa' }}>
                <div style={{ background: isUpcoming ? '#1a3560' : '#e0e0e0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isUpcoming ? '#fff' : '#666' }}>
                    {date === 'unknown' ? '日程未定' : formatDate(date)}
                  </div>
                  {isUpcoming && items.some(b => b.location_name) && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                      📍 {items.find(b => b.location_name)?.location_name}
                    </div>
                  )}
                </div>

                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(b => <BookingCard key={`${b.booking_type}-${b.id}`} b={b} />)}

                  {verifyUrl && (
                    <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid #e0ecf8' }}>
                      <QrButton verifyUrl={verifyUrl} />
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

function BookingCard({ b }) {
  const tc = typeColors[b.event_type] || { bg: '#f5f5f5', color: '#888', label: '' }
  const isPaid = b.payment_method === 'card'
  const isCancelled = !!b.cancelled_at

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 10,
      border: `1px solid ${isCancelled ? '#e0e0e0' : '#e0ecf8'}`,
      background: isCancelled ? '#f5f5f5' : '#fff',
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
          </div>
          {b.event_title && <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 2 }}>{b.event_title}</div>}
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
    </div>
  )
}
