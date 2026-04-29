'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TIER_META = {
  staff:   { label: '運営', color: '#1a3560', bg: '#dce8ff' },
  '12000': { label: '12000', color: '#6a1b9a', bg: '#f3e5f5' },
  '9900':  { label: '9900',  color: '#00695c', bg: '#e0f2f1' },
  '8900':  { label: '8900',  color: '#e65100', bg: '#fff3e0' },
}

const DEFAULT_FEES = {
  '12000': { '45': 3500, '60': 4000, '90': 6000 },
  '9900':  { '45': 3000, '60': 3500, '90': 5000 },
  '8900':  { '45': 2500, '60': 3000, '90': 4500 },
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
}

function durationKey(label) {
  const m = label.match(/(\d+):(\d+)[~〜](\d+):(\d+)/)
  if (!m) return '90'
  const mins = (parseInt(m[3]) * 60 + parseInt(m[4])) - (parseInt(m[1]) * 60 + parseInt(m[2]))
  return mins < 55 ? '45' : mins < 75 ? '60' : '90'
}

export default function AdminBookingStatusPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [fees, setFees] = useState(DEFAULT_FEES)
  const [editFees, setEditFees] = useState(false)
  const [costs, setCosts] = useState({ lunchCount: 0, lunchRate: 1000, studioCost: 0 })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pf_fees')
      if (saved) setFees(JSON.parse(saved))
    } catch {}
    fetch('/api/admin/booking-status')
      .then(r => r.json())
      .then(({ events }) => { setData(events || []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!data[selectedIdx]) return
    const eventId = data[selectedIdx].event.id
    try {
      const saved = localStorage.getItem(`pf_costs_${eventId}`)
      setCosts(saved ? JSON.parse(saved) : { lunchCount: 0, lunchRate: 1000, studioCost: 0 })
    } catch {
      setCosts({ lunchCount: 0, lunchRate: 1000, studioCost: 0 })
    }
  }, [selectedIdx, data])

  function updateFee(tier, dur, value) {
    const next = { ...fees, [tier]: { ...fees[tier], [dur]: Number(value) || 0 } }
    setFees(next)
    localStorage.setItem('pf_fees', JSON.stringify(next))
  }

  function updateCost(key, value) {
    const next = { ...costs, [key]: Number(value) || 0 }
    setCosts(next)
    const eventId = data[selectedIdx]?.event.id
    if (eventId) localStorage.setItem(`pf_costs_${eventId}`, JSON.stringify(next))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '14px 0 20px', borderBottom: '2px solid #e5e5e5' }}>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#1a3560', borderBottom: '2px solid #1a3560', marginBottom: -2, cursor: 'default' }}>予約状況</div>
        <Link href="/admin/bookings" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>予約一覧</Link>
        <Link href="/admin/sales" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>売上管理</Link>
      </div>

      {data.length === 0 ? (
        <p style={{ color: '#999' }}>開催予定のイベントはありません。</p>
      ) : (
        <>
          {/* Event tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
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
          </div>

          {(() => {
            const current = data[selectedIdx]
            if (!current) return null
            if (current.rows.length === 0) return <p style={{ color: '#999' }}>出演モデルがいません。</p>

            let prevTier = null

            // 売上・人件費 計算
            let revenue = 0, labor = 0
            for (const row of current.rows) {
              for (const [label, cell] of Object.entries(row.cells)) {
                if (!cell?.booking) continue
                revenue += cell.price || 0
                if (row.model.price_tier !== 'staff') {
                  const dur = durationKey(label)
                  labor += fees[row.model.price_tier]?.[dur] || 0
                }
              }
            }
            const lunchTotal = (costs.lunchCount || 0) * (costs.lunchRate || 0)
            const grossProfit = revenue - labor - lunchTotal - (costs.studioCost || 0)

            const inp = { padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right' }

            return (
              <>
                {/* 予約グリッド */}
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
                              {tier && <span style={{ fontSize: 10, background: tier.bg, color: tier.color, borderRadius: 3, padding: '2px 5px', fontWeight: 700 }}>{tier.label}</span>}
                            </td>
                            {current.timeSlots.map(label => {
                              const cell = row.cells[label]
                              if (!cell) return <td key={label} style={{ padding: '8px', textAlign: 'center', background: '#f0f0f0' }}>—</td>
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

                {/* 凡例 */}
                <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>🈳</span> 空き</span>
                  <span>🟢 カード決済済み</span>
                  <span>❌ 現金払い</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>—</span> 出勤なし</span>
                </div>

                {/* 報酬メモ */}
                <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>報酬</span>
                    <button onClick={() => setEditFees(!editFees)}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #ddd', background: editFees ? '#1a3560' : '#fff', color: editFees ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600 }}>
                      {editFees ? '完了' : '編集'}
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '6px 14px', textAlign: 'left', fontWeight: 600, color: '#888', background: '#f8f8f8', borderRadius: '4px 0 0 4px', border: '1px solid #eee' }}></th>
                          {['45分', '60分', '90分'].map(d => (
                            <th key={d} style={{ padding: '6px 20px', textAlign: 'center', fontWeight: 600, color: '#555', background: '#f8f8f8', border: '1px solid #eee' }}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[['12000', '#f3e5f5', '#6a1b9a'], ['9900', '#e0f2f1', '#00695c'], ['8900', '#fff3e0', '#e65100']].map(([tier, bg, color]) => (
                          <tr key={tier}>
                            <td style={{ padding: '8px 14px', fontWeight: 700, color, background: bg, border: '1px solid #eee', whiteSpace: 'nowrap' }}>{tier}モデル</td>
                            {['45', '60', '90'].map(dur => (
                              <td key={dur} style={{ padding: '8px 20px', textAlign: 'center', border: '1px solid #eee' }}>
                                {editFees ? (
                                  <input type="number" min="0" value={fees[tier]?.[dur] ?? 0}
                                    onChange={e => updateFee(tier, dur, e.target.value)}
                                    style={{ ...inp, width: 72 }} />
                                ) : (
                                  <span style={{ fontWeight: 600, color: '#333' }}>¥{(fees[tier]?.[dur] || 0).toLocaleString()}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 利益管理 */}
                <div style={{ marginTop: 16, marginBottom: 32, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>利益管理</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* 売上 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>売上</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#388e3c' }}>¥{revenue.toLocaleString()}</span>
                    </div>

                    {/* 人件費 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>人件費（モデル報酬）</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#c62828' }}>−¥{labor.toLocaleString()}</span>
                    </div>

                    {/* お昼代 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>お昼代</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input type="number" min="0" value={costs.lunchCount}
                          onChange={e => updateCost('lunchCount', e.target.value)}
                          style={{ ...inp, width: 50 }} />
                        <span style={{ color: '#777' }}>人 ×</span>
                        <input type="number" min="0" value={costs.lunchRate}
                          onChange={e => updateCost('lunchRate', e.target.value)}
                          style={{ ...inp, width: 68 }} />
                        <span style={{ color: '#777' }}>円 =</span>
                        <span style={{ fontWeight: 700, color: '#c62828', minWidth: 70, textAlign: 'right' }}>−¥{lunchTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* スタジオ代・衣装代 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '2px solid #ddd', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>スタジオ代・衣装代</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input type="number" min="0" value={costs.studioCost}
                          onChange={e => updateCost('studioCost', e.target.value)}
                          style={{ ...inp, width: 90 }} />
                        <span style={{ color: '#777' }}>円 =</span>
                        <span style={{ fontWeight: 700, color: '#c62828', minWidth: 70, textAlign: 'right' }}>−¥{(costs.studioCost || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 粗利益 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3560' }}>粗利益</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: grossProfit >= 0 ? '#388e3c' : '#c62828' }}>
                        ¥{grossProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
