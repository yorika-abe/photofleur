'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

  useEffect(() => {
    document.cookie = `bookings_last_viewed=${new Date().toISOString()}; path=/; max-age=${60 * 60 * 24 * 365}`
    load()
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/bookings')
    if (!res.ok) { setLoading(false); return }
    const { bookings: all } = await res.json()
    setBookings(all || [])
    setLoading(false)
  }

  function cancelBooking(b) {
    const price = b.final_price || b.slot?.price || 0
    const hasCard = b.payment_method === 'card' && b.square_payment_id
    setRefundModal({ booking: b, refundType: hasCard ? 'full' : 'none', customAmount: String(price), cancelReason: '', internalReason: '' })
  }

  async function executeCancel(b, refundAmount, cancelReason, internalReason) {
    setRefundModal(null)
    setCancelling(b.id)

    const baseBody = b._type === 'private'
      ? { private_booking_id: b.id }
      : b._type === 'event_product'
      ? { event_product_booking_id: b.id }
      : b._type === 'goods'
      ? { goods_order_id: b.id }
      : { booking_id: b.id }

    const res = await fetch('/api/admin/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseBody, refund_amount: refundAmount, cancel_reason: cancelReason || '', internal_reason: internalReason || undefined }),
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 12px' }}>

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

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2f2244', marginBottom: 6 }}>キャンセル理由（メールに記載されます）</label>
                <textarea
                  value={refundModal.cancelReason}
                  onChange={e => setRefundModal({ ...refundModal, cancelReason: e.target.value })}
                  rows={3}
                  placeholder="例：イベント中止のため、定員超過のため、など"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 10, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              {b._type !== 'goods' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#c2185b', marginBottom: 6 }}>キャンセル理由（モデル・スタッフに知らされます）</label>
                  <textarea
                    value={refundModal.internalReason}
                    onChange={e => setRefundModal({ ...refundModal, internalReason: e.target.value })}
                    rows={3}
                    placeholder="モデル・スタッフへの通知内容（入力した場合のみLINE送信）"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #f48fb1', borderRadius: 10, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              )}

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
                    <div style={{ fontSize: 12, color: '#1565c0', background: '#e3f2fd', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
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
                  onClick={() => executeCancel(b, refundAmount, refundModal.cancelReason, refundModal.internalReason)}
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
      <style>{`
        .adm-tabs { display:flex; gap:0; margin:8px 0 24px; border-bottom:2px solid #e5e5e5; flex-wrap:wrap; }
        .adm-tab { padding:10px 20px; font-weight:600; font-size:15px; white-space:nowrap; }
        .bk-filters { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
        .bk-filter-select { padding:7px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; min-width:180px; }
        .bk-filter-input { flex:1; min-width:200px; padding:7px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; }
        .bk-card-main { padding:14px 18px; display:flex; align-items:center; gap:12px; cursor:pointer; flex-wrap:wrap; }
        .bk-name-col { flex:1; min-width:140px; }
        .bk-date-col { font-size:13px; color:#555; min-width:120px; }
        .bk-model-col { font-size:13px; color:#555; min-width:80px; }
        .bk-slot-col { font-size:13px; color:#555; min-width:80px; }
        .bk-price-col { font-weight:700; font-size:14px; color:#2f2244; min-width:80px; text-align:right; }
        .bk-card-mobile { display:none; }
        .bk-m-col1 { flex-shrink:0; max-width:90px; min-width:0; }
        .bk-m-name { font-weight:700; font-size:12px; color:#2f2244; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .bk-m-col2 { flex:1; min-width:0; color:#555; }
        .bk-m-info { font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.5; }
        .bk-m-col3 { flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
        .bk-m-badges { display:flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; }
        .bk-m-price { display:flex; align-items:center; gap:3px; font-weight:700; font-size:12px; color:#2f2244; }
        .bk-detail { padding:16px 18px; border-top:1px solid #f0f0f0; background:#fafafa; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; }
        .bk-detail-rows { font-size:13px; color:#444; line-height:2.2; }
        .bk-detail-row { display:flex; gap:6px; align-items:baseline; }
        .bk-detail-label { color:#888; min-width:72px; flex-shrink:0; font-size:12px; }
        @media(max-width:640px){
          .adm-tab { padding:8px 10px; font-size:12px; }
          .bk-filters { gap:6px; }
          .bk-filter-select { min-width:0; width:100%; }
          .bk-filter-input { min-width:0; width:100%; flex:none; }
          .bk-card-main { display:none !important; }
          .bk-card-mobile { display:flex; align-items:center; gap:6px; padding:9px 10px; cursor:pointer; }
          .bk-detail { padding:12px 10px; gap:10px; grid-template-columns:1fr 1fr; }
          .bk-detail-rows { line-height:1.7; font-size:12px; }
          .bk-detail-label { min-width:52px; font-size:11px; }
        }
      `}</style>
      <div className="adm-tabs">
        <Link href="/admin/booking-status" className="adm-tab" style={{ color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>予約状況</Link>
        <div className="adm-tab" style={{ fontWeight: 700, color: '#2f2244', borderBottom: '2px solid #2f2244', marginBottom: -2, cursor: 'default' }}>予約・販売一覧</div>
        <Link href="/admin/sales" className="adm-tab" style={{ color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>売上管理</Link>
        <Link href="/admin/booking-status?tab=nonevent" className="adm-tab" style={{ color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>イベント外収益</Link>
        <Link href="/admin/booking-status?tab=history" className="adm-tab" style={{ color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>履歴</Link>
      </div>

      {/* Filters */}
      <div className="bk-filters">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all', '全て'], ['upcoming', '今後'], ['past', '過去'], ['outdoor', '屋外']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: filter === key ? '#2f2244' : '#ddd', background: filter === key ? '#2f2244' : '#fff', color: filter === key ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {label}
            </button>
          ))}
        </div>
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
          className="bk-filter-select"
          style={{ color: eventFilter ? '#2f2244' : '#999' }}>
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
          className="bk-filter-input"
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
            const isGoods = b._type === 'goods'
            const borderColor = isCancelled ? '1px solid #ffcdd2' : isPrivate ? '1px solid #e8d5f5' : isEP ? '1px solid #d5e8f5' : isGoods ? '1px solid #ffd5b0' : '1px solid #e5e5e5'
            return (
              <div key={b.id} style={{ background: isCancelled ? '#fafafa' : '#fff', borderRadius: 12, border: borderColor, overflow: 'hidden', opacity: isCancelled ? 0.7 : 1 }}>
                {/* Main row */}
                <div onClick={() => setExpanded(isExpanded ? null : b.id)} className="bk-card-main">
                  <div className="bk-name-col">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isCancelled ? '#999' : '#2f2244' }}>{b.name || `${b.last_name} ${b.first_name}`}</span>
                      {isCancelled && <span style={{ background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>キャンセル</span>}
                      {isPrivate && <span style={{ background: '#fce4ec', color: '#c2185b', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>非公開</span>}
                      {isEP && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>特別予約</span>}
                      {isGoods && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>グッズ</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{b.email}</div>
                  </div>
                  <div className="bk-date-col">{b.event?.event_date ? formatDate(b.event.event_date) : '—'}</div>
                  <div className="bk-model-col">{b.model?.name || '—'}</div>
                  <div className="bk-slot-col">
                    {(isPrivate || isEP || isGoods) ? (b.product?.name || b.product?.title || '—') : (b.slot?.slot_label || '—')}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    {!isPrivate && !isEP && !isGoods && b.is_outdoor && (
                      <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 600 }}>屋外</span>
                    )}
                    {!isPrivate && !isGoods && (
                      <span style={{ background: b.event?.event_type === 'street' ? '#e8f5e9' : '#e3f2fd', color: b.event?.event_type === 'street' ? '#388e3c' : '#1a3560', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 600 }}>
                        {b.event?.event_type === 'street' ? 'スト' : 'スタ'}
                      </span>
                    )}
                    {(() => {
                      const pm = b.payment_method
                      if (!pm) return null
                      return (
                        <span style={{ background: pm === 'card' ? '#e3f2fd' : '#f1f8e9', color: pm === 'card' ? '#1565c0' : '#33691e', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 600 }}>
                          {pm === 'card' ? '💳カード' : '💴現金'}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="bk-price-col">¥{price.toLocaleString()}</div>
                  <div style={{ color: '#bbb', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {/* Mobile card row */}
                <div onClick={() => setExpanded(isExpanded ? null : b.id)} className="bk-card-mobile">
                  {/* Col1: 名前 */}
                  <div className="bk-m-col1">
                    <div className="bk-m-name" style={{ color: isCancelled ? '#999' : '#2f2244' }}>
                      {b.name || `${b.last_name} ${b.first_name}`}
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                      {isCancelled && <span style={{ background: '#ffcdd2', color: '#c62828', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700 }}>取消</span>}
                      {isPrivate && <span style={{ background: '#fce4ec', color: '#c2185b', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700 }}>非公開</span>}
                      {isEP && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700 }}>特別</span>}
                      {isGoods && <span style={{ background: '#fff3e0', color: '#e65100', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700 }}>グッズ</span>}
                    </div>
                  </div>
                  {/* Col2: 日付＋モデル＋スロット */}
                  <div className="bk-m-col2">
                    <div className="bk-m-info">
                      {b.event?.event_date ? formatDate(b.event.event_date) : ''}
                      {b.model?.name ? `　${b.model.name}` : ''}
                      {(isPrivate || isEP || isGoods)
                        ? (b.product?.name || b.product?.title ? `　${b.product?.name || b.product?.title}` : '')
                        : (b.slot?.slot_label ? `　${b.slot.slot_label}` : '')}
                    </div>
                  </div>
                  {/* Col3: バッジ＋金額＋▼ */}
                  <div className="bk-m-col3">
                    <div className="bk-m-badges">
                      {!isPrivate && !isEP && !isGoods && b.is_outdoor && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 600 }}>屋外</span>}
                      {!isPrivate && !isGoods && <span style={{ background: b.event?.event_type === 'street' ? '#e8f5e9' : '#e3f2fd', color: b.event?.event_type === 'street' ? '#388e3c' : '#1a3560', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 600 }}>{b.event?.event_type === 'street' ? 'スト' : 'スタ'}</span>}
                      {b.payment_method && <span style={{ background: b.payment_method === 'card' ? '#e3f2fd' : '#f1f8e9', color: b.payment_method === 'card' ? '#1565c0' : '#33691e', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 600 }}>{b.payment_method === 'card' ? '💳カード' : '💴現金'}</span>}
                    </div>
                    <div className="bk-m-price">
                      ¥{price.toLocaleString()}
                      <span style={{ color: '#bbb', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="bk-detail">
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 600 }}>お客様情報</div>
                      <div className="bk-detail-rows">
                        <div className="bk-detail-row"><span className="bk-detail-label">氏名</span>{isEP ? b.customer_name : `${b.last_name} ${b.first_name}`}</div>
                        {!isEP && b.last_name_kana && <div className="bk-detail-row"><span className="bk-detail-label">ふりがな</span>{b.last_name_kana} {b.first_name_kana}</div>}
                        <div className="bk-detail-row"><span className="bk-detail-label">メール</span><span style={{ wordBreak: 'break-all' }}>{b.email}</span></div>
                        {b.phone && <div className="bk-detail-row"><span className="bk-detail-label">電話</span>{b.phone}</div>}
                        {b.sns_url && <div className="bk-detail-row"><span className="bk-detail-label">SNS</span><a href={b.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2f2244', wordBreak: 'break-all' }}>{b.sns_url.replace('https://', '')}</a></div>}
                        {isPrivate && b.notes && <div className="bk-detail-row"><span className="bk-detail-label">備考</span>{b.notes}</div>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 600 }}>予約内容</div>
                      <div className="bk-detail-rows">
                        {isPrivate ? (
                          <>
                            <div className="bk-detail-row"><span className="bk-detail-label">商品</span>{b.product?.title}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">モデル</span>{b.model?.name || '—'}</div>
                            {b.event_date_input && <div className="bk-detail-row"><span className="bk-detail-label">開催日</span>{b.event_date_input}</div>}
                            {b.meeting_place && <div className="bk-detail-row"><span className="bk-detail-label">集合場所</span>{b.meeting_place}</div>}
                            {b.shooting_time && <div className="bk-detail-row"><span className="bk-detail-label">撮影時間</span>{b.shooting_time}</div>}
                            <div className="bk-detail-row"><span className="bk-detail-label">支払</span>{b.payment_method === 'card' ? 'カード' : '当日現金'}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">金額</span>¥{price.toLocaleString()}</div>
                          </>
                        ) : isGoods ? (
                          <>
                            <div className="bk-detail-row"><span className="bk-detail-label">商品</span>{b.product?.title || '—'}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">数量</span>{b.quantity || 1}個</div>
                            {b.options_selected && <div className="bk-detail-row"><span className="bk-detail-label">選択肢</span>{b.options_selected._label || Object.entries(b.options_selected).filter(([k]) => k !== '_label').map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`).join(' / ')}</div>}
                            {b.delivery_address && <div className="bk-detail-row"><span className="bk-detail-label">配送先</span><span style={{ whiteSpace: 'pre-wrap' }}>{b.delivery_address}</span></div>}
                            {b.sns_url && <div className="bk-detail-row"><span className="bk-detail-label">SNS</span><a href={b.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2f2244', wordBreak: 'break-all' }}>{b.sns_url.replace('https://', '')}</a></div>}
                            {b.notes && <div className="bk-detail-row"><span className="bk-detail-label">備考</span>{b.notes}</div>}
                            <div className="bk-detail-row"><span className="bk-detail-label">支払</span>{b.payment_method === 'card' ? 'カード' : '当日現金'}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">金額</span>¥{price.toLocaleString()}</div>
                          </>
                        ) : isEP ? (
                          <>
                            <div className="bk-detail-row"><span className="bk-detail-label">商品</span>{b.product?.name || '—'}</div>
                            {b.event?.event_date && <div className="bk-detail-row"><span className="bk-detail-label">開催日</span>{b.event.event_date}{b.event?.location_name ? ` ${b.event.location_name}` : ''}</div>}
                            {Object.entries(b.selections || {}).filter(([k]) => k !== 'delivery_address' && k !== '_final_price').map(([k, v]) => (
                              <div key={k} className="bk-detail-row"><span className="bk-detail-label">{k}</span>{Array.isArray(v) ? v.join(', ') : v}</div>
                            ))}
                            {b.selections?.delivery_address && <div className="bk-detail-row"><span className="bk-detail-label">配送先</span><span style={{ whiteSpace: 'pre-wrap' }}>{b.selections.delivery_address}</span></div>}
                            <div className="bk-detail-row"><span className="bk-detail-label">支払</span>{b.payment_method === 'card' ? 'カード' : '当日現金'}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">金額</span>¥{price.toLocaleString()}</div>
                          </>
                        ) : (
                          <>
                            <div className="bk-detail-row"><span className="bk-detail-label">イベント</span>{b.event?.event_date} {b.event?.location_name}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">モデル</span>{b.model?.name}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">時間枠</span>{b.slot?.slot_label}</div>
                            <div className="bk-detail-row"><span className="bk-detail-label">撮影場所</span>{b.is_outdoor ? '屋外' : '屋内'}</div>
                            {b.payment_method && <div className="bk-detail-row"><span className="bk-detail-label">支払</span>{b.payment_method === 'card' ? '💳カード' : '💴現金'}</div>}
                            <div className="bk-detail-row"><span className="bk-detail-label">金額</span>¥{price.toLocaleString()}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 600 }}>QR / その他</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        {b.qr_token ? (
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}/booking-verify?token=${b.qr_token}`)}`}
                            alt="QR"
                            style={{ width: 100, height: 100, borderRadius: 6, border: '1px solid #e5e5e5', flexShrink: 0 }}
                          />
                        ) : <div style={{ fontSize: 12, color: '#ccc' }}>QRなし</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                          {isCancelled ? (
                            <div style={{ fontSize: 13, color: '#c62828', fontWeight: 600 }}>✓ キャンセル済み（{new Date(b.cancelled_at).toLocaleDateString('ja-JP')}）</div>
                          ) : (
                            <button
                              onClick={() => cancelBooking(b)}
                              disabled={cancelling === b.id}
                              style={{ background: cancelling === b.id ? '#ccc' : '#c62828', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: cancelling === b.id ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
                              {cancelling === b.id ? '送信中...' : '予約キャンセル・メール送信'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>予約日：{new Date(b.created_at).toLocaleDateString('ja-JP')}</div>
                      {!isPrivate && !isEP && b.marketing_consent && <div style={{ fontSize: 11, color: '#388e3c', marginTop: 2 }}>✓ メルマガ同意</div>}
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
