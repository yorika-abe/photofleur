'use client'

import { useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import CancelModal from '@/components/CancelModal'

const TIER_META = {
  staff:   { label: '運営', color: '#1a3560', bg: '#dce8ff' },
  '12000': { label: '12000', color: '#c2185b', bg: '#fce4ec' },
  '9900':  { label: '9900',  color: '#00695c', bg: '#e0f2f1' },
  '8900':  { label: '8900',  color: '#1565c0', bg: '#e3f2fd' },
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


function loadHistoryRecords() {
  try {
    const list = JSON.parse(localStorage.getItem('pf_saved_events_list') || '[]')
    return list.map(id => {
      try { return JSON.parse(localStorage.getItem(`pf_saved_event_${id}`)) } catch { return null }
    }).filter(Boolean).sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  } catch { return [] }
}

export default function AdminBookingStatusPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [fees, setFees] = useState(DEFAULT_FEES)
  const [editFees, setEditFees] = useState(false)
  const [costs, setCosts] = useState({ lunchCount: 0, lunchRate: 1000, studioCost: 0 })
  const [savedIds, setSavedIds] = useState(new Set())
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [eventProducts, setEventProducts] = useState([])
  const [productSales, setProductSales] = useState({})
  const [epBookings, setEpBookings] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyRecords, setHistoryRecords] = useState([])
  const [expandedHistory, setExpandedHistory] = useState(null)
  const [showNonEvent, setShowNonEvent] = useState(false)
  const [neData, setNeData] = useState(null)
  const [neLoading, setNeLoading] = useState(false)
  const [neSelectedMonth, setNeSelectedMonth] = useState(null)
  const [neCosts, setNeCosts] = useState({})
  const [neSavedList, setNeSavedList] = useState([])
  const [neShowHistory, setNeShowHistory] = useState(false)
  const [neExpandedHistory, setNeExpandedHistory] = useState(null)
  const [neExpandedPrivate, setNeExpandedPrivate] = useState(false)
  const [neExpandedGoods, setNeExpandedGoods] = useState(false)
  const [neExpandedCosts, setNeExpandedCosts] = useState(new Set())
  const [productHansellingMap, setProductHansellingMap] = useState({})

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'history') setShowHistory(true)
    if (tab === 'nonevent') setShowNonEvent(true)
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
    if (showHistory) setHistoryRecords(loadHistoryRecords())
  }, [showHistory])

  useEffect(() => {
    if (!showNonEvent || neData !== null) return
    setNeLoading(true)
    try {
      const savedList = JSON.parse(localStorage.getItem('pf_nonevent_list') || '[]')
      setNeSavedList(savedList)
      const savedCosts = JSON.parse(localStorage.getItem('pf_nonevent_costs') || '{}')
      setNeCosts(savedCosts)
    } catch {}
    fetch('/api/admin/non-event-revenue')
      .then(r => r.json())
      .then(d => {
        setNeData(d)
        const months = (() => {
          const set = new Set()
          const cm = new Date().toISOString().slice(0, 7)
          set.add(cm)
          for (const b of (d?.privateBookings || [])) {
            const m = (b.product?.event_date || b.created_at)?.slice(0, 7)
            if (m) set.add(m)
          }
          for (const o of (d?.goodsOrders || [])) {
            const m = o.created_at?.slice(0, 7)
            if (m) set.add(m)
          }
          return [...set].sort().reverse()
        })()
        setNeSelectedMonth(prev => prev || months[0] || new Date().toISOString().slice(0, 7))
        setNeLoading(false)
      })
      .catch(() => setNeLoading(false))
  }, [showNonEvent])

  useEffect(() => {
    if (!selectedEventId) return
    try {
      const savedFees = localStorage.getItem(`pf_fees_${selectedEventId}`)
      setFees(savedFees ? JSON.parse(savedFees) : DEFAULT_FEES)
    } catch { setFees(DEFAULT_FEES) }
    try {
      const saved = localStorage.getItem(`pf_costs_${selectedEventId}`)
      const savedCosts = saved ? JSON.parse(saved) : {}
      const eventItem = data.find(item => item.event.id === selectedEventId)
      const studioBudget = eventItem?.event?.studio_budget ?? 0
      setCosts({
        lunchCount: savedCosts.lunchCount ?? 0,
        lunchRate: savedCosts.lunchRate ?? 1000,
        studioCost: studioBudget,
        hanselling: savedCosts.hanselling ?? 0,
        hansellingMode: savedCosts.hansellingMode || 'flat',
      })
    } catch { setCosts({ lunchCount: 0, lunchRate: 1000, studioCost: 0, hanselling: 0, hansellingMode: 'flat' }) }
    try {
      const savedPH = localStorage.getItem(`pf_product_hanselling_${selectedEventId}`)
      setProductHansellingMap(savedPH ? JSON.parse(savedPH) : {})
    } catch { setProductHansellingMap({}) }

    // 予約商品を取得（booked_countを自動反映）
    fetch(`/api/admin/events/${selectedEventId}/product-bookings`)
      .then(r => r.json())
      .then(d => setEpBookings(d.bookings || []))
      .catch(() => setEpBookings([]))

    fetch(`/api/admin/events/${selectedEventId}/products`)
      .then(r => r.json())
      .then(d => {
        const products = Array.isArray(d) ? d : []
        setEventProducts(products)
        // DB上の実際の購入数をベースにセット（手動上書き分はlocalStorageで加算）
        try {
          const saved = localStorage.getItem(`pf_product_sales_${selectedEventId}`)
          const manual = saved ? JSON.parse(saved) : {}
          const merged = {}
          for (const p of products) {
            merged[p.id] = manual[p.id] !== undefined ? manual[p.id] : p.booked_count
          }
          setProductSales(merged)
        } catch {
          const auto = {}
          for (const p of products) auto[p.id] = p.booked_count
          setProductSales(auto)
        }
      })
      .catch(() => setEventProducts([]))
  }, [selectedEventId, data])

  function updateFee(tier, dur, value) {
    const next = { ...fees, [tier]: { ...fees[tier], [dur]: Number(value) || 0 } }
    setFees(next)
    if (selectedEventId) localStorage.setItem(`pf_fees_${selectedEventId}`, JSON.stringify(next))
  }

  function updateProductSale(productId, count) {
    const next = { ...productSales, [productId]: Number(count) || 0 }
    setProductSales(next)
    if (selectedEventId) localStorage.setItem(`pf_product_sales_${selectedEventId}`, JSON.stringify(next))
  }

  function updateProductHanselling(productId, key, value) {
    const next = {
      ...productHansellingMap,
      [productId]: {
        ...(productHansellingMap[productId] || { mode: 'flat', amount: 0 }),
        [key]: key === 'mode' ? value : (Number(value) || 0),
      },
    }
    setProductHansellingMap(next)
    if (selectedEventId) localStorage.setItem(`pf_product_hanselling_${selectedEventId}`, JSON.stringify(next))
  }

  function updateCost(key, value) {
    const next = { ...costs, [key]: key.endsWith('Mode') ? value : (Number(value) || 0) }
    setCosts(next)
    if (selectedEventId) {
      localStorage.setItem(`pf_costs_${selectedEventId}`, JSON.stringify(next))
      if (key === 'studioCost') {
        fetch('/api/admin/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedEventId, studio_budget: Number(value) || 0 }),
        })
      }
    }
  }

  function doSave(currentItem, revenue, productRevenue, labor, lunchTotal, grossProfit, slotHanselling, productHanselling) {
    const eventId = currentItem.event.id
    const record = {
      eventId,
      eventDate: currentItem.event.event_date,
      eventTitle: currentItem.event.title,
      eventType: currentItem.event.event_type,
      locationName: currentItem.event.location_name,
      revenue,
      productRevenue,
      totalRevenue: revenue + productRevenue,
      labor,
      lunchTotal,
      lunchCount: costs.lunchCount || 0,
      lunchRate: costs.lunchRate || 0,
      studioCost: costs.studioCost || 0,
      slotHanselling,
      productHanselling,
      hanselling: slotHanselling + productHanselling,
      grossProfit,
      productSalesSnapshot: eventProducts.map(p => ({
        name: p.name, price: p.price, count: productSales[p.id] || 0,
      })),
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

  function handleSave(currentItem, revenue, productRevenue, labor, lunchTotal, grossProfit, slotHanselling, productHanselling) {
    if (!currentItem) return
    if (!window.confirm(`${formatDate(currentItem.event.event_date)} の記録を保存して予約状況から削除しますか？`)) return
    doSave(currentItem, revenue, productRevenue, labor, lunchTotal, grossProfit, slotHanselling, productHanselling)
  }

  function deleteHistory(eventId) {
    if (!window.confirm('この履歴を削除しますか？')) return
    try {
      localStorage.removeItem(`pf_saved_event_${eventId}`)
    } catch {}
    setHistoryRecords(prev => prev.filter(r => r.eventId !== eventId))
  }

  // イベント外収益 helpers
  function getNeMonths(d) {
    const set = new Set()
    const cm = new Date().toISOString().slice(0, 7)
    set.add(cm)
    for (const b of (d?.privateBookings || [])) {
      const m = (b.product?.event_date || b.created_at)?.slice(0, 7)
      if (m) set.add(m)
    }
    for (const o of (d?.goodsOrders || [])) {
      const m = o.created_at?.slice(0, 7)
      if (m) set.add(m)
    }
    return [...set].sort().reverse()
  }

  function getNeStats(month, d, costs) {
    const priv = (d?.privateBookings || []).filter(b => (b.product?.event_date || b.created_at)?.slice(0, 7) === month)
    const gds = (d?.goodsOrders || []).filter(o => o.created_at?.slice(0, 7) === month)
    const privateRevenue = priv.reduce((s, b) => s + (b.product?.price || 0), 0)
    const goodsRevenue = gds.reduce((s, o) => s + (o.final_price ?? (o.goods?.price || 0) * (o.quantity || 1)), 0)
    const totalRevenue = privateRevenue + goodsRevenue
    const c = costs[month] || {}

    function getPrivTotal(b) {
      const saved = c.privateCosts?.[b.id]
      if (saved) return saved.reduce((s, i) => s + (Number(i.amount) || 0), 0)
      const items = b.product?.hanselling_items
      if (Array.isArray(items) && items.length > 0) return items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
      return b.product?.hanselling || 0
    }
    function getGoodsTotal(o) {
      const saved = c.goodsCosts?.[o.id]
      if (saved) return saved.reduce((s, i) => s + (Number(i.amount) || 0), 0)
      return (o.goods?.hanselling || 0) * (o.quantity || 1)
    }

    const privateHanselling = priv.reduce((s, b) => s + getPrivTotal(b), 0)
    const goodsHanselling = gds.reduce((s, o) => s + getGoodsTotal(o), 0)
    const hanselling = privateHanselling + goodsHanselling
    const otherCosts = c.otherCosts || 0
    const grossProfit = totalRevenue - hanselling - otherCosts
    return { priv, gds, privateRevenue, goodsRevenue, totalRevenue, privateHanselling, goodsHanselling, hanselling, otherCosts, grossProfit }
  }

  function updateNeCost(month, key, value) {
    const isMode = key.endsWith('Mode')
    const next = { ...neCosts, [month]: { ...(neCosts[month] || {}), [key]: isMode ? value : (Number(value) || 0) } }
    setNeCosts(next)
    try { localStorage.setItem('pf_nonevent_costs', JSON.stringify(next)) } catch {}
  }

  function getNeCostItems(month, type, id, defaultItemsFn) {
    const key = type === 'private' ? 'privateCosts' : 'goodsCosts'
    return neCosts[month]?.[key]?.[id] || defaultItemsFn()
  }

  function updateNeCostItems(month, type, id, items) {
    const key = type === 'private' ? 'privateCosts' : 'goodsCosts'
    const next = {
      ...neCosts,
      [month]: {
        ...(neCosts[month] || {}),
        [key]: { ...(neCosts[month]?.[key] || {}), [id]: items },
      }
    }
    setNeCosts(next)
    try { localStorage.setItem('pf_nonevent_costs', JSON.stringify(next)) } catch {}
  }

  function toggleNeCostExpand(id) {
    setNeExpandedCosts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleNeSave(month, stats) {
    if (!window.confirm(`${month} のイベント外収益を保存して売上管理に反映しますか？`)) return
    const record = {
      month,
      privateRevenue: stats.privateRevenue,
      goodsRevenue: stats.goodsRevenue,
      totalRevenue: stats.totalRevenue,
      privateHanselling: stats.privateHanselling,
      goodsHanselling: stats.goodsHanselling,
      hanselling: stats.hanselling,
      otherCosts: stats.otherCosts,
      grossProfit: stats.grossProfit,
      savedAt: new Date().toISOString(),
      privateCount: stats.priv.length,
      goodsCount: stats.gds.length,
    }
    try {
      const list = JSON.parse(localStorage.getItem('pf_nonevent_list') || '[]')
      if (!list.includes(month)) list.push(month)
      localStorage.setItem('pf_nonevent_list', JSON.stringify(list))
      localStorage.setItem(`pf_nonevent_${month}`, JSON.stringify(record))
      setNeSavedList(list)
    } catch {}
    alert('保存しました。売上管理に反映されました。')
  }

  function deleteNeHistory(month) {
    if (!window.confirm('この履歴を削除しますか？')) return
    try {
      const list = JSON.parse(localStorage.getItem('pf_nonevent_list') || '[]')
      const newList = list.filter(m => m !== month)
      localStorage.setItem('pf_nonevent_list', JSON.stringify(newList))
      localStorage.removeItem(`pf_nonevent_${month}`)
      setNeSavedList(newList)
    } catch {}
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
      <div style={{ display: 'flex', gap: 0, margin: '14px 0 20px', borderBottom: '2px solid #e5e5e5', flexWrap: 'wrap' }}>
        <button onClick={() => { setShowHistory(false); setShowNonEvent(false) }}
          style={{ padding: '10px 24px', fontWeight: !showHistory && !showNonEvent ? 700 : 600, fontSize: 15, color: !showHistory && !showNonEvent ? '#2f2244' : '#999', background: 'none', border: 'none', borderBottom: !showHistory && !showNonEvent ? '2px solid #2f2244' : '2px solid transparent', marginBottom: -2, cursor: 'pointer' }}>
          予約状況
        </button>
        <Link href="/admin/bookings" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>予約・販売一覧</Link>
        <Link href="/admin/sales" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -2 }}>売上管理</Link>
        <button onClick={() => { setShowHistory(false); setShowNonEvent(true) }}
          style={{ padding: '10px 24px', fontWeight: showNonEvent ? 700 : 600, fontSize: 15, color: showNonEvent ? '#2f2244' : '#999', background: 'none', border: 'none', borderBottom: showNonEvent ? '2px solid #2f2244' : '2px solid transparent', marginBottom: -2, cursor: 'pointer' }}>
          イベント外収益
        </button>
        <button onClick={() => { setShowNonEvent(false); setShowHistory(true) }}
          style={{ padding: '10px 24px', fontWeight: showHistory ? 700 : 600, fontSize: 15, color: showHistory ? '#2f2244' : '#999', background: 'none', border: 'none', borderBottom: showHistory ? '2px solid #2f2244' : '2px solid transparent', marginBottom: -2, cursor: 'pointer' }}>
          履歴 {savedIds.size > 0 && <span style={{ fontSize: 11, background: '#e3f2fd', color: '#1565c0', borderRadius: 10, padding: '1px 7px', marginLeft: 4, fontWeight: 700 }}>{savedIds.size}</span>}
        </button>
      </div>

      {/* イベント外収益ビュー */}
      {showNonEvent ? (
        <div>
          {/* サブタブ */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['管理', false], ['履歴', true]].map(([label, hist]) => (
              <button key={label} onClick={() => setNeShowHistory(hist)}
                style={{ padding: '7px 20px', borderRadius: 8, border: `2px solid ${neShowHistory === hist ? '#c2185b' : '#e5e5e5'}`, background: neShowHistory === hist ? '#fce4ec' : '#fff', color: neShowHistory === hist ? '#c2185b' : '#666', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {label}
                {label === '履歴' && neSavedList.length > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 11, background: '#f48fb1', color: '#fff', borderRadius: 10, padding: '1px 6px' }}>{neSavedList.length}</span>
                )}
              </button>
            ))}
          </div>

          {neShowHistory ? (
            /* 履歴 */
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#c2185b', marginBottom: 14 }}>イベント外収益 履歴</div>
              {neSavedList.length === 0 ? (
                <p style={{ color: '#999', fontSize: 14 }}>保存された記録はありません。</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...neSavedList].sort().reverse().map(month => {
                    let rec = null
                    try { rec = JSON.parse(localStorage.getItem(`pf_nonevent_${month}`) || 'null') } catch {}
                    if (!rec) return null
                    const isExp = neExpandedHistory === month
                    return (
                      <div key={month} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, overflow: 'hidden' }}>
                        <div onClick={() => setNeExpandedHistory(isExp ? null : month)}
                          style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, background: '#fce4ec', color: '#c2185b', borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>イベント外</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{month.replace('-', '年').replace(/(\d{2})$/, m => parseInt(m) + '月')}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>売上 ¥{(rec.totalRevenue || 0).toLocaleString()}</span>
                            <span style={{ fontSize: 13, color: rec.grossProfit >= 0 ? '#388e3c' : '#c62828', fontWeight: 700 }}>粗利 ¥{(rec.grossProfit || 0).toLocaleString()}</span>
                            <span style={{ color: '#bbb', fontSize: 12 }}>{isExp ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {isExp && (
                          <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#555', marginBottom: 10 }}>
                              <div><span style={{ color: '#aaa' }}>非公開商品売上　</span><span style={{ fontWeight: 700, color: '#388e3c' }}>¥{(rec.privateRevenue || 0).toLocaleString()}</span>（{rec.privateCount}件）</div>
                              <div><span style={{ color: '#aaa' }}>グッズ売上　</span><span style={{ fontWeight: 700, color: '#388e3c' }}>¥{(rec.goodsRevenue || 0).toLocaleString()}</span>（{rec.goodsCount}件）</div>
                              {(rec.privateHanselling > 0 || rec.goodsHanselling > 0)
                                ? <>
                                    {rec.privateHanselling > 0 && <div><span style={{ color: '#aaa' }}>非公開商品販管費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.privateHanselling.toLocaleString()}</span></div>}
                                    {rec.goodsHanselling > 0 && <div><span style={{ color: '#aaa' }}>グッズ販管費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.goodsHanselling.toLocaleString()}</span></div>}
                                  </>
                                : rec.hanselling > 0 && <div><span style={{ color: '#aaa' }}>販管費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.hanselling.toLocaleString()}</span></div>
                              }
                              {rec.otherCosts > 0 && <div><span style={{ color: '#aaa' }}>その他経費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.otherCosts.toLocaleString()}</span></div>}
                              <div><span style={{ color: '#aaa' }}>粗利益　</span><span style={{ fontWeight: 700, color: rec.grossProfit >= 0 ? '#388e3c' : '#c62828', fontSize: 15 }}>¥{(rec.grossProfit || 0).toLocaleString()}</span></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                              <span style={{ fontSize: 11, color: '#bbb' }}>保存日: {rec.savedAt ? new Date(rec.savedAt).toLocaleDateString('ja-JP') : '—'}</span>
                              <button onClick={() => deleteNeHistory(month)}
                                style={{ fontSize: 12, color: '#999', background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                                履歴を削除
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : neLoading ? (
            <p style={{ color: '#999', padding: 24 }}>読み込み中...</p>
          ) : (() => {
            const months = getNeMonths(neData)
            const month = neSelectedMonth || months[0]
            const stats = getNeStats(month, neData, neCosts)
            const isSaved = neSavedList.includes(month)
            const cinp = { padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, textAlign: 'right' }

            return (
              <div>
                {/* 月タブ */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {months.map(m => {
                    const active = m === month
                    const saved = neSavedList.includes(m)
                    return (
                      <button key={m} onClick={() => { setNeSelectedMonth(m); setNeExpandedPrivate(false); setNeExpandedGoods(false); setNeExpandedCosts(new Set()) }}
                        style={{ padding: '7px 14px', borderRadius: 16, border: `2px solid ${active ? '#c2185b' : '#e5e5e5'}`, background: active ? '#fce4ec' : '#fff', color: active ? '#c2185b' : '#666', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        {m.replace('-', '年').replace(/(\d{2})$/, mo => parseInt(mo) + '月')}
                        {saved && <span style={{ marginLeft: 4, fontSize: 10, background: '#f48fb1', color: '#fff', borderRadius: 3, padding: '1px 5px' }}>保存済</span>}
                      </button>
                    )
                  })}
                </div>

                {/* サマリー */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: '非公開商品', value: stats.privateRevenue, color: '#c2185b', note: `${stats.priv.length}件` },
                    { label: 'グッズ', value: stats.goodsRevenue, color: '#1565c0', note: `${stats.gds.length}件` },
                    { label: '売上合計', value: stats.totalRevenue, color: '#1a3560' },
                    { label: '粗利益', value: stats.grossProfit, color: stats.grossProfit >= 0 ? '#388e3c' : '#c62828' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>¥{s.value.toLocaleString()}</div>
                      {s.note && <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{s.note}</div>}
                    </div>
                  ))}
                </div>

                {/* 非公開商品一覧 */}
                {stats.priv.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
                    <button onClick={() => setNeExpandedPrivate(p => !p)}
                      style={{ width: '100%', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#c2185b' }}>非公開商品予約 <span style={{ fontSize: 12, fontWeight: 400, color: '#aaa' }}>{stats.priv.length}件 / ¥{stats.privateRevenue.toLocaleString()}</span></span>
                      <span style={{ color: '#bbb' }}>{neExpandedPrivate ? '▲' : '▼'}</span>
                    </button>
                    {neExpandedPrivate && (
                      <div style={{ overflowX: 'auto', borderTop: '1px solid #f0f0f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560, fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#fafafa' }}>
                              {['予約日', 'お名前', '商品', '開催日', '支払', '金額', '販管費'].map(h => (
                                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stats.priv.map(b => {
                              const defaultItems = (() => {
                                const items = b.product?.hanselling_items
                                if (Array.isArray(items) && items.length > 0) return items
                                const h = b.product?.hanselling || 0
                                return [{ label: '販管費', amount: h }]
                              })()
                              const costItems = getNeCostItems(month, 'private', b.id, () => defaultItems)
                              const costTotal = costItems.reduce((s, i) => s + (Number(i.amount) || 0), 0)
                              const isCostExp = neExpandedCosts.has('p_' + b.id)
                              return (
                                <Fragment key={b.id}>
                                  <tr style={{ borderBottom: isCostExp ? 'none' : '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '9px 14px', color: '#aaa', whiteSpace: 'nowrap' }}>{new Date(b.created_at).toLocaleDateString('ja-JP')}</td>
                                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#333' }}>{b.last_name}{b.first_name ? ` ${b.first_name}` : ''}</td>
                                    <td style={{ padding: '9px 14px', color: '#555' }}>{b.product?.title || '—'}</td>
                                    <td style={{ padding: '9px 14px', color: '#555', whiteSpace: 'nowrap' }}>{b.product?.event_date || '—'}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                      <span style={{ fontSize: 11, background: b.payment_method === 'card' ? '#e8f5e9' : '#e3f2fd', color: b.payment_method === 'card' ? '#388e3c' : '#1565c0', borderRadius: 3, padding: '2px 6px', fontWeight: 600 }}>
                                        {b.payment_method === 'card' ? 'カード' : '現金'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#c2185b' }}>¥{(b.product?.price || 0).toLocaleString()}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                      <button onClick={() => toggleNeCostExpand('p_' + b.id)}
                                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #ddd', background: isCostExp ? '#fce4ec' : '#fff', color: '#555', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        −¥{costTotal.toLocaleString()} {isCostExp ? '▲' : '▼'}
                                      </button>
                                    </td>
                                  </tr>
                                  {isCostExp && (
                                    <tr>
                                      <td colSpan={7} style={{ padding: '8px 14px 12px', background: '#fdf8ff', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ fontSize: 12, color: '#c2185b', fontWeight: 600, marginBottom: 8 }}>{b.product?.title || '商品'} の販管費</div>
                                        {costItems.map((item, i) => (
                                          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
                                            <input value={item.label} onChange={e => updateNeCostItems(month, 'private', b.id, costItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it))}
                                              placeholder="項目名" style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, flex: 2 }} />
                                            <input type="number" min="0" value={item.amount} onChange={e => updateNeCostItems(month, 'private', b.id, costItems.map((it, idx) => idx === i ? { ...it, amount: Number(e.target.value) || 0 } : it))}
                                              style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, width: 90, textAlign: 'right' }} />
                                            {costItems.length > 1 && (
                                              <button onClick={() => updateNeCostItems(month, 'private', b.id, costItems.filter((_, idx) => idx !== i))}
                                                style={{ padding: '2px 7px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', color: '#e53935', cursor: 'pointer', fontSize: 14 }}>×</button>
                                            )}
                                          </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                          <button onClick={() => updateNeCostItems(month, 'private', b.id, [...costItems, { label: '', amount: 0 }])}
                                            style={{ fontSize: 11, color: '#c2185b', background: 'none', border: '1px solid #c2185b', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>+ 追加</button>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: '#c62828' }}>合計 −¥{costTotal.toLocaleString()}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* グッズ注文一覧 */}
                {stats.gds.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
                    <button onClick={() => setNeExpandedGoods(p => !p)}
                      style={{ width: '100%', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1565c0' }}>グッズ注文 <span style={{ fontSize: 12, fontWeight: 400, color: '#aaa' }}>{stats.gds.length}件 / ¥{stats.goodsRevenue.toLocaleString()}</span></span>
                      <span style={{ color: '#bbb' }}>{neExpandedGoods ? '▲' : '▼'}</span>
                    </button>
                    {neExpandedGoods && (
                      <div style={{ overflowX: 'auto', borderTop: '1px solid #f0f0f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560, fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#fafafa' }}>
                              {['注文日', 'お名前', '商品', '数量', '支払', '金額', '販管費'].map(h => (
                                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stats.gds.map(o => {
                              const h = (o.goods?.hanselling || 0) * (o.quantity || 1)
                              const defaultItems = [{ label: '販管費', amount: h }]
                              const costItems = getNeCostItems(month, 'goods', o.id, () => defaultItems)
                              const costTotal = costItems.reduce((s, i) => s + (Number(i.amount) || 0), 0)
                              const isCostExp = neExpandedCosts.has('g_' + o.id)
                              return (
                                <Fragment key={o.id}>
                                  <tr style={{ borderBottom: isCostExp ? 'none' : '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '9px 14px', color: '#aaa', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('ja-JP')}</td>
                                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#333' }}>{o.last_name}{o.first_name ? ` ${o.first_name}` : ''}</td>
                                    <td style={{ padding: '9px 14px', color: '#555' }}>{o.goods?.title || '—'}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'center', color: '#555' }}>{o.quantity || 1}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                      <span style={{ fontSize: 11, background: o.payment_method === 'card' ? '#e8f5e9' : '#e3f2fd', color: o.payment_method === 'card' ? '#388e3c' : '#1565c0', borderRadius: 3, padding: '2px 6px', fontWeight: 600 }}>
                                        {o.payment_method === 'card' ? 'カード' : '現金'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#1565c0' }}>¥{(o.final_price ?? (o.goods?.price || 0) * (o.quantity || 1)).toLocaleString()}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                      <button onClick={() => toggleNeCostExpand('g_' + o.id)}
                                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #ddd', background: isCostExp ? '#e3f2fd' : '#fff', color: '#555', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        −¥{costTotal.toLocaleString()} {isCostExp ? '▲' : '▼'}
                                      </button>
                                    </td>
                                  </tr>
                                  {isCostExp && (
                                    <tr>
                                      <td colSpan={7} style={{ padding: '8px 14px 12px', background: '#fffbe6', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ fontSize: 12, color: '#1565c0', fontWeight: 600, marginBottom: 8 }}>{o.goods?.title || 'グッズ'} の販管費</div>
                                        {costItems.map((item, i) => (
                                          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
                                            <input value={item.label} onChange={e => updateNeCostItems(month, 'goods', o.id, costItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it))}
                                              placeholder="項目名" style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, flex: 2 }} />
                                            <input type="number" min="0" value={item.amount} onChange={e => updateNeCostItems(month, 'goods', o.id, costItems.map((it, idx) => idx === i ? { ...it, amount: Number(e.target.value) || 0 } : it))}
                                              style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, width: 90, textAlign: 'right' }} />
                                            {costItems.length > 1 && (
                                              <button onClick={() => updateNeCostItems(month, 'goods', o.id, costItems.filter((_, idx) => idx !== i))}
                                                style={{ padding: '2px 7px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', color: '#e53935', cursor: 'pointer', fontSize: 14 }}>×</button>
                                            )}
                                          </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                          <button onClick={() => updateNeCostItems(month, 'goods', o.id, [...costItems, { label: '', amount: 0 }])}
                                            style={{ fontSize: 11, color: '#1565c0', background: 'none', border: '1px solid #1565c0', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>+ 追加</button>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: '#c62828' }}>合計 −¥{costTotal.toLocaleString()}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* コスト編集 */}
                <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>経費入力</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>非公開商品売上</span>
                      <span style={{ fontWeight: 700, color: '#c2185b' }}>¥{stats.privateRevenue.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>グッズ売上</span>
                      <span style={{ fontWeight: 700, color: '#1565c0' }}>¥{stats.goodsRevenue.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#1a3560', fontWeight: 700 }}>売上合計</span>
                      <span style={{ fontWeight: 700, color: '#1a3560', fontSize: 16 }}>¥{stats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>非公開商品の販管費</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{stats.priv.length}件 合計（各予約の▼から編集）</div>
                      </div>
                      <span style={{ fontSize: 13, color: '#c62828', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>−¥{stats.privateHanselling.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>グッズの販管費</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{stats.gds.length}件 合計（各注文の▼から編集）</div>
                      </div>
                      <span style={{ fontSize: 13, color: '#c62828', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>−¥{stats.goodsHanselling.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '2px solid #ddd', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>その他経費</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" value={neCosts[month]?.otherCosts || 0}
                          onChange={e => updateNeCost(month, 'otherCosts', e.target.value)}
                          style={{ ...cinp, width: 100 }} />
                        <span style={{ fontSize: 13, color: '#c62828', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>−¥{(stats.otherCosts).toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3560' }}>粗利益</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: stats.grossProfit >= 0 ? '#388e3c' : '#c62828' }}>
                        ¥{stats.grossProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 保存ボタン */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32, gap: 10, alignItems: 'center' }}>
                  {isSaved && <span style={{ fontSize: 13, color: '#c2185b', fontWeight: 600 }}>✓ 保存済み（売上管理に反映中）</span>}
                  <button onClick={() => handleNeSave(month, stats)}
                    style={{ background: '#c2185b', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    {isSaved ? '上書き保存して反映' : '保存して売上管理に反映'}
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      ) : null}

      {/* 履歴ビュー */}
      {showHistory ? (
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1a3560', marginBottom: 16 }}>予約状況履歴</div>
          {historyRecords.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14 }}>保存された記録はありません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyRecords.map(rec => {
                const isExpanded = expandedHistory === rec.eventId
                const typeLabel = rec.eventType === 'street' ? 'ストリート' : 'スタジオ'
                const typeColor = rec.eventType === 'street' ? '#388e3c' : '#1a3560'
                const typeBg = rec.eventType === 'street' ? '#e8f5e9' : '#e3f2fd'
                return (
                  <div key={rec.eventId} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, overflow: 'hidden' }}>
                    <div
                      onClick={() => setExpandedHistory(isExpanded ? null : rec.eventId)}
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, background: typeBg, color: typeColor, borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>{typeLabel}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{formatDate(rec.eventDate)}</span>
                      {rec.locationName && <span style={{ fontSize: 13, color: '#666' }}>{rec.locationName}</span>}
                      {rec.eventTitle && <span style={{ fontSize: 13, color: '#888' }}>{rec.eventTitle}</span>}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>売上 ¥{(rec.totalRevenue ?? rec.revenue ?? 0).toLocaleString()}</span>
                        <span style={{ fontSize: 13, color: rec.grossProfit >= 0 ? '#388e3c' : '#c62828', fontWeight: 700 }}>粗利 ¥{(rec.grossProfit || 0).toLocaleString()}</span>
                        <span style={{ color: '#bbb', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#555', marginBottom: 12 }}>
                          <div><span style={{ color: '#aaa' }}>撮影売上　</span><span style={{ fontWeight: 700, color: '#388e3c' }}>¥{(rec.revenue || 0).toLocaleString()}</span></div>
                          {rec.productRevenue > 0 && <div><span style={{ color: '#aaa' }}>商品売上　</span><span style={{ fontWeight: 700, color: '#388e3c' }}>¥{rec.productRevenue.toLocaleString()}</span></div>}
                          <div><span style={{ color: '#aaa' }}>人件費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>¥{(rec.labor || 0).toLocaleString()}</span></div>
                          {rec.lunchTotal > 0 && <div><span style={{ color: '#aaa' }}>お昼代　</span><span style={{ fontWeight: 700, color: '#c62828' }}>¥{rec.lunchTotal.toLocaleString()}</span></div>}
                          {rec.studioCost > 0 && <div><span style={{ color: '#aaa' }}>スタジオ代　</span><span style={{ fontWeight: 700, color: '#c62828' }}>¥{rec.studioCost.toLocaleString()}</span></div>}
                          {(rec.slotHanselling > 0 || rec.productHanselling > 0)
                            ? <>
                                {rec.slotHanselling > 0 && <div><span style={{ color: '#aaa' }}>スロット販管費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.slotHanselling.toLocaleString()}</span></div>}
                                {rec.productHanselling > 0 && <div><span style={{ color: '#aaa' }}>特別予約販管費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.productHanselling.toLocaleString()}</span></div>}
                              </>
                            : rec.hanselling > 0 && <div><span style={{ color: '#aaa' }}>販管費　</span><span style={{ fontWeight: 700, color: '#c62828' }}>−¥{rec.hanselling.toLocaleString()}</span></div>
                          }
                          <div><span style={{ color: '#aaa' }}>粗利益　</span><span style={{ fontWeight: 700, color: rec.grossProfit >= 0 ? '#388e3c' : '#c62828', fontSize: 15 }}>¥{(rec.grossProfit || 0).toLocaleString()}</span></div>
                        </div>
                        {rec.rows?.length > 0 && (
                          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                              <thead>
                                <tr style={{ background: '#1a3560', color: '#fff' }}>
                                  <th style={{ padding: '7px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>モデル</th>
                                  {rec.timeSlots?.map(label => (
                                    <th key={label} style={{ padding: '7px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: 11 }}>{label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rec.rows.map((row, i) => (
                                  <tr key={i} style={{ borderTop: '1px solid #e5e5e5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '6px 12px', fontWeight: 700, color: '#1a3560', whiteSpace: 'nowrap' }}>{row.modelName}</td>
                                    {rec.timeSlots?.map(label => {
                                      const cell = row.cells?.[label]
                                      if (!cell) return <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: '#f0f0f0', color: '#bbb' }}>—</td>
                                      if (!cell.booked) return <td key={label} style={{ padding: '6px 8px', textAlign: 'center' }}><span style={{ fontSize: 16 }}>🈳</span></td>
                                      return (
                                        <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: cell.method === 'card' ? '#e8f5e9' : '#fce4ec' }}>
                                          <span style={{ fontSize: 11, fontWeight: 600 }}>{cell.method === 'card' ? '🟢' : '❌'} {cell.name}</span>
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#bbb' }}>保存日: {rec.savedAt ? new Date(rec.savedAt).toLocaleDateString('ja-JP') : '—'}</span>
                          <button
                            onClick={() => deleteHistory(rec.eventId)}
                            style={{ fontSize: 12, color: '#999', background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                            履歴を削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : !showNonEvent ? (
        <>
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
                      style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${active ? (isStreet ? '#388e3c' : '#1a3560') : '#e5e5e5'}`, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: active ? (isStreet ? '#e8f5e9' : '#e3f2fd') : '#fff', color: active ? (isStreet ? '#388e3c' : '#1a3560') : '#666' }}>
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
                <div>
                  <p style={{ color: '#999', marginBottom: 16 }}>出演モデルがいません。</p>
                  {isPastEvent && (
                    <button
                      onClick={() => {
                        if (!window.confirm('このイベントを要対応から消去しますか？')) return
                        doSave(currentItem, 0, 0, 0, 0, 0, 0, 0)
                      }}
                      style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      要対応から消去
                    </button>
                  )}
                </div>
              ) : (() => {
                let prevTier = null

                let revenue = 0, labor = 0, bookingCount = 0
                for (const row of currentItem.rows) {
                  for (const [label, cell] of Object.entries(row.cells)) {
                    if (!cell?.booking) continue
                    revenue += cell.price || 0
                    bookingCount++
                    if (row.model.price_tier !== 'staff') {
                      labor += fees[row.model.price_tier]?.[durationKey(label)] || 0
                    }
                  }
                }
                const productRevenue = epBookings.filter(b => !b.cancelled_at).reduce((s, b) => s + (b.final_price || 0), 0)
                const totalRevenue = revenue + productRevenue
                const lunchTotal = (costs.lunchCount || 0) * (costs.lunchRate || 0)
                const slotHanselling = costs.hansellingMode === 'per_booking'
                  ? (costs.hanselling || 0) * bookingCount
                  : (costs.hanselling || 0)
                const productHanselling = eventProducts.reduce((s, p) => {
                  const ph = productHansellingMap[p.id] || { mode: 'flat', amount: 0 }
                  const cnt = productSales[p.id] || 0
                  return s + (ph.mode === 'per_item' ? (ph.amount || 0) * cnt : (ph.amount || 0))
                }, 0)
                const grossProfit = totalRevenue - labor - lunchTotal - (costs.studioCost || 0) - slotHanselling - productHanselling

                const inp = { padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right' }

                return (
                  <>
                    {/* 過去イベント警告バナー */}
                    {isPastEvent && (
                      <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>⚠️</span>
                        <span style={{ fontSize: 13, color: '#1565c0', fontWeight: 600 }}>
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
                                    <td key={label} style={{ padding: '6px 8px', textAlign: 'center', background: isCard ? '#e8f5e9' : '#fce4ec', cursor: 'pointer' }}
                                      onClick={() => setSelectedBooking({ ...booking, modelName: row.model.name, slotLabel: label })}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                        <span style={{ fontSize: 13 }}>{isCard ? '🟢' : '❌'}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{booking.nickname || booking.last_name}</span>
                                        {booking.sns_url && <span style={{ fontSize: 11 }}>🔗</span>}
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
                      <span style={{ color: '#aaa' }}>※枠をタップで予約詳細表示</span>
                    </div>

                    {/* 予約詳細ポップアップ */}
                    {selectedBooking && (
                      <div onClick={() => setSelectedBooking(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>予約詳細</span>
                            <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{selectedBooking.payment_method === 'card' ? '🟢' : '❌'}</span>
                              <span style={{ fontWeight: 700, fontSize: 16, color: '#1a3560' }}>{selectedBooking.nickname || '—'}</span>
                            </div>
                            <div style={{ color: '#888', fontSize: 12 }}>{selectedBooking.slotLabel} / {selectedBooking.modelName}</div>
                            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div><span style={{ color: '#aaa', minWidth: 80, display: 'inline-block' }}>氏名</span>{selectedBooking.last_name} {selectedBooking.first_name}</div>
                              <div><span style={{ color: '#aaa', minWidth: 80, display: 'inline-block' }}>決済</span>{selectedBooking.payment_method === 'card' ? 'カード決済済み' : '現金払い'}</div>
                              {selectedBooking.sns_url && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ color: '#aaa', minWidth: 80, display: 'inline-block' }}>SNS</span>
                                  <a href={selectedBooking.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560', fontWeight: 600, wordBreak: 'break-all', fontSize: 13 }}>
                                    🔗 {selectedBooking.sns_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                            {[['12000', '#fce4ec', '#c2185b'], ['9900', '#e0f2f1', '#00695c'], ['8900', '#e3f2fd', '#1565c0']].map(([tier, bg, color]) => (
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

                    {/* 特別予約商品購入者リスト */}
                    {cancelTarget && (
                      <CancelModal
                        item={cancelTarget}
                        type="event_product"
                        customerName={cancelTarget.customer_name || ''}
                        price={cancelTarget.product?.price || 0}
                        onClose={() => setCancelTarget(null)}
                        onDone={() => {
                          setEpBookings(prev => prev.map(b => b.id === cancelTarget.id ? { ...b, cancelled_at: new Date().toISOString() } : b))
                          setCancelTarget(null)
                        }}
                      />
                    )}
                    {epBookings.length > 0 && (
                      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>特別予約商品 購入者一覧（{epBookings.filter(b => !b.cancelled_at).length}件）</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {epBookings.map(b => (
                            <div key={b.id} style={{ border: '1px solid #e8f0fb', borderRadius: 8, padding: '10px 14px', background: b.cancelled_at ? '#fafafa' : '#f8fbff', fontSize: 13, opacity: b.cancelled_at ? 0.6 : 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, color: '#1a3560', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {b.product?.name || '—'}
                                    <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>
                                      {b.payment_method === 'card' ? '💳カード' : '💴現金'}
                                    </span>
                                    {b.cancelled_at && <span style={{ fontSize: 11, background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>キャンセル済</span>}
                                  </div>
                                  {Object.entries(b.selections || {}).filter(([k]) => k !== 'delivery_address' && k !== '_final_price').map(([k, v]) => (
                                    <div key={k} style={{ color: '#555', marginBottom: 2 }}>
                                      <span style={{ color: '#aaa', marginRight: 6 }}>{k}</span>
                                      {Array.isArray(v) ? v.join(', ') : v}
                                    </div>
                                  ))}
                                  {b.selections?.delivery_address && (
                                    <div style={{ color: '#555', marginTop: 2 }}><span style={{ color: '#aaa', marginRight: 6 }}>配送先</span><span style={{ whiteSpace: 'pre-wrap' }}>{b.selections.delivery_address}</span></div>
                                  )}
                                  <div style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#888' }}>
                                    {b.nickname && <span>📛 {b.nickname}</span>}
                                    {b.sns_url && <a href={b.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560' }}>{b.sns_url.replace('https://', '')}</a>}
                                    <span>{b.customer_email}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                  <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 15 }}>
                                    ¥{(b.final_price ?? b.product?.price ?? 0).toLocaleString()}
                                  </div>
                                  {!b.cancelled_at && (
                                    <button onClick={() => setCancelTarget(b)}
                                      style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #e53935', background: '#fff', color: '#e53935', cursor: 'pointer', fontWeight: 600 }}>
                                      キャンセル
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 予約商品売上 */}
                    {eventProducts.length > 0 && (
                      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>予約商品売上</div>
                        {eventProducts.map(p => {
                          const isAuto = productSales[p.id] === p.booked_count
                          const ph = productHansellingMap[p.id] || { mode: 'flat', amount: 0 }
                          const cnt = productSales[p.id] || 0
                          const phTotal = ph.mode === 'per_item' ? (ph.amount || 0) * cnt : (ph.amount || 0)
                          const actualRevenue = epBookings.filter(b => !b.cancelled_at && b.product_id === p.id).reduce((s, b) => s + (b.final_price || 0), 0)
                          return (
                            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{p.name}</span>
                                  <span style={{ color: '#aaa', fontSize: 12, marginLeft: 8 }}>¥{p.price.toLocaleString()}/個</span>
                                  {isAuto && <span style={{ fontSize: 10, background: '#e8f5e9', color: '#388e3c', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 600 }}>自動</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                  <input type="number" min="0" value={cnt}
                                    onChange={e => updateProductSale(p.id, e.target.value)}
                                    style={{ ...inp, width: 60 }} />
                                  <span style={{ color: '#777' }}>個 =</span>
                                  <span style={{ fontWeight: 700, color: '#388e3c', minWidth: 80, textAlign: 'right' }}>¥{(actualRevenue || p.price * cnt).toLocaleString()}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 11, color: '#888' }}>販管費</span>
                                  {[['flat', '総額入力'], ['per_item', '1件あたり×件数']].map(([v, lbl]) => (
                                    <button key={v} type="button"
                                      onClick={() => updateProductHanselling(p.id, 'mode', v)}
                                      style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, border: `1px solid ${ph.mode === v ? '#c2185b' : '#ddd'}`, background: ph.mode === v ? '#c2185b' : '#fff', color: ph.mode === v ? '#fff' : '#888', cursor: 'pointer', fontWeight: 600 }}>
                                      {lbl}
                                    </button>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                  <input type="number" min="0" value={ph.amount || 0}
                                    onChange={e => updateProductHanselling(p.id, 'amount', e.target.value)}
                                    style={{ ...inp, width: 70, fontSize: 12 }} />
                                  {ph.mode === 'per_item' && <span style={{ color: '#aaa' }}>×{cnt}件</span>}
                                  <span style={{ color: '#777' }}>=</span>
                                  <span style={{ fontWeight: 700, color: '#c62828', minWidth: 60, textAlign: 'right' }}>−¥{phTotal.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#555' }}>商品売上計</span>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#388e3c' }}>¥{productRevenue.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* 利益管理 */}
                    <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>利益管理</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>撮影売上</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#388e3c' }}>¥{revenue.toLocaleString()}</span>
                        </div>
                        {productRevenue > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>商品売上</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#388e3c' }}>¥{productRevenue.toLocaleString()}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <span style={{ fontSize: 13, color: '#1a3560', fontWeight: 700 }}>売上合計</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a3560' }}>¥{totalRevenue.toLocaleString()}</span>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>スタジオ代・衣装代</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <input type="number" min="0" value={costs.studioCost}
                              onChange={e => updateCost('studioCost', e.target.value)}
                              style={{ ...inp, width: 90 }} />
                            <span style={{ color: '#777' }}>円 =</span>
                            <span style={{ fontWeight: 700, color: '#c62828', minWidth: 70, textAlign: 'right' }}>−¥{(costs.studioCost || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        {/* 撮影枠予約の販管費 */}
                        <div style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, color: '#555', fontWeight: 600, marginBottom: 5 }}>撮影枠予約の販管費</div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {[['flat', '総額入力'], ['per_booking', '1件あたり×件数']].map(([v, lbl]) => (
                                  <button key={v} type="button"
                                    onClick={() => updateCost('hansellingMode', v)}
                                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${costs.hansellingMode === v ? '#1a3560' : '#ddd'}`, background: costs.hansellingMode === v ? '#1a3560' : '#fff', color: costs.hansellingMode === v ? '#fff' : '#888', cursor: 'pointer', fontWeight: 600 }}>
                                    {lbl}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <input type="number" min="0" value={costs.hanselling || 0}
                                onChange={e => updateCost('hanselling', e.target.value)}
                                style={{ ...inp, width: 80 }} />
                              {costs.hansellingMode === 'per_booking' && (
                                <span style={{ color: '#aaa', fontSize: 12 }}>×{bookingCount}件</span>
                              )}
                              <span style={{ color: '#777' }}>=</span>
                              <span style={{ fontWeight: 700, color: '#c62828', minWidth: 70, textAlign: 'right' }}>−¥{slotHanselling.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        {productHanselling > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>特別予約商品の販管費合計</span>
                            <span style={{ fontWeight: 700, color: '#c62828' }}>−¥{productHanselling.toLocaleString()}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3560' }}>粗利益</span>
                          <span style={{ fontSize: 22, fontWeight: 700, color: grossProfit >= 0 ? '#388e3c' : '#c62828' }}>
                            ¥{grossProfit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ボタン（過去イベントのみ） */}
                    {isPastEvent && (
                      <div style={{ marginTop: 16, marginBottom: 32, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleSave(currentItem, revenue, productRevenue, labor, lunchTotal, grossProfit, slotHanselling, productHanselling)}
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
        </>
      ) : null}
    </div>
  )
}
