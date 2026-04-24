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
    .select('id, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, created_at, slot_id')
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

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 16, padding: '24px', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>予約確認済み</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '24px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>予約情報</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {[
              ['お名前', `${booking.last_name} ${booking.first_name}（${booking.last_name_kana} ${booking.first_name_kana}）`],
              ['メール', booking.email],
              ['電話番号', booking.phone || '—'],
              ['SNS URL', booking.sns_url || '—'],
              ['モデル', model?.name || '—'],
              ['開催日', event?.event_date ? formatDate(event.event_date) : '—'],
              ['撮影時間', slot?.slot_label || '—'],
              ['場所', event?.location_name || '—'],
              ['撮影場所', booking.is_outdoor ? '屋外' : '屋内'],
              ['料金', `¥${Number(booking.final_price || 0).toLocaleString()}`],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 0', color: '#888', width: '35%', verticalAlign: 'top' }}>{label}</td>
                <td style={{ padding: '10px 0', fontWeight: 600, color: '#333', wordBreak: 'break-all' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 24 }}>
        予約ID: {booking.id}
      </p>
    </div>
  )
}
