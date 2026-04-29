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
    const { data } = await supabase
      .from('bookings')
      .select('id, name, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, qr_token, marketing_consent, created_at, slot_id, cancelled_at')
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const slotIds = [...new Set(data.map(b => b.slot_id).filter(Boolean))]
    if (slotIds.length === 0) { setBookings([]); setLoading(false); return }

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

    const enriched = data.map(b => {
      const slot = slotMap[b.slot_id] || {}
      const entry = entryMap[slot.event_entry_id] || {}
      const event = eventMap[entry.event_id] || {}
      const model = modelMap[entry.model_id] || {}
      return { ...b, slot, event, model }
    })

    setBookings(enriched)
    setLoading(false)
  }

  async function cancelBooking(b) {
    const name = b.name || `${b.last_name} ${b.first_name}`
    if (!confirm(`${name} 様の予約をキャンセルしてメールを送信しますか？`)) return
    setCancelling(b.id)
    const res = await fetch('/api/admin/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: b.id }),
    })
    setCancelling(null)
    if (!res.ok) { alert('エラーが発生しました'); return }
    setToast('キャンセルメールを発送しました。返金、キャンセル料、予約在庫の対応に移ってください。')
    setBookings(prev => prev.map(bk => bk.id === b.id ? { ...bk, cancelled_at: new Date().toISOString() } : bk))
    setTimeout(() => setToast(null), 6000)
  }

  const today = new Date().toISOString().split('T')[0]

  // ユニークなイベント一覧（開催日順）
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
    const matchSearch = !q || [b.name, b.email, b.phone, b.model?.name, b.event?.event_date].some(v => v?.toLowerCase().includes(q))

    return matchFilter && matchEvent && matchSearch
  })

  const totalRevenue = filtered.reduce((sum, b) => sum + (b.final_price || b.slot?.price || 0), 0)
  const outdoorCount = filtered.filter(b => b.is_outdoor).length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#1b5e20', color: '#fff', borderRadius: 10, padding: '14px 24px', fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
          {toast}
        </div>
      )}

      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', gap: 0, margin: '8px 0 24px', borderBottom: '2px solid #e5e5e5' }}>
        <Link href="/admin/booking-status" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>予約状況</Link>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#2f2244', borderBottom: '2px solid #2f2244', marginBottom: -2, cursor: 'default' }}>予約一覧</div>
        <Link href="/admin/sales" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>売上管理</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: '予約件数', value: `${filtered.length}件`, color: '#2f2244' },
          { label: '売上合計', value: `¥${totalRevenue.toLocaleString()}`, color: '#388e3c' },
          { label: '屋外撮影', value: `${outdoorCount}件`, color: '#e65100' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '16px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
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
            return (
              <div key={b.id} style={{ background: isCancelled ? '#fafafa' : '#fff', borderRadius: 12, border: isCancelled ? '1px solid #ffcdd2' : '1px solid #e5e5e5', overflow: 'hidden', opacity: isCancelled ? 0.7 : 1 }}>
                {/* Main row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : b.id)}
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isCancelled ? '#999' : '#2f2244' }}>{b.name || `${b.last_name} ${b.first_name}`}</span>
                      {isCancelled && <span style={{ background: '#ffcdd2', color: '#c62828', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>キャンセル済</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{b.email}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#555', minWidth: 120 }}>
                    {b.event?.event_date ? formatDate(b.event.event_date) : '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', minWidth: 80 }}>{b.model?.name || '—'}</div>
                  <div style={{ fontSize: 13, color: '#555', minWidth: 80 }}>{b.slot?.slot_label || '—'}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {b.is_outdoor && (
                      <span style={{ background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>屋外</span>
                    )}
                    <span style={{ background: b.event?.event_type === 'street' ? '#e8f5e9' : '#e8eaf6', color: b.event?.event_type === 'street' ? '#388e3c' : '#3949ab', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                      {b.event?.event_type === 'street' ? 'スト' : 'スタ'}
                    </span>
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
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>氏名</span>{b.last_name} {b.first_name}</div>
                        {b.last_name_kana && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>ふりがな</span>{b.last_name_kana} {b.first_name_kana}</div>}
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>メール</span>{b.email}</div>
                        {b.phone && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>電話</span>{b.phone}</div>}
                        {b.sns_url && <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>SNS</span><a href={b.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2f2244' }}>{b.sns_url.replace('https://', '')}</a></div>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 600 }}>予約内容</div>
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 2.2 }}>
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>イベント</span>{b.event?.event_date} {b.event?.location_name}</div>
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>モデル</span>{b.model?.name}</div>
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>時間枠</span>{b.slot?.slot_label}</div>
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>撮影</span>{b.is_outdoor ? '屋外' : '通常'}</div>
                        <div><span style={{ color: '#888', minWidth: 80, display: 'inline-block' }}>金額</span>¥{price.toLocaleString()}</div>
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
                      {b.marketing_consent && <div style={{ fontSize: 11, color: '#388e3c', marginTop: 4 }}>✓ メルマガ同意</div>}
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
