import { createClient } from '@supabase/supabase-js'

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { searchParams } = new URL(req.url)
    if (searchParams.get('secret') !== process.env.CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('event_date', tomorrowDate)
      .eq('status', 'active')

    if (!events || events.length === 0) {
      return Response.json({ success: true, message: '明日のイベントはありません', sentCount: 0 })
    }

    const eventIds = events.map(e => e.id)

    const { data: entries } = await supabase
      .from('event_entries')
      .select('id')
      .in('event_id', eventIds)

    if (!entries || entries.length === 0) {
      return Response.json({ success: true, message: '明日のエントリーはありません', sentCount: 0 })
    }

    const entryIds = entries.map(e => e.id)

    const { data: slots } = await supabase
      .from('booking_slots')
      .select('id')
      .in('event_entry_id', entryIds)

    if (!slots || slots.length === 0) {
      return Response.json({ success: true, message: '明日の予約枠はありません', sentCount: 0 })
    }

    const slotIds = slots.map(s => s.id)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('slot_id, email')
      .in('slot_id', slotIds)

    if (!bookings || bookings.length === 0) {
      return Response.json({ success: true, message: '送信対象の予約がありません', sentCount: 0 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''
    const results = []

    for (const booking of bookings) {
      try {
        const res = await fetch(`${baseUrl}/api/send-day-before-mail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_id: booking.slot_id, email: booking.email }),
        })
        results.push({ slot_id: booking.slot_id, email: booking.email, ok: res.ok })
      } catch (e) {
        results.push({ slot_id: booking.slot_id, email: booking.email, ok: false, error: String(e) })
      }
    }

    return Response.json({
      success: true,
      sentCount: results.filter(r => r.ok).length,
      totalCount: results.length,
      results,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
