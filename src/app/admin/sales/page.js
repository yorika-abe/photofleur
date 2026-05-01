'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function yen(n) { return `¥${(n || 0).toLocaleString()}` }

function monthLabel(m) {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return `${y}年${parseInt(mo)}月`
}

function formatEventDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
}

function loadSavedRecords() {
  try {
    const list = JSON.parse(localStorage.getItem('pf_saved_events_list') || '[]')
    return list.map(id => {
      try { return JSON.parse(localStorage.getItem(`pf_saved_event_${id}`) || 'null') } catch { return null }
    }).filter(Boolean)
  } catch { return [] }
}

function loadMiscExpenses() {
  try { return JSON.parse(localStorage.getItem('pf_misc_expenses') || '{}') } catch { return {} }
}

const TIER_META = {
  staff:   { label: '運営', color: '#1a3560', bg: '#dce8ff' },
  '12000': { label: '12000', color: '#6a1b9a', bg: '#f3e5f5' },
  '9900':  { label: '9900',  color: '#00695c', bg: '#e0f2f1' },
  '8900':  { label: '8900',  color: '#e65100', bg: '#fff3e0' },
}

export default function AdminSalesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savedRecords, setSavedRecords] = useState([])
  const [miscExpenses, setMiscExpenses] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [expandedYears, setExpandedYears] = useState({})
  const [expandedRecords, setExpandedRecords] = useState({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    setSavedRecords(loadSavedRecords())
    setMiscExpenses(loadMiscExpenses())
    load()
  }, [])

  async function load() {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, name, email, final_price, is_outdoor, created_at, slot_id')
      .is('cancelled_at', null)
      .order('created_at', { ascending: false })

    if (!bookings) { setLoading(false); return }

    const slotIds = [...new Set(bookings.map(b => b.slot_id).filter(Boolean))]
    const { data: slots } = slotIds.length
      ? await supabase.from('booking_slots').select('id, slot_label, price, event_entry_id').in('id', slotIds)
      : { data: [] }

    const entryIds = [...new Set((slots || []).map(s => s.event_entry_id).filter(Boolean))]
    const { data: entries } = entryIds.length
      ? await supabase.from('event_entries').select('id, event_id, model_id').in('id', entryIds)
      : { data: [] }

    const eventIds = [...new Set((entries || []).map(e => e.event_id).filter(Boolean))]
    const modelIds = [...new Set((entries || []).map(e => e.model_id).filter(Boolean))]

    const [{ data: events }, { data: models }] = await Promise.all([
      eventIds.length ? supabase.from('events').select('id, event_date, event_type').in('id', eventIds) : { data: [] },
      modelIds.length ? supabase.from('models').select('id, name, image').in('id', modelIds) : { data: [] },
    ])

    const slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]))
    const entryMap = Object.fromEntries((entries || []).map(e => [e.id, e]))
    const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))
    const modelMap = Object.fromEntries((models || []).map(m => [m.id, m]))

    const enriched = bookings.map(b => {
      const slot = slotMap[b.slot_id] || {}
      const entry = entryMap[slot.event_entry_id] || {}
      const event = eventMap[entry.event_id] || {}
      const model = modelMap[entry.model_id] || {}
      const revenue = b.final_price || slot.price || 0
      return { ...b, slot, event, model, revenue }
    })

    setData(enriched)
    setLoading(false)
  }

  function updateMiscExpense(month, value) {
    const next = { ...miscExpenses, [month]: Number(value) || 0 }
    setMiscExpenses(next)
    try { localStorage.setItem('pf_misc_expenses', JSON.stringify(next)) } catch {}
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>
  if (!data) return null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nextMonthDate = new Date(currentYear, now.getMonth() + 1, 1)
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

  // Collect all months by event_date
  const allMonthsSet = new Set([currentMonth, nextMonth])
  for (const b of data) {
    const m = b.event?.event_date?.slice(0, 7)
    if (m) allMonthsSet.add(m)
  }
  for (const r of savedRecords) {
    const m = r.eventDate?.slice(0, 7)
    if (m) allMonthsSet.add(m)
  }
  const sortedMonths = [...allMonthsSet].sort().reverse()
  const prominentMonths = [nextMonth, currentMonth].filter(m => sortedMonths.includes(m))
  const olderMonths = sortedMonths.filter(m => m !== currentMonth && m !== nextMonth)
  const olderCurrentYear = olderMonths.filter(m => m.startsWith(String(currentYear)))
  const olderPrevYears = {}
  for (const m of olderMonths.filter(m => !m.startsWith(String(currentYear)))) {
    const y = m.slice(0, 4)
    if (!olderPrevYears[y]) olderPrevYears[y] = []
    olderPrevYears[y].push(m)
  }
  const prevYearsSorted = Object.keys(olderPrevYears).sort().reverse()

  // If no month selected, default to currentMonth
  const activeMonth = selectedMonth || currentMonth

  // Per-month calculations
  function monthData(month) {
    const bookingsInMonth = data.filter(b => b.event?.event_date?.slice(0, 7) === month)
    const revenue = bookingsInMonth.reduce((s, b) => s + b.revenue, 0)
    const recordsInMonth = savedRecords.filter(r => r.eventDate?.slice(0, 7) === month)
    const grossProfit = recordsInMonth.reduce((s, r) => s + (r.grossProfit || 0), 0)
    const misc = miscExpenses[month] || 0
    const netProfit = grossProfit - Math.round(revenue * 0.036) - misc
    return { bookings: bookingsInMonth, revenue, records: recordsInMonth, grossProfit, misc, netProfit }
  }

  // Year-level KPI (by event_date)
  const yearStr = String(currentYear)
  const yearRevenue = data.filter(b => b.event?.event_date?.startsWith(yearStr)).reduce((s, b) => s + b.revenue, 0)
  const cmData = monthData(currentMonth)
  const currentMonthGrossProfit = savedRecords.filter(r => r.eventDate?.slice(0, 7) === currentMonth).reduce((s, r) => s + (r.grossProfit || 0), 0)
  const currentMonthNetProfit = currentMonthGrossProfit - Math.round(cmData.revenue * 0.036) - (miscExpenses[currentMonth] || 0)

  const activeData = monthData(activeMonth)

  // Model breakdown for active month
  const byModel = {}
  for (const b of activeData.bookings) {
    const key = b.model?.id || 'unknown'
    if (!byModel[key]) byModel[key] = { name: b.model?.name || '不明', image: b.model?.image, count: 0, revenue: 0 }
    byModel[key].count++
    byModel[key].revenue += b.revenue
  }
  const modelEntries = Object.values(byModel).sort((a, b) => b.revenue - a.revenue)
  const maxModelRevenue = Math.max(...modelEntries.map(m => m.revenue), 1)

  const byType = { street: { count: 0, revenue: 0 }, studio: { count: 0, revenue: 0 } }
  for (const b of activeData.bookings) {
    const t = b.event?.event_type === 'street' ? 'street' : 'studio'
    byType[t].count++
    byType[t].revenue += b.revenue
  }

  const tabStyle = (m) => {
    const active = activeMonth === m
    return {
      padding: '10px 20px', borderRadius: 10, border: `2px solid ${active ? '#1a3560' : '#e5e5e5'}`,
      cursor: 'pointer', fontWeight: 700, fontSize: 14, background: active ? '#1a3560' : '#fff',
      color: active ? '#fff' : '#555'
    }
  }

  const compactTabStyle = (m) => {
    const active = activeMonth === m
    return {
      padding: '6px 14px', borderRadius: 8, border: `1px solid ${active ? '#1a3560' : '#ddd'}`,
      cursor: 'pointer', fontWeight: 600, fontSize: 12, background: active ? '#f0f4ff' : '#fff',
      color: active ? '#1a3560' : '#777'
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '14px 0 28px', borderBottom: '2px solid #e5e5e5' }}>
        <Link href="/admin/booking-status" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>予約状況</Link>
        <Link href="/admin/bookings" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>予約一覧</Link>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#1a3560', borderBottom: '2px solid #1a3560', marginBottom: -2, cursor: 'default' }}>売上管理</div>
        <Link href="/admin/booking-status?tab=history" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>履歴</Link>
      </div>

      {/* 年次KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: `${currentYear}年総売上`, value: yen(yearRevenue), sub: `開催日ベース`, color: '#2f2244' },
          { label: '今月売上', value: yen(cmData.revenue), sub: `${cmData.bookings.length}件（開催日ベース）`, color: '#388e3c' },
          { label: '今月粗利益', value: yen(currentMonthGrossProfit), sub: '保存済み記録から集計', color: '#3949ab' },
          { label: '今月純利益', value: yen(currentMonthNetProfit), sub: `粗利-手数料-諸々経費`, color: currentMonthNetProfit >= 0 ? '#00695c' : '#c62828' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px', border: `2px solid ${s.color}18`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 月タブ */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10, fontWeight: 600 }}>開催月で絞り込む</div>

        {/* 当月・翌月 */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {prominentMonths.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)} style={tabStyle(m)}>
              {monthLabel(m)}
              {m === currentMonth && <span style={{ marginLeft: 6, fontSize: 10, background: activeMonth === m ? 'rgba(255,255,255,0.3)' : '#e8f5e9', color: activeMonth === m ? '#fff' : '#388e3c', borderRadius: 3, padding: '1px 5px' }}>今月</span>}
              {m === nextMonth && <span style={{ marginLeft: 6, fontSize: 10, background: activeMonth === m ? 'rgba(255,255,255,0.3)' : '#fff3e0', color: activeMonth === m ? '#fff' : '#e65100', borderRadius: 3, padding: '1px 5px' }}>翌月</span>}
            </button>
          ))}
        </div>

        {/* 当年の古い月 */}
        {olderCurrentYear.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {olderCurrentYear.map(m => (
              <button key={m} onClick={() => setSelectedMonth(m)} style={compactTabStyle(m)}>
                {parseInt(m.slice(5))}月
              </button>
            ))}
          </div>
        )}

        {/* 前年以前 */}
        {prevYearsSorted.map(year => (
          <div key={year} style={{ marginTop: 6 }}>
            <button
              onClick={() => setExpandedYears(p => ({ ...p, [year]: !p[year] }))}
              style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
              {year}年 {expandedYears[year] ? '▲' : '▼'}
            </button>
            {expandedYears[year] && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, marginLeft: 8 }}>
                {olderPrevYears[year].map(m => (
                  <button key={m} onClick={() => setSelectedMonth(m)} style={compactTabStyle(m)}>
                    {parseInt(m.slice(5))}月
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 選択月コンテンツ */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3560', margin: 0 }}>{monthLabel(activeMonth)}</h2>
        {activeMonth === currentMonth && <span style={{ fontSize: 12, background: '#e8f5e9', color: '#388e3c', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>今月</span>}
        {activeMonth === nextMonth && <span style={{ fontSize: 12, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>翌月</span>}
      </div>

      {/* 月次サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: '売上', value: yen(activeData.revenue), color: '#388e3c' },
          { label: '粗利益', value: yen(activeData.grossProfit), color: '#3949ab', note: '保存済み記録' },
          { label: '諸々経費', value: yen(activeData.misc), color: '#e65100', editable: true },
          { label: '純利益', value: yen(activeData.netProfit), color: activeData.netProfit >= 0 ? '#00695c' : '#c62828', note: `粗利−手数料(${yen(Math.round(activeData.revenue * 0.036))})−経費` },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{s.label}</div>
            {s.editable ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, color: '#aaa' }}>¥</span>
                <input
                  type="number" min="0"
                  value={miscExpenses[activeMonth] || 0}
                  onChange={e => updateMiscExpense(activeMonth, e.target.value)}
                  style={{ width: 80, border: '1px solid #ddd', borderRadius: 4, padding: '4px 6px', fontSize: 14, fontWeight: 700, color: s.color, textAlign: 'right' }}
                />
              </div>
            ) : (
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            )}
            {s.note && <div style={{ fontSize: 10, color: '#bbb', marginTop: 3 }}>{s.note}</div>}
          </div>
        ))}
      </div>

      {/* 予約状況記録 */}
      {activeData.records.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', background: '#f8fbff' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a3560' }}>予約状況記録</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activeData.records.map(record => {
              const isExpanded = expandedRecords[record.eventId]
              const isStreet = record.eventType === 'street'
              return (
                <div key={record.eventId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <button
                    onClick={() => setExpandedRecords(p => ({ ...p, [record.eventId]: !p[record.eventId] }))}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, background: isStreet ? '#e8f5e9' : '#e8eaf6', color: isStreet ? '#388e3c' : '#3949ab', borderRadius: 3, padding: '2px 7px', fontWeight: 600 }}>
                        {isStreet ? 'スト' : 'スタ'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{formatEventDate(record.eventDate)}</span>
                      {record.eventTitle && <span style={{ fontSize: 13, color: '#666' }}>{record.eventTitle}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <span style={{ fontSize: 13, color: '#388e3c', fontWeight: 700 }}>売上 {yen(record.revenue)}</span>
                      <span style={{ fontSize: 13, color: record.grossProfit >= 0 ? '#3949ab' : '#c62828', fontWeight: 700 }}>粗利 {yen(record.grossProfit)}</span>
                      <span style={{ fontSize: 12, color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f5f5f5' }}>
                      {/* グリッド */}
                      <div style={{ overflowX: 'auto', marginTop: 12, marginBottom: 12 }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
                          <thead>
                            <tr style={{ background: '#f0f4ff' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', color: '#555', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 90 }}>モデル</th>
                              {(record.timeSlots || []).map(label => (
                                <th key={label} style={{ padding: '6px 8px', textAlign: 'center', color: '#555', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(record.rows || []).map((row, i) => {
                              const tierMeta = TIER_META[row.tier]
                              return (
                                <tr key={i} style={{ borderTop: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 600, color: '#1a3560', fontSize: 12 }}>{row.modelName}</span>
                                    {tierMeta && <span style={{ marginLeft: 5, fontSize: 10, background: tierMeta.bg, color: tierMeta.color, borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>{tierMeta.label}</span>}
                                  </td>
                                  {(record.timeSlots || []).map(label => {
                                    const cell = row.cells?.[label]
                                    if (cell === null || cell === undefined) return <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: '#f0f0f0', color: '#999' }}>—</td>
                                    if (!cell.booked) return <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: '#e3f2fd', fontSize: 14 }}>🈳</td>
                                    const isCard = cell.method === 'card'
                                    return (
                                      <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: isCard ? '#e8f5e9' : '#fce4ec' }}>
                                        <span style={{ fontSize: 11 }}>{isCard ? '🟢' : '❌'}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#333', marginLeft: 2 }}>{cell.name}</span>
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 利益サマリー */}
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#666', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                        <span>売上 <strong style={{ color: '#388e3c' }}>{yen(record.revenue)}</strong></span>
                        <span>人件費 <strong style={{ color: '#c62828' }}>−{yen(record.labor)}</strong></span>
                        <span>お昼代 <strong style={{ color: '#c62828' }}>−{yen(record.lunchTotal)}</strong>（{record.lunchCount}人×{yen(record.lunchRate)}）</span>
                        <span>スタジオ代等 <strong style={{ color: '#c62828' }}>−{yen(record.studioCost)}</strong></span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: record.grossProfit >= 0 ? '#3949ab' : '#c62828' }}>粗利益 {yen(record.grossProfit)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>
                        保存日時：{new Date(record.savedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* モデル別・種別 */}
      {activeData.bookings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2f2244', marginTop: 0, marginBottom: 14 }}>モデル別売上</h3>
            {modelEntries.map((m, i) => {
              const pct = Math.round((m.revenue / maxModelRevenue) * 100)
              return (
                <div key={m.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#aaa', minWidth: 16 }}>#{i + 1}</span>
                    {m.image && <img src={m.image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#333', flex: 1 }}>{m.name}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#2f2244' }}>{yen(m.revenue)}</span>
                  </div>
                  <div style={{ height: 5, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginLeft: 24 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? '#f0c040' : i === 1 ? '#b0bec5' : '#a1887f', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginLeft: 24, marginTop: 2 }}>{m.count}件</div>
                </div>
              )
            })}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e5e5e5' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2f2244', marginTop: 0, marginBottom: 14 }}>撮影種別</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'street', label: 'ストリート', color: '#388e3c', bg: '#e8f5e9' },
                { key: 'studio', label: 'スタジオ', color: '#3949ab', bg: '#e8eaf6' },
              ].map(({ key, label, color, bg }) => (
                <div key={key} style={{ flex: 1, background: bg, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 6 }}>{yen(byType[key].revenue)}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{byType[key].count}件</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 取引履歴 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2f2244', margin: 0 }}>取引履歴</h3>
          <span style={{ fontSize: 13, color: '#aaa' }}>{activeData.bookings.length}件</span>
        </div>
        {activeData.bookings.length === 0 ? (
          <p style={{ padding: '20px', color: '#999', fontSize: 14, margin: 0 }}>この月の予約はありません。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['予約日', 'お名前', 'モデル', '開催日', '枠', '種別', '金額'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeData.bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>{new Date(b.created_at).toLocaleDateString('ja-JP')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#333' }}>{b.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#555' }}>{b.model?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>{b.event?.event_date || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#666' }}>{b.slot?.slot_label || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ fontSize: 10, background: b.event?.event_type === 'street' ? '#e8f5e9' : '#e8eaf6', color: b.event?.event_type === 'street' ? '#388e3c' : '#3949ab', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>
                          {b.event?.event_type === 'street' ? 'スト' : 'スタ'}
                        </span>
                        {b.is_outdoor && <span style={{ fontSize: 10, background: '#fff3e0', color: '#e65100', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>屋外</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#2f2244' }}>{yen(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
