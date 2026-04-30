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

function loadSavedIds() {
  try { return new Set(JSON.parse(localStorage.getItem('pf_saved_events_list') || '[]')) } catch { return new Set() }
}

export default function AdminBookingStatusPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [fees, setFees] = useState(DEFAULT_FEES)
  const [editFees, setEditFees] = useState(false)
  const [costs, setCosts] = useState({ lunchCount: 0, lunchRate: 1000, studioCost: 0 })
  const [savedIds, setSavedIds] = useState(new Set())

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const ids = loadSavedIds()
    setSavedIds(ids)
    fetch('/api/admin/booking-status')
      .then(r => r.json())
      .then(({ events }) => {
        const items = events || []
        setData(items)
        const visible = items.filter(item => !(item.event.event_date < todayStr && ids.has(item.event.id)))
        const firstFuture = visible.find(item => item.event.event_date >= todayStr)
        setSelectedEventId((firstFuture || visible[0])?.event.id || null)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedEventId) return
    try {
      const savedFees = localStorage.getItem(`pf_fees_${selectedEventId}`)
      setFees(savedFees ? JSON.parse(savedFees) : DEFAULT_FEES)
    } catch { setFees(DEFAULT_FEES) }
    try {
      const saved = localStorage.getItem(`pf_costs_${selectedEventId}`)
      setCosts(saved ? JSON.parse(saved) : { lunchCount: 0, lunchRate: 1000, studioCost: 0 })
    } catch { setCosts({ lunchCount: 0, lunchRate: 1000, studioCost: 0 }) }
  }, [selectedEventId])

  function updateFee(tier, dur, value) {
    const next = { ...fees, [tier]: { ...fees[tier], [dur]: Number(value) || 0 } }
    setFees(next)
    if (selectedEventId) localStorage.setItem(`pf_fees_${selectedEventId}`, JSON.stringify(next))
  }

  function updateCost(key, value) {
    const next = { ...costs, [key]: Number(value) || 0 }
    setCosts(next)
    if (selectedEventId) localStorage.setItem(`pf_costs_${selectedEventId}`, JSON.stringify(next))
  }

  function handleSave(currentItem, revenue, labor, lunchTotal, grossProfit) {
    if (!currentItem) return
    if (!window.confirm(`${formatDate(currentItem.event.event_date)} の記録を保存して予約状況から削除しますか？`)) return

    const eventId = currentItem.event.id
    const record = {
      eventId,
      eventDate: currentItem.event.event_date,
      eventTitle: currentItem.event.title,
      eventType: currentItem.event.event_type,
      locationName: currentItem.event.location_name,
      revenue,
      labor,
      lunchTotal,
      lunchCount: costs.lunchCount || 0,
      lunchRate: costs.lunchRate || 0,
      studioCost: costs.studioCost || 0,
      grossProfit,
      savedAt: new Date().toISOString(),
      timeSlots: currentItem.timeSlots,
      rows: currentItem.rows.map(row => ({
        modelName: row.model.name,
        tier: row.model.price_tier,
        cells: Object.fromEntries(
          Object.entries(row.cells).map(([label, cell]) => [
            label,
            cell?.booking
              ? { booked: true, name: cell.booking.last_name, method: cell.booking.payment_method }
              : (cell ? { booked: false } : null)
          ])
        )
      }))
    }

    try {
      const list = JSON.parse(localStorage.getItem('pf_saved_events_list') || '[]')
      if (!list.includes(eventId)) list.push(eventId)
      localStorage.setItem('pf_saved_events_list', JSON.stringify(list))
      localStorage.setItem(`pf_saved_event_${eventId}`, JSON.stringify(record))
    } catch {}

    const newSavedIds = new Set([...savedIds, eventId])
    setSavedIds(newSavedIds)
    const newVisible = data.filter(item => !(item.event.event_date < todayStr && newSavedIds.has(item.event.id)))
    const next = newVisible.find(item => item.event.id !== eventId)
    setSelectedEventId(next?.event.id || null)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const visibleData = data.filter(item => !(item.event.event_date < todayStr && savedIds.has(item.event.id)))
  const futureItems = visibleData.filter(item => item.event.event_date >= todayStr)
  const pastItems = visibleData.filter(item => item.event.event_date < todayStr)
  const currentItem = visibleData.find(item => item.event.id === selectedEventId) || null
  const isPastEvent = currentItem ? currentItem.event.event_date < todayStr : false

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '14px 0 20px', borderBottom: '2px solid #e5e5e5' }}>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#1a3560', borderBottom: '2px solid #1a3560', marginBottom: -2, cursor: 'default' }}>予約状況</div>
        <Link href="/admin/bookings" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>予約一覧</Link>
        <Link href="/admin/sales" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>売上管理</Link>
      </div>

      {visibleData.length === 0 ? (
        <p style={{ color: '#999' }}>表示するイベントはありません。</p>
      ) : (
        <>
          {/* Event tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            {futureItems.map(item => {
              const isStreet = item.event.event_type === 'street'
              const active = selectedEventId === item.event.id
              return (
                <button key={item.event.id} onClick={() => setSelectedEventId(item.event.id)}
                  style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${active ? (isStreet ? '#388e3c' : '#3949ab') : '#e5e5e5'}`, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: active ? (isStreet ? '#e8f5e9' : '#e8eaf6') : '#fff', color: active ? (isStreet ? '#388e3c' : '#3949ab') : '#666' }}>
                  {formatDate(item.event.event_date)}
                  {item.event.title && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>{item.event.title}</span>}
                </button>
              )
            })}
            {pastItems.length > 0 && (
              <>
                {futureItems.length > 0 && <span style={{ color: '#ccc', fontSize: 18, margin: '0 4px' }}>|</span>}
                {pastItems.map(item => {
                  const active = selectedEventId === item.event.id
                  return (
                    <button key={item.event.id} onClick={() => setSelectedEventId(item.event.id)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${active ? '#e53935' : '#ffcdd2'}`, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: active ? '#ffebee' : '#fff5f5', color: active ? '#c62828' : '#e53935', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11 }}>⚠️</span>
                      {formatDate(item.event.event_date)}
                      <span style={{ fontSize: 10, background: '#e53935', color: '#fff', borderRadius: 3, padding: '1px 5px', marginLeft: 2 }}>要対応</span>
                    </button>
                  )
                })}
              </>
            )}
          </div>

          {!currentItem ? (
            <p style={{ color: '#999' }}>イベントを選択してください。</p>
          ) : currentItem.rows.length === 0 ? (
            <p style={{ color: '#999' }}>出演モデルがいません。</p>
          ) : (() => {
            let prevTier = null

            let revenue = 0, labor = 0
            for (const row of currentItem.rows) {
              for (const [label, cell] of Object.entries(row.cells)) {
                if (!cell?.booking) continue
                revenue += cell.price || 0
                if (row.model.price_tier !== 'staff') {
                  labor += fees[row.model.price_tier]?.[durationKey(label)] || 0
                }
              }
            }
            const lunchTotal = (costs.lunchCount || 0) * (costs.lunchRate || 0)
            const grossProfit = revenue - labor - lunchTotal - (costs.studioCost || 0)

            const inp = { padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right' }

            return (
              <>
                {/* 過去イベント警告バナー */}
                {isPastEvent && (
                  <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span style={{ fontSize: 13, color: '#795548', fontWeight: 600 }}>
                      この開催日は終了しています。経費を確認して「記録を保存」してください。
                    </span>
                  </div>
                )}

                {/* 予約グリッド */}
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #ddd' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3560', color: '#fff' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: 110, position: 'sticky', left: 0, background: '#1a3560', zIndex: 1 }}>モデル</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 400, minWidth: 54 }}>区分</th>
                        {currentItem.timeSlots.map(label => (
                          <th key={label} style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap', minWidth: 105, fontWeight: 600, fontSize: 12 }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentItem.rows.map((row, rowIdx) => {
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
                            {currentItem.timeSlots.map(label => {
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
                <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>利益管理</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>売上</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#388e3c' }}>¥{revenue.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>人件費（モデル報酬）</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#c62828' }}>−¥{labor.toLocaleString()}</span>
                    </div>

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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3560' }}>粗利益</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: grossProfit >= 0 ? '#388e3c' : '#c62828' }}>
                        ¥{grossProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 保存ボタン（過去イベントのみ） */}
                {isPastEvent && (
                  <div style={{ marginTop: 16, marginBottom: 32, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleSave(currentItem, revenue, labor, lunchTotal, grossProfit)}
                      style={{ background: '#c62828', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      記録を保存して予約状況から削除
                    </button>
                  </div>
                )}
                {!isPastEvent && <div style={{ marginBottom: 32 }} />}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
