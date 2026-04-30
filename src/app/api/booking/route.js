import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const body = await req.json()
    const {
      slot_id, name, last_name, first_name, last_name_kana, first_name_kana,
      email, phone, sns_url, nickname, is_outdoor, discount_amount, final_price,
      coupon_id, marketing_consent,
    } = body

    if (!slot_id || !email || !last_name || !first_name || !nickname) {
      return Response.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    const { data: slot } = await supabase
      .from('booking_slots')
      .select('id, is_reserved, max_reservations')
      .eq('id', slot_id)
      .single()

    if (!slot) return Response.json({ error: '予約枠が見つかりません' }, { status: 404 })

    const { count: currentCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('slot_id', slot_id)

    const maxBookings = slot.max_reservations || 1
    if ((currentCount || 0) >= maxBookings * 2) {
      return Response.json({ error: 'この枠の予約は満員です' }, { status: 400 })
    }

    const qr_token = randomUUID()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        slot_id, name, last_name, first_name, last_name_kana, first_name_kana,
        email, phone: phone || null, sns_url: sns_url || null, nickname: nickname || null,
        is_outdoor: is_outdoor || false,
        discount_amount: discount_amount || 0,
        final_price: final_price || 0,
        coupon_id: coupon_id || null,
        marketing_consent: marketing_consent || false,
        qr_token,
      })
      .select('id')
      .single()

    if (bookingError) return Response.json({ error: bookingError.message }, { status: 500 })

    const { count: newIndoorCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('slot_id', slot_id)
      .eq('is_outdoor', false)

    if ((newIndoorCount || 0) >= maxBookings) {
      await supabase.from('booking_slots').update({ is_reserved: true }).eq('id', slot_id)
    }

    if (coupon_id) {
      await supabase.rpc('increment_coupon_used', { coupon_id_arg: coupon_id })
        .catch(() => supabase.from('coupons').update({ used_count: supabase.rpc('used_count + 1') }))
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''
    fetch(`${baseUrl}/api/notifications/line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'booking', slot_id }),
    }).catch(() => {})

    return Response.json({ success: true, booking_id: booking.id, qr_token })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
