import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import ScheduleBookingTabs from '@/components/ScheduleBookingTabs'

export const metadata = { title: 'スケジュール一覧 | PhotoFleur' }

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }


function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

function formatDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
}

export default async function SchedulePage() {
  const today = new Date().toISOString().split('T')[0]
  const supabase = await createSupabaseAdminClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const eventIds = (events || []).map(e => e.id)
  const { data: entriesRaw } = eventIds.length > 0
    ? await supabase.from('event_entries').select('id, event_id, model_id').in('event_id', eventIds)
    : { data: [] }

  const modelIds = [...new Set((entriesRaw || []).map(e => e.model_id).filter(Boolean))]
  const { data: modelsData } = modelIds.length > 0
    ? await supabase.from('models').select('id, name, name_en, image, street_price, studio_price, twitter_url').in('id', modelIds)
    : { data: [] }
  const modelMap = {}
  for (const m of modelsData || []) modelMap[m.id] = m

  const entries = (entriesRaw || []).map(e => ({ ...e, models: modelMap[e.model_id] || null }))

  const entriesByEvent = {}
  for (const entry of entries) {
    if (!entriesByEvent[entry.event_id]) entriesByEvent[entry.event_id] = []
    entriesByEvent[entry.event_id].push(entry)
  }
  const eventsWithEntries = (events || []).map(ev => ({ ...ev, event_entries: entriesByEvent[ev.id] || [] }))

  const entryIds = (entries || []).map(e => e.id)
  const { data: allSlots } = entryIds.length > 0
    ? await supabase.from('booking_slots').select('id, slot_label, start_time, price, is_reserved, max_reservations, slot_order, event_entry_id').in('event_entry_id', entryIds).order('slot_order', { ascending: true })
    : { data: [] }
  const allSlotIds = (allSlots || []).map(s => s.id)
  const { data: bookingCounts } = allSlotIds.length > 0
    ? await supabase.from('bookings').select('slot_id, is_outdoor').in('slot_id', allSlotIds)
    : { data: [] }
  const slotsByEntry = {}
  for (const slot of allSlots || []) {
    if (!slotsByEntry[slot.event_entry_id]) slotsByEntry[slot.event_entry_id] = []
    slotsByEntry[slot.event_entry_id].push(slot)
  }
  const indoorCountBySlot = {}
  for (const b of bookingCounts || []) {
    if (!b.is_outdoor) indoorCountBySlot[b.slot_id] = (indoorCountBySlot[b.slot_id] || 0) + 1
  }
  const slotMap = {}
  for (const s of allSlots || []) slotMap[s.id] = s
  const indoorCountByLabel = {}
  for (const b of bookingCounts || []) {
    if (!b.is_outdoor) {
      const slot = slotMap[b.slot_id]
      if (slot) indoorCountByLabel[slot.slot_label] = (indoorCountByLabel[slot.slot_label] || 0) + 1
    }
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.35em', color: '#222', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Schedule</p>
          <h1 style={{ ...serif, fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 700, color: '#1a3560', margin: '0 0 20px' }}>開催予定のイベント</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
              📌 予約受付は撮影日の<strong>2週間前月曜日 21:00〜</strong>開始いたします。
            </p>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
              📌 予約開始の<strong>2日前まで</strong>にスケジュールを公開いたします。
            </p>
          </div>
        </div>

        {!eventsWithEntries || eventsWithEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#999' }}>
            <p>現在、予定されているイベントはありません。</p>
          </div>
        ) : (
          <div className="schedule-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {eventsWithEntries.map(ev => {
              const date = formatDate(ev.event_date)
              const dow = formatDow(ev.event_date)
              const type = ev.event_type || 'special'
              const cardBg = !ev.main_image
                ? (type === 'street' ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : type === 'studio' ? 'linear-gradient(160deg,#f4d6e8,#e8b8d0)' : 'linear-gradient(160deg,#c5cae9,#9fa8da)')
                : undefined

              return (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }} className="sched-card">
                  {/* Image */}
                  <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', background: cardBg || '#e8e8e8', marginBottom: 10 }}>
                    {ev.main_image && (
                      <img src={ev.main_image} alt={ev.title || ''} className="sched-img"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.45s ease', display: 'block' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '8px 2px 0', textAlign: 'center' }}>
                    <div style={{ ...serif, fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: '#111', lineHeight: 1, marginBottom: 5, letterSpacing: '0.04em' }}>
                      {date}（{dow}）
                    </div>
                    {ev.title && (
                      <div style={{ fontSize: 13, color: '#111', marginBottom: 6, fontWeight: 500 }}>
                        {ev.title}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#aaa' }}>詳細・予約 →</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {eventsWithEntries.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <ScheduleBookingTabs
              events={eventsWithEntries.map(ev => ({
                id: ev.id, event_date: ev.event_date, event_type: ev.event_type,
                title: ev.title, location_name: ev.location_name, booking_open_at: ev.booking_open_at,
                studio_capacity: ev.studio_capacity || null,
              }))}
              entriesByEvent={entriesByEvent}
              slotsByEntry={slotsByEntry}
              bookingCounts={bookingCounts || []}
              indoorCountBySlot={indoorCountBySlot}
              indoorCountByLabel={indoorCountByLabel}
            />
          </div>
        )}
      </div>

      <style>{`
        .sched-card:hover .sched-img { transform: scale(1.05); }
        .sched-card:hover { opacity: 0.92; }
        @media (max-width: 900px) { .schedule-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 560px) { .schedule-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }
      `}</style>
    </div>
  )
}
