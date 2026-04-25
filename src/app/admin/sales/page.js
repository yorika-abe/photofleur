'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function yen(n) { return `¥${(n || 0).toLocaleString()}` }

export default function AdminSalesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [])

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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>
  if (!data) return null

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const thisMonthData = data.filter(b => b.created_at?.startsWith(thisMonth))
  const totalRevenue = data.reduce((s, b) => s + b.revenue, 0)
  const thisMonthRevenue = thisMonthData.reduce((s, b) => s + b.revenue, 0)
  const avgPrice = data.length > 0 ? Math.round(totalRevenue / data.length) : 0
  const outdoorCount = data.filter(b => b.is_outdoor).length
  const outdoorRevenue = data.filter(b => b.is_outdoor).reduce((s, b) => s + b.revenue, 0)

  // Monthly breakdown
  const byMonth = {}
  for (const b of data) {
    const m = b.created_at?.slice(0, 7) || '不明'
    if (!byMonth[m]) byMonth[m] = { count: 0, revenue: 0, outdoor: 0 }
    byMonth[m].count++
    byMonth[m].revenue += b.revenue
    if (b.is_outdoor) byMonth[m].outdoor++
  }
  const monthKeys = Object.keys(byMonth).sort().reverse()
  const maxMonthRevenue = Math.max(...Object.values(byMonth).map(v => v.revenue), 1)

  // Model breakdown
  const byModel = {}
  for (const b of data) {
    const key = b.model?.id || 'unknown'
    if (!byModel[key]) byModel[key] = { name: b.model?.name || '不明', image: b.model?.image, count: 0, revenue: 0 }
    byModel[key].count++
    byModel[key].revenue += b.revenue
  }
  const modelEntries = Object.values(byModel).sort((a, b) => b.revenue - a.revenue)
  const maxModelRevenue = Math.max(...modelEntries.map(m => m.revenue), 1)

  // Event type breakdown
  const byType = { street: { count: 0, revenue: 0 }, studio: { count: 0, revenue: 0 }, other: { count: 0, revenue: 0 } }
  for (const b of data) {
    const t = b.event?.event_type === 'street' ? 'street' : b.event?.event_type === 'studio' ? 'studio' : 'other'
    byType[t].count++
    byType[t].revenue += b.revenue
  }

  const displayData = selectedMonth ? data.filter(b => b.created_at?.startsWith(selectedMonth)) : data

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: '8px 0 28px' }}>売上管理</h1>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: '累計売上', value: yen(totalRevenue), sub: `${data.length}件`, color: '#2f2244' },
          { label: '今月売上', value: yen(thisMonthRevenue), sub: `${thisMonthData.length}件`, color: '#388e3c' },
          { label: '平均単価', value: yen(avgPrice), sub: '1予約あたり', color: '#3949ab' },
          { label: '屋外撮影', value: `${outdoorCount}件`, sub: yen(outdoorRevenue), color: '#e65100' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px', border: `2px solid ${s.color}18`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 28 }}>

        {/* Monthly chart */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2f2244', marginTop: 0, marginBottom: 16 }}>月別売上</h2>
          {monthKeys.length === 0 ? <p style={{ color: '#999', fontSize: 14 }}>データなし</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {monthKeys.slice(0, 8).map(month => {
                const d = byMonth[month]
                const pct = Math.round((d.revenue / maxMonthRevenue) * 100)
                const isSelected = selectedMonth === month
                return (
                  <div key={month} onClick={() => setSelectedMonth(isSelected ? null : month)}
                    style={{ cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: isSelected ? '#f8f5ff' : 'transparent', border: `1px solid ${isSelected ? '#e0d5f5' : 'transparent'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: '#333' }}>{month}</span>
                      <span style={{ color: '#2f2244', fontWeight: 700 }}>{yen(d.revenue)}</span>
                    </div>
                    <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#2f2244', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{d.count}件{d.outdoor > 0 ? ` (屋外${d.outdoor})` : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
          {selectedMonth && (
            <button onClick={() => setSelectedMonth(null)} style={{ marginTop: 12, fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ✕ フィルター解除
            </button>
          )}
        </div>

        {/* Model ranking */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2f2244', marginTop: 0, marginBottom: 16 }}>モデル別売上</h2>
          {modelEntries.length === 0 ? <p style={{ color: '#999', fontSize: 14 }}>データなし</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {modelEntries.map((m, i) => {
                const pct = Math.round((m.revenue / maxModelRevenue) * 100)
                return (
                  <div key={m.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#aaa', minWidth: 16 }}>#{i + 1}</span>
                      {m.image && <img src={m.image} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
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
          )}

          {/* Event type split */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 10 }}>撮影種別</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'street', label: 'スト', color: '#388e3c', bg: '#e8f5e9' },
                { key: 'studio', label: 'スタ', color: '#3949ab', bg: '#e8eaf6' },
              ].map(({ key, label, color, bg }) => (
                <div key={key} style={{ flex: 1, background: bg, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4 }}>{yen(byType[key].revenue)}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{byType[key].count}件</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2f2244', margin: 0 }}>
            取引履歴 {selectedMonth && <span style={{ fontSize: 13, color: '#888', fontWeight: 400 }}>（{selectedMonth}）</span>}
          </h2>
          <span style={{ fontSize: 13, color: '#aaa' }}>{displayData.length}件</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['予約日', 'お名前', 'モデル', '撮影日', '枠', '種別', '金額'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map(b => (
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
      </div>
    </div>
  )
}
