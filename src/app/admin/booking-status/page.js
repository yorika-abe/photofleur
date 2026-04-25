'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TIER_META = {
  staff:   { label: '運営', color: '#1a3560', bg: '#dce8ff' },
  '12000': { label: '12000', color: '#6a1b9a', bg: '#f3e5f5' },
  '9900':  { label: '9900',  color: '#00695c', bg: '#e0f2f1' },
  '8900':  { label: '8900',  color: '#e65100', bg: '#fff3e0' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
}

export default function AdminBookingStatusPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/admin/booking-status')
      .then(r => r.json())
      .then(({ events }) => { setData(events || []); setLoading(false) })
  }, [])

  async function sendThanks() {
    const current = data[selectedIdx]
    if (!current) return
    if (!confirm(`${formatDate(current.event.event_date)} のご来場者全員にThanks Mailを送信しますか？`)) return
    setSending(true)
    const res = await fetch('/api/admin/send-thanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: current.event.id }),
    })
    const data2 = await res.json()
    setSending(false)
    alert(`Thanks Mailを ${data2.sent}件 送信しました。`)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '14px 0 20px', borderBottom: '2px solid #e5e5e5' }}>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#1a3560', borderBottom: '2px solid #1a3560', marginBottom: -2, cursor: 'default' }}>予約状況</div>
        <Link href="/admin/sales" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>売上管理</Link>
      </div>

      {data.length === 0 ? (
        <p style={{ color: '#999' }}>開催予定のイベントはありません。</p>
      ) : (
        <>
          {/* Event tabs + Thanks Mail */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            {data.map((item, i) => {
              const isStreet = item.event.event_type === 'street'
              const active = selectedIdx === i
              return (
                <button key={item.event.id} onClick={() => setSelectedIdx(i)}
                  style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${active ? (isStreet ? '#388e3c' : '#3949ab') : '#e5e5e5'}`, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: active ? (isStreet ? '#e8f5e9' : '#e8eaf6') : '#fff', color: active ? (isStreet ? '#388e3c' : '#3949ab') : '#666' }}>
                  {formatDate(item.event.event_date)}
                  <span style={{ marginLeft: 6, fontSize: 11 }}>{isStreet ? 'ストリート' : 'スタジオ'}</span>
                </button>
              )
            })}
            <button onClick={sendThanks} disabled={sending}
              style={{ marginLeft: 'auto', background: sending ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: sending ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
              {sending ? '送信中...' : '📮 Thanks Mail送信'}
            </button>
          </div>

          {/* Grid */}
          {(() => {
            const current = data[selectedIdx]
            if (!current) return null
            if (current.rows.length === 0) return <p style={{ color: '#999' }}>出演モデルがいません。</p>

            let prevTier = null

            return (
              <>
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #ddd' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3560', color: '#fff' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: 110, position: 'sticky', left: 0, background: '#1a3560', zIndex: 1 }}>モデル</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 400, minWidth: 54 }}>区分</th>
                        {current.timeSlots.map(label => (
                          <th key={label} style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap', minWidth: 105, fontWeight: 600, fontSize: 12 }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {current.rows.map((row, rowIdx) => {
                        const tier = TIER_META[row.model.price_tier]
                        const isNewGroup = row.model.price_tier !== prevTier
                        prevTier = row.model.price_tier

                        return (
                          <tr key={row.model.id}
                            style={{ borderTop: isNewGroup && rowIdx > 0 ? '2px solid #aaa' : '1px solid #e5e5e5', background: rowIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '8px 14px', fontWeight: 700, color: '#1a3560', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: rowIdx % 2 === 0 ? '#fff' : '#fafafa', zIndex: 1 }}>
                              {row.model.name}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>
                              {tier && (
                                <span style={{ fontSize: 10, background: tier.bg, color: tier.color, borderRadius: 3, padding: '2px 5px', fontWeight: 700 }}>{tier.label}</span>
                              )}
                            </td>
                            {current.timeSlots.map(label => {
                              const cell = row.cells[label]
                              if (!cell) {
                                return <td key={label} style={{ padding: '8px', textAlign: 'center', background: '#f0f0f0' }}>—</td>
                              }
                              const booking = cell.booking
                              if (!booking) {
                                return (
                                  <td key={label} style={{ padding: '8px', textAlign: 'center', background: '#e3f2fd' }}>
                                    <span style={{ fontSize: 20 }}>🈳</span>
                                  </td>
                                )
                              }
                              const isCard = booking.payment_method === 'card'
                              return (
                                <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: isCard ? '#e8f5e9' : '#fce4ec' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                    <span style={{ fontSize: 13 }}>{isCard ? '🟢' : '❌'}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{booking.last_name}</span>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>🈳</span> 空き</span>
                  <span>🟢 カード決済済み</span>
                  <span>❌ 現金払い</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>—</span> 出勤なし</span>
                </div>
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
