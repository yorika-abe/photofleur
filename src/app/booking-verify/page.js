import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function shootingLocation(eventType, isOutdoor) {
  if (eventType === 'street') return 'ストリート'
  if (isOutdoor) return '野外'
  return 'スタジオ'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

// カートトークンで複数予約を一括表示
async function CartTokenView({ cartToken, supabase }) {
  const [{ data: bookings }, { data: epBookings }] = await Promise.all([
    supabase.from('bookings')
      .select('id, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, payment_method, slot_id')
      .eq('cart_token', cartToken),
    supabase.from('event_product_bookings')
      .select('id, customer_name, customer_email, customer_phone, selections, final_price, payment_method, product_id, event_id')
      .eq('cart_token', cartToken),
  ])

  if ((!bookings || bookings.length === 0) && (!epBookings || epBookings.length === 0)) notFound()

  // スロット予約のDB情報取得
  const enrichedBookings = await Promise.all((bookings || []).map(async (b) => {
    const { data: slot } = await supabase.from('booking_slots').select('slot_label, price, event_entry_id').eq('id', b.slot_id).single()
    const { data: entry } = slot ? await supabase.from('event_entries').select('model_id, event_id').eq('id', slot.event_entry_id).single() : { data: null }
    const [{ data: model }, { data: event }] = await Promise.all([
      entry ? supabase.from('models').select('name').eq('id', entry.model_id).single() : { data: null },
      entry ? supabase.from('events').select('event_date, location_name, event_type').eq('id', entry.event_id).single() : { data: null },
    ])
    return { ...b, slot, model, event }
  }))

  // EP予約のDB情報取得
  const enrichedEpBookings = await Promise.all((epBookings || []).map(async (b) => {
    const [{ data: product }, { data: event }] = await Promise.all([
      supabase.from('event_products').select('name, price').eq('id', b.product_id).single(),
      supabase.from('events').select('event_date, location_name').eq('id', b.event_id).single(),
    ])
    return { ...b, product, event }
  }))

  const firstBooking = enrichedBookings[0]
  const customerName = firstBooking
    ? `${firstBooking.last_name || ''} ${firstBooking.first_name || ''}`.trim()
    : enrichedEpBookings[0]?.customer_name || ''
  const email = firstBooking?.email || enrichedEpBookings[0]?.customer_email || ''

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
      </div>

      <div style={{ background: '#0d1f3a', borderRadius: 14, padding: '18px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>お名前</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{customerName}</div>
        {firstBooking?.last_name_kana && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {firstBooking.last_name_kana} {firstBooking.first_name_kana}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{email}</div>
      </div>

      {enrichedBookings.map((b, i) => {
        const isCard = b.payment_method === 'card'
        return (
          <div key={b.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
            {enrichedBookings.length > 1 && (
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                スロット予約 {i + 1}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {[
                  ['モデル', b.model?.name || '—'],
                  ['開催日', b.event?.event_date ? formatDate(b.event.event_date) : '—'],
                  ['撮影時間', b.slot?.slot_label || '—'],
                  ['場所', b.event?.location_name || '—'],
                  ['撮影場所', shootingLocation(b.event?.event_type, b.is_outdoor)],
                  ['料金', `¥${Number(b.final_price || 0).toLocaleString()}`],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '9px 0', color: '#888', width: '35%', fontSize: 13 }}>{label}</td>
                    <td style={{ padding: '9px 0', fontWeight: 600, color: '#333', fontSize: 13 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14, background: isCard ? '#1b5e20' : '#b71c1c', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{isCard ? '💳' : '💴'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{isCard ? 'クレジット決済済み' : '現金払い'}</div>
                {!isCard && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>当日 ¥{Number(b.final_price || 0).toLocaleString()} を受け取ってください</div>}
              </div>
            </div>
          </div>
        )
      })}

      {enrichedEpBookings.map((b, i) => {
        const isCard = b.payment_method === 'card'
        return (
          <div key={b.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
            {enrichedEpBookings.length > 1 && (
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                特別予約商品 {i + 1}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {[
                  ['商品名', b.product?.name || '—'],
                  ['開催日', b.event?.event_date ? formatDate(b.event.event_date) : '—'],
                  ['時間枠', b.selections?.slot || '—'],
                  ['場所', b.event?.location_name || '—'],
                  ['料金', `¥${Number(b.product?.price || 0).toLocaleString()}`],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '9px 0', color: '#888', width: '35%', fontSize: 13 }}>{label}</td>
                    <td style={{ padding: '9px 0', fontWeight: 600, color: '#333', fontSize: 13 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {b.payment_method && (
              <div style={{ marginTop: 14, background: isCard ? '#1b5e20' : '#b71c1c', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{isCard ? '💳' : '💴'}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{isCard ? 'クレジット決済済み' : '現金払い'}</div>
              </div>
            )}
          </div>
        )
      })}

      <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 }}>
        カートID: {cartToken.slice(0, 8)}…
      </p>
    </div>
  )
}

async function SingleTokenView({ token, supabase }) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, payment_method, created_at, slot_id')
    .eq('qr_token', token)
    .single()

  if (booking) {
    const { data: slot } = await supabase.from('booking_slots').select('slot_label, price, event_entry_id').eq('id', booking.slot_id).single()
    const { data: entry } = slot ? await supabase.from('event_entries').select('model_id, event_id').eq('id', slot.event_entry_id).single() : { data: null }
    const [{ data: model }, { data: event }] = await Promise.all([
      entry ? supabase.from('models').select('name').eq('id', entry.model_id).single() : { data: null },
      entry ? supabase.from('events').select('event_date, location_name, event_type').eq('id', entry.event_id).single() : { data: null },
    ])

    const isCard = booking.payment_method === 'card'

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#0d1f3a', borderRadius: 14, padding: '18px 16px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>お名前</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{booking.last_name} {booking.first_name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{booking.last_name_kana} {booking.first_name_kana}</div>
          </div>
          <div style={{ background: '#1a3560', borderRadius: 14, padding: '18px 16px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>モデル</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{model?.name || '—'}</div>
          </div>
          <div style={{ background: '#1a3560', borderRadius: 14, padding: '18px 16px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>料金</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>¥{Number(booking.final_price || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: isCard ? '#1b5e20' : '#b71c1c', borderRadius: 14, padding: '18px 16px', gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 36 }}>{isCard ? '💳' : '💴'}</div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: 4 }}>支払い方法</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{isCard ? 'クレジット決済済み' : '現金払い'}</div>
              {!isCard && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>当日 ¥{Number(booking.final_price || 0).toLocaleString()} を受け取ってください</div>}
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['開催日', event?.event_date ? formatDate(event.event_date) : '—'],
                ['撮影時間', slot?.slot_label || '—'],
                ['場所', event?.location_name || '—'],
                ['撮影場所', shootingLocation(event?.event_type, booking.is_outdoor)],
                ['電話番号', booking.phone || '—'],
                ['SNS URL', booking.sns_url || '—'],
                ['メール', booking.email],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 0', color: '#888', width: '35%', verticalAlign: 'top', fontSize: 13 }}>{label}</td>
                  <td style={{ padding: '10px 0', fontWeight: 600, color: '#333', wordBreak: 'break-all', fontSize: 13 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 }}>予約ID: {booking.id}</p>
      </div>
    )
  }

  const { data: epb } = await supabase
    .from('event_product_bookings')
    .select('id, customer_name, customer_email, customer_phone, final_price, payment_method, selections, product_id, event_id')
    .eq('qr_token', token)
    .single()

  if (epb) {
    const [{ data: product }, { data: event }] = await Promise.all([
      supabase.from('event_products').select('name, price').eq('id', epb.product_id).single(),
      supabase.from('events').select('event_date, location_name').eq('id', epb.event_id).single(),
    ])
    const isCard = epb.payment_method === 'card'
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#0d1f3a', borderRadius: 14, padding: '18px 16px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>お名前</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{epb.customer_name}</div>
          </div>
          <div style={{ background: '#1a3560', borderRadius: 14, padding: '18px 16px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>料金</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>¥{Number(epb.final_price || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: isCard ? '#1b5e20' : '#b71c1c', borderRadius: 14, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 30 }}>{isCard ? '💳' : '💴'}</div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>支払い</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{isCard ? 'クレジット済み' : '現金払い'}</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['商品名', product?.name || '—'],
                ['開催日', event?.event_date ? formatDate(event.event_date) : '—'],
                ['場所', event?.location_name || '—'],
                ['電話番号', epb.customer_phone || '—'],
                ['メール', epb.customer_email || '—'],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 0', color: '#888', width: '35%', fontSize: 13 }}>{label}</td>
                  <td style={{ padding: '10px 0', fontWeight: 600, color: '#333', wordBreak: 'break-all', fontSize: 13 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 }}>予約ID: {epb.id}</p>
      </div>
    )
  }

  const { data: pb } = await supabase
    .from('private_bookings')
    .select('id, email, last_name, first_name, private_products(title, price, event_date, time_label, models(name))')
    .eq('qr_token', token)
    .single()

  if (pb) {
    const product = pb.private_products
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
        </div>
        <div style={{ background: '#0d1f3a', borderRadius: 14, padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>お名前</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{pb.last_name} {pb.first_name}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['商品名', product?.title || '—'],
                ['担当モデル', product?.models?.name || '—'],
                ['開催日', product?.event_date ? formatDate(product.event_date) : '—'],
                ['時間枠', product?.time_label || '—'],
                ['撮影場所', 'リクエスト撮影'],
                ['料金', `¥${Number(product?.price || 0).toLocaleString()}`],
                ['メール', pb.email],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 0', color: '#888', width: '35%', fontSize: 13 }}>{label}</td>
                  <td style={{ padding: '10px 0', fontWeight: 600, color: '#333', fontSize: 13 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 }}>予約ID: {pb.id}</p>
      </div>
    )
  }

  notFound()
}

async function MultiTokenView({ tokens, supabase }) {
  const tokenList = tokens.split(',').map(t => t.trim()).filter(Boolean)
  if (!tokenList.length) notFound()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, final_price, payment_method, slot_id, cancelled_at, is_outdoor')
    .in('qr_token', tokenList)

  if (!bookings?.length) notFound()

  const enriched = await Promise.all(bookings.map(async b => {
    const { data: slot } = await supabase.from('booking_slots').select('slot_label, event_entry_id, start_time').eq('id', b.slot_id).single()
    const { data: entry } = slot ? await supabase.from('event_entries').select('model_id, event_id').eq('id', slot.event_entry_id).single() : { data: null }
    const [{ data: model }, { data: event }] = await Promise.all([
      entry ? supabase.from('models').select('name').eq('id', entry.model_id).single() : { data: null },
      entry ? supabase.from('events').select('event_date, location_name, event_type').eq('id', entry.event_id).single() : { data: null },
    ])
    return { ...b, slot, model, event }
  }))

  enriched.sort((a, b) => (a.slot?.start_time || '').localeCompare(b.slot?.start_time || ''))

  const first = enriched[0]
  const email = first.email
  const eventDate = first.event?.event_date
  const locationName = first.event?.location_name

  const cashItems = enriched.filter(b => b.payment_method !== 'card' && !b.cancelled_at)
  const cardItems = enriched.filter(b => b.payment_method === 'card' && !b.cancelled_at)
  const cashTotal = cashItems.reduce((s, b) => s + Number(b.final_price || 0), 0)
  const cardTotal = cardItems.reduce((s, b) => s + Number(b.final_price || 0), 0)

  let totalBookings = 0
  try {
    const [r1, r2] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('email', email).is('cancelled_at', null),
      supabase.from('private_bookings').select('id', { count: 'exact', head: true }).eq('email', email).is('cancelled_at', null),
    ])
    totalBookings = (r1.count || 0) + (r2.count || 0)
  } catch {}

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
      </div>

      {locationName && (
        <div style={{ background: '#5bbfd6', borderRadius: 14, padding: '14px 18px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em', marginBottom: 4 }}>📍 撮影場所</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{locationName}</div>
        </div>
      )}

      <div style={{ background: '#0d1f3a', borderRadius: 14, padding: '18px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>お名前</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{first.last_name} {first.first_name}</div>
        {first.last_name_kana && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{first.last_name_kana} {first.first_name_kana}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cashTotal > 0 && cardTotal > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
        {cashTotal > 0 && (
          <div style={{ background: '#b71c1c', borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>💴</span>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>現金払い</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>¥{cashTotal.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>当日受け取りください</div>
            </div>
          </div>
        )}
        {cardTotal > 0 && (
          <div style={{ background: '#1b5e20', borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>💳</span>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>クレジット決済済み</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>¥{cardTotal.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 12 }}>予約枠</div>
        {enriched.map((b, i) => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < enriched.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3560' }}>{b.slot?.slot_label || '—'}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>モデル：{b.model?.name || '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>¥{Number(b.final_price || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: b.payment_method === 'card' ? '#1b5e20' : '#b71c1c', marginTop: 2 }}>
                {b.payment_method === 'card' ? '💳' : '💴'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#f3e5f5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>📸</span>
        <div>
          <div style={{ fontSize: 11, color: '#7b1fa2', fontWeight: 600 }}>予約回数</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#4a148c' }}>{totalBookings}回</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {[
              ['開催日', eventDate ? formatDate(eventDate) : '—'],
              ['場所', locationName || '—'],
              ['電話番号', first.phone || '—'],
              ['SNS URL', first.sns_url || '—'],
              ['メール', email || '—'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 0', color: '#888', width: '35%', verticalAlign: 'top', fontSize: 13 }}>{label}</td>
                <td style={{ padding: '10px 0', fontWeight: 600, color: '#333', wordBreak: 'break-all', fontSize: 13 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function BookingVerifyPage({ searchParams }) {
  const { token, cart_token, tokens } = await searchParams
  if (!token && !cart_token && !tokens) notFound()

  const supabase = await createSupabaseAdminClient()

  if (tokens) {
    return <MultiTokenView tokens={tokens} supabase={supabase} />
  }
  if (cart_token) {
    return <CartTokenView cartToken={cart_token} supabase={supabase} />
  }
  return <SingleTokenView token={token} supabase={supabase} />
}
