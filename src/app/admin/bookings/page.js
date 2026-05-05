'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${date.getMonth() + 1}/${date.getDate()}（${days[date.getDay()]}）`
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [toast, setToast] = useState(null)
  const [refundModal, setRefundModal] = useState(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    document.cookie = `bookings_last_viewed=${new Date().toISOString()}; path=/; max-age=${60 * 60 * 24 * 365}`
    load()
  }, [])

  async function load() {
    setLoading(true)

    // 通常予約
    const { data } = await supabase
      .from('bookings')
      .select('id, name, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, qr_token, marketing_consent, created_at, slot_id, cancelled_at, payment_method, square_payment_id')
      .order('created_at', { ascending: false })

    // 非公開商品予約
    const { data: privateBookingsRaw } = await supabase
      .from('private_bookings')
      .select('id, last_name, first_name, email, phone, payment_method, notes, qr_token, cancelled_at, created_at, product_id, private_products(id, title, price, event_date, time_label, model_id, models(id, name))')
      .order('created_at', { ascending: false })

    const privateBookings = (privateBookingsRaw || []).map(b => ({
      ...b,
      _type: 'private',
      name: `${b.last_name}${b.first_name ? ` ${b.first_name}` : ''}`,
      product: b.private_products || {},
      model: b.private_products?.models || {},
      event: b.private_products?.event_date ? { event_date: b.private_products.event_date } : {},
      slot: { slot_label: b.private_products?.time_label || '' },
      final_price: b.private_products?.price || 0,
    }))

    // 特別予約商品（eventsは別クエリで取得）
    const { data: epbRaw } = await supabase
      .from('event_product_bookings')
      .select('id, customer_name, customer_email, customer_phone, sns_url, nickname, payment_method, qr_token, cancelled_at, created_at, product_id, event_id, selections, event_products(id, name, price)')
      .order('created_at', { ascending: false })

    const epEventIds = [...new Set((epbRaw || []).map(b => b.event_id).filter(Boolean))]
    const { data: epEvents } = epEventIds.length
      ? await supabase.from('events').select('id, event_date, location_name').in('id', epEventIds)
      : { data: [] }
    const epEventMap = Object.fromEntries((epEvents || []).map(e => [e.id, e]))

    const epBookings = (epbRaw || []).map(b => ({
      ...b,
      _type: 'event_product',
      name: b.customer_name || '',
      email: b.customer_email || '',
      phone: b.customer_phone || null,
      product: b.event_products || {},
      model: {},
      event: epEventMap[b.event_id] || {},
      slot: { slot_label: b.selections?.slot || '' },
      final_price: b.event_products?.price || 0,
    }))

    if (!data) {
      setBookings(privateBookings)
      setLoading(false)
      return
    }

    const slotIds = [...new Set(data.map(b => b.slot_id).filter(Boolean))]
    if (slotIds.length === 0) {
      const merged = [...data.map(b => ({ ...b, _type: 'regular', slot: {}, event: {}, model: {} })), ...privateBookings]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setBookings(merged)
      setLoading(false)
      return
    }

    const { data: slots } = await supabase
      .from('booking_slots')
      .select('id, slot_label, price, event_entry_id')
      .in('id', slotIds)

    const entryIds = [...new Set((slots || []).map(s => s.event_entry_id).filter(Boolean))]
    const { data: entries } = entryIds.length
      ? await supabase.from('event_entries').select('id, event_id, model_id').in('id', entryIds)
      : { data: [] }

    const eventIds = [...new Set((entries || []).map(e => e.event_id).filter(Boolean))]
    const modelIds = [...new Set((entries || []).map(e => e.model_id).filter(Boolean))]

    const [{ data: events }, { data: models }] = await Promise.all([
      eventIds.length ? supabase.from('events').select('id, event_date, event_type, location_name').in('id', eventIds) : { data: [] },
      modelIds.length ? supabase.from('models').select('id, name').in('id', modelIds) : { data: [] },
    ])

    const slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]))
    const entryMap = Object.fromEntries((entries || []).map(e => [e.id, e]))
    const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))
    const modelMap = Object.fromEntries((models || []).map(m => [m.id, m]))

    const regularBookings = data.map(b => {
      const slot = slotMap[b.slot_id] || {}
      const entry = entryMap[slot.event_entry_id] || {}
      const event = eventMap[entry.event_id] || {}
      const model = modelMap[entry.model_id] || {}
      return { ...b, _type: 'regular', slot, event, model }
    })

    const merged = [...regularBookings, ...privateBookings, ...epBookings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setBookings(merged)
    setLoading(false)
  }

  function cancelBooking(b) {
    const price = b.final_price || b.slot?.price || 0
    const hasCard = b.payment_method === 'card' && b.square_payment_id
    setRefundModal({ booking: b, refundType: hasCard ? 'full' : 'none', customAmount: String(price), cancelReason: '' })
  }

  async function executeCancel(b, refundAmount, cancelReason) {
    setRefundModal(null)
    setCancelling(b.id)

    const baseBody = b._type === 'private'
      ? { private_booking_id: b.id }
      : b._type === 'event_product'
      ? { event_product_booking_id: b.id }
      : { booking_id: b.id }

    const res = await fetch('/api/admin/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseBody, refund_amount: refundAmount, cancel_reason: cancelReason || '' }),
    })
    setCancelling(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert('エラーが発生しました: ' + (d.error || res.status))
      return
    }

    const data = await res.json()
    let msg = data.mail_ok ? 'キャンセルメールを発送しました。' : '⚠️ メール送信に失敗しました（キャンセル自体は完了）。'
    if (refundAmount > 0) {
      if (data.refund_ok) msg += `　Square返金（¥${Number(refundAmount).toLocaleString()}）が完了しました。`
      else if (data.refund_error) msg += `　※返金エラー: ${data.refund_error}`
    }

    setToast(msg)
    setBookings(prev => prev.map(bk => bk.id === b.id ? { ...bk, cancelled_at: new Date().toISOString() } : bk))
    setTimeout(() => setToast(null), 8000)
  }

  const today = new Date().toISOString().split('T')[0]

  const uniqueEvents = Object.values(
    bookings.reduce((acc, b) => {
      const eid = b.event?.id || b.event?.event_date
      if (eid && !acc[eid]) acc[eid] = b.event
      return acc
    }, {})
  ).sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))

  const filtered = bookings.filter(b => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'upcoming' ? (b.event?.event_date >= today) :
      filter === 'past' ? (b.event?.event_date < today) :
      filter === 'outdoor' ? b.is_outdoor : true

    const matchEvent = !eventFilter || b.event?.event_date === eventFilter

    const q = search.toLowerCase()
    const matchSearch = !q || [b.name, b.email, b.phone, b.model?.name, b.event?.event_date, b.product?.title].some(v => v?.toLowerCase().includes(q))

    return matchFilter && matchEvent && matchSearch
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#1b5e20', color: '#fff', borderRadius: 10, padding: '14px 24px', fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
          {toast}
        </div>
      )}

      {refundModal && (() => {
        const b = refundModal.booking
        const price = b.final_price || b.slot?.price || 0
        const hasCard = b.payment_method === 'card' && b.square_payment_id
        const refundAmount = refundModal.refundType === 'full' ? price
          : refundModal.refundType === 'custom' ? Number(refundModal.customAmount) || 0
          : 0
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 440, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginBottom: 6 }}>予約キャンセル</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{b.name || `${b.last_name} ${b.first_name}`} 様　決済額：¥{price.toLocaleString()}</div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2f2244', marginBottom: 6 }}>キャンセル理由（メールに記載されます）</label>
                <textarea
                  value={refundModal.cancelReason}
                  onChange={e => setRefundModal({ ...refundModal, cancelReason: e.target.value })}
                  rows={3}
                  placeholder="例：イベント中止のため、定員超過のため、など"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 10, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {hasCard && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {[
                      { key: 'none', label: '返金なし（キャンセルメールのみ）' },
                      { key: 'full', label: `全額返金　¥${price.toLocaleString()}` },
                      { key: 'custom', label: '金額を指定して返金' },
                    ].map(opt => (
                      <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, border: `2px solid ${refundModal.refundType === opt.key ? '#2f2244' : '#e5e5e5'}`, background: refundModal.refundType === opt.key ? '#f0eeff' : '#fafafa' }}>
                        <input type="radio" checked={refundModal.refundType === opt.key} onChange={() => setRefundModal({ ...refundModal, refundType: opt.key })} style={{ accentColor: '#2f2244' }} />
                        {opt.label}
                      </label>
                    ))}
                    {refundModal.refundType === 'custom' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                        <span style={{ fontSize: 14, color: '#555' }}>返金額</span>
                        <span style={{ fontSize: 14 }}>¥</span>
                        <input
                          type="number"
                          value={refundModal.customAmount}
                          onChange={e => setRefundModal({ ...refundModal, customAmount: e.target.value })}
                          style={{ width: 120, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14 }}
                          min={0} max={price}
                        />
                      </div>
                    )}
                  </div>
                  {refundModal.refundType !== 'none' && (
                    <div style={{ fontSize: 12, color: '#e65100', background: '#fff3e0', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                      ⚠️ Square返金：¥{refundAmount.toLocaleString()} を実行します
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setRefundModal(null)} style={{ flex: 1, padding: '10px 0', border: '1px solid #ddd', borderRadius: 10, background: '#f5f5f5', color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  戻る
                </button>
                <button
                  onClick={() => executeCancel(b, refundAmount, refundModal.cancelReason)}
                  disabled={cancelling === b.id}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: '#c62828', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  キャンセル実行
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '8px 0 24px', borderBottom: '2px solid #e5e5e5' }}>
        <Link href="/admin/booking-status" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>予約状況</Link>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#2f2244', borderBottom: '2px solid #2f2244', marginBottom: -2, cursor: 'default' }}>予約一覧</div>
        <Link href="/admin/sales" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>売上管理</Link>
        <Link href="/admin/booking-status?tab=history" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>履歴</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', '全て'], ['upcoming', '今後'], ['past', '過去'], ['outdoor', '屋外']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: filter === key ? '#2f2244' : '#ddd', background: filter === key ? '#2f2244' : '#fff', color: filter === key ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {label}
            </button>
          ))}
        </div>
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, color: eventFilter ? '#2f2244' : '#999', minWidth: 180 }}>
          <option value="">開催日・イベントで絞る</option>
          {uniqueEvents.map(ev => (
            <option key={ev.event_date} value={ev.event_date}>
              {formatDate(ev.event_date)}{ev.location_name ? `　${ev.location_name}` : ''}
            </option>
          ))}
        </select>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="名前・メール・モデル名で検索"
          style={{ flex: 1, minWidth: 200, padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
        />
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#999' }}>該当する予約はありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(b => {
            const isExpanded = expanded === b.id
            const price = b.final_price || b.slot?.price || 0
            const isCancelled = !!b.cancelled_at
            const isPrivate = b._type === 'private'
            const isEP = b._type === 'event_product'
            const borderColor = isCancelled ? '1px solid #ffcdd2' : isPrivate ? '1px solid #e8d5f5' : isEP ? '1px solid #d5e8f5' : '1px solid #e5e5e5'
            return (
              <div key={b.id} style={{ background: isCancelled ? '#fafafa' : '#fff', borderRadius: 12, border: borderColor, overflow: 'hidden', opacity: isCancelled ? 0.7 : 1 }}>
                {/* Main row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : b.id)}
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isCancelled ? '#999' : '#2f2244' }}>{b.name || `${b.last_name} ${b.first_name}`}</span>
                      {isCancelled && <span style={{ background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>キャンセル済</span>}
                      {isPrivate && <span style={{ background: '#f3e5f5', color: '#7b1fa2', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>非公開商品</span>}
                      {isEP && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>特別予約商品</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{b.email}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#555', minWidth: 120 }}>
                    {b.event?.event_date ? formatDate(b.event.event_date) : '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', minWidth: 80 }}>{b.model?.name || '—'}</div>
                  <div style={{ fontSize: 13, color: '#555', minWidth: 80 }}>
                    {(isPrivate || isEP) ? (b.product?.name || b.product?.title || '—') : (b.slot?.slot_label || '—')}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {!isPrivate && !isEP && b.is_outdoor && (
                      <span style={{ background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>屋外</span>
                    )}
                    {!isPrivate && (
                      <span style={{ background: b.event?.event_type === 'street' ? '#e8f5e9' : '#e8eaf6', color: b.event?.event_type === 'street' ? '#388e3c' : '#3949ab', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                        {b.event?.event_type === 'street' ? 'スト' : 'スタ'}
                      </span>
                    )}
                    {(() => {
                      const pm = b.payment_method
                      if (!pm) return null
                      return (
                        <span style={{ background: pm === 'card' ? '#e3f2fd' : '#f1f8e9', color: pm === 'card' ? '#1565c0' : '#33691e', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                          {pm === 'card' ? '💳カード' : '💴現金'}
                        </span>
                      )
                    })()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2f2244', minWidth: 80, textAlign: 'right' }}>
                    ¥{price.toLocaleString()}
                  </div>
                  <div style={{ color: '#bbb', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '16px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 600 }}>お客様情報</div>
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 2.2 }}>
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>氏名</span>{isEP ? b.customer_name : `${b.last_name} ${b.first_name}`}</div>
                        {!isEP && b.last_name_kana && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>ふりがな</span>{b.last_name_kana} {b.first_name_kana}</div>}
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>メール</span>{b.email}</div>
                        {b.phone && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>電話</span>{b.phone}</div>}
                        {b.sns_url && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>SNS</span><a href={b.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2f2244' }}>{b.sns_url.replace('https://', '')}</a></div>}
                        {isPrivate && b.notes && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>備考</span>{b.notes}</div>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 600 }}>予約内容</div>
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 2.2 }}>
                        {isPrivate ? (
                          <>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>商品</span>{b.product?.title}</div>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>モデル</span>{b.model?.name || '—'}</div>
                            {b.event?.event_date && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>開催日</span>{b.event.event_date}{b.product?.time_label ? ` ${b.product.time_label}` : ''}</div>}
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>支払</span>{b.payment_method === 'card' ? 'カード決済' : '当日現金'}</div>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>金額</span>¥{price.toLocaleString()}</div>
                          </>
                        ) : isEP ? (
                          <>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>商品</span>{b.product?.name || '—'}</div>
                            {b.event?.event_date && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>開催日</span>{b.event.event_date}{b.event?.location_name ? ` ${b.event.location_name}` : ''}</div>}
                            {b.selections?.slot && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>時間枠</span>{b.selections.slot}</div>}
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>支払</span>{b.payment_method === 'card' ? 'カード決済' : '当日現金'}</div>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>金額</span>¥{price.toLocaleString()}</div>
                          </>
                        ) : (
                          <>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>イベント</span>{b.event?.event_date} {b.event?.location_name}</div>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>モデル</span>{b.model?.name}</div>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>時間枠</span>{b.slot?.slot_label}</div>
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>撮影場所</span>{b.is_outdoor ? '屋外' : '屋内'}</div>
                            {b.payment_method && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>支払</span>{b.payment_method === 'card' ? '💳 カード決済' : '💴 当日現金'}</div>}
                            <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>金額</span>¥{price.toLocaleString()}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 600 }}>QR / その他</div>
                      {b.qr_token ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(b.qr_token)}`}
                          alt="QR"
                          style={{ width: 100, height: 100, borderRadius: 6, border: '1px solid #e5e5e5', display: 'block', marginBottom: 8 }}
                        />
                      ) : <div style={{ fontSize: 12, color: '#ccc' }}>QRなし</div>}
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>予約日：{new Date(b.created_at).toLocaleDateString('ja-JP')}</div>
                      {!isPrivate && !isEP && b.marketing_consent && <div style={{ fontSize: 11, color: '#388e3c', marginTop: 4 }}>✓ メルマガ同意</div>}
                      {isCancelled ? (
                        <div style={{ marginTop: 16, fontSize: 13, color: '#c62828', fontWeight: 600 }}>✓ キャンセル済み（{new Date(b.cancelled_at).toLocaleDateString('ja-JP')}）</div>
                      ) : (
                        <button
                          onClick={() => cancelBooking(b)}
                          disabled={cancelling === b.id}
                          style={{ marginTop: 16, background: cancelling === b.id ? '#ccc' : '#c62828', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: cancelling === b.id ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                          {cancelling === b.id ? '送信中...' : '予約キャンセル・メール送信'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
