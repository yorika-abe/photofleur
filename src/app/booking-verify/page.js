import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export default async function BookingVerifyPage({ searchParams }) {
  const { token } = await searchParams
  if (!token) notFound()

  const supabase = await createSupabaseAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, payment_method, created_at, slot_id')
    .eq('qr_token', token)
    .single()

  if (!booking) notFound()

  const { data: slot } = await supabase
    .from('booking_slots')
    .select('slot_label, price, event_entry_id')
    .eq('id', booking.slot_id)
    .single()

  const { data: entry } = slot
    ? await supabase.from('event_entries').select('model_id, event_id').eq('id', slot.event_entry_id).single()
    : { data: null }

  const [{ data: model }, { data: event }] = await Promise.all([
    entry ? supabase.from('models').select('name').eq('id', entry.model_id).single() : { data: null },
    entry ? supabase.from('events').select('event_date, location_name, event_type').eq('id', entry.event_id).single() : { data: null },
  ])

  const isCard = booking.payment_method === 'card'

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>

      {/* 確認済みバナー */}
      <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
      </div>

      {/* 強調4項目 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>

        {/* 名前 */}
        <div style={{ background: '#0d1f3a', borderRadius: 14, padding: '18px 16px', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>お名前</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            {booking.last_name} {booking.first_name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {booking.last_name_kana} {booking.first_name_kana}
          </div>
        </div>

        {/* モデル */}
        <div style={{ background: '#1a3560', borderRadius: 14, padding: '18px 16px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>モデル</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{model?.name || '—'}</div>
        </div>

        {/* 料金 */}
        <div style={{ background: '#1a3560', borderRadius: 14, padding: '18px 16px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>料金</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
            ¥{Number(booking.final_price || 0).toLocaleString()}
          </div>
        </div>

        {/* 支払い方法 */}
        <div style={{ background: isCard ? '#1b5e20' : '#b71c1c', borderRadius: 14, padding: '18px 16px', gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36 }}>{isCard ? '💳' : '💴'}</div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: 4 }}>支払い方法</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {isCard ? 'クレジット決済済み' : '現金払い'}
            </div>
            {!isCard && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                当日 ¥{Number(booking.final_price || 0).toLocaleString()} を受け取ってください
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 詳細情報 */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {[
              ['開催日', event?.event_date ? formatDate(event.event_date) : '—'],
              ['撮影時間', slot?.slot_label || '—'],
              ['場所', event?.location_name || '—'],
              ['撮影場所', booking.is_outdoor ? '屋外' : '屋内'],
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

      <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 }}>
        予約ID: {booking.id}
      </p>
    </div>
  )
}
