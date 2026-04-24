import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import BookingSection from './BookingSection'

export const dynamic = 'force-dynamic'

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { data: event } = await supabase.from('events').select('event_date, title, location_name').eq('id', id).single()
  if (!event) return {}
  return { title: `${formatDateFull(event.event_date)} ${event.title || event.location_name} | PhotoFleur` }
}

export default async function EventDetailPage({ params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()

  const { data: eventRaw } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()
  const event = eventRaw ? { ...eventRaw, gallery_images: JSON.parse(eventRaw.gallery_images || '[]') } : null

  if (!event || event.status !== 'active') notFound()

  const { data: entriesRaw } = await supabase
    .from('event_entries')
    .select('id, model_id')
    .eq('event_id', id)

  const entryIds = entriesRaw?.map(e => e.id) || []
  const modelIds = entriesRaw?.map(e => e.model_id).filter(Boolean) || []

  const { data: modelsData } = modelIds.length
    ? await supabase.from('models').select('id, name, name_en, image, bio, street_price, studio_price').in('id', modelIds)
    : { data: [] }

  const modelMap = {}
  for (const m of modelsData || []) modelMap[m.id] = m

  const entries = (entriesRaw || []).map(e => ({ ...e, models: modelMap[e.model_id] || null }))

  const [{ data: allSlots }, { data: bookingCounts }] = await Promise.all([
    entryIds.length
      ? supabase.from('booking_slots').select('id, slot_label, start_time, price, is_reserved, max_reservations, slot_order, event_entry_id').in('event_entry_id', entryIds).order('slot_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    entryIds.length
      ? supabase.from('bookings').select('slot_id, is_outdoor').in('slot_id',
          (await supabase.from('booking_slots').select('id').in('event_entry_id', entryIds)).data?.map(s => s.id) || []
        )
      : Promise.resolve({ data: [] }),
  ])

  const slotsByEntry = {}
  for (const slot of allSlots || []) {
    if (!slotsByEntry[slot.event_entry_id]) slotsByEntry[slot.event_entry_id] = []
    slotsByEntry[slot.event_entry_id].push(slot)
  }

  const indoorCountBySlot = {}
  for (const b of bookingCounts || []) {
    if (!b.is_outdoor) {
      indoorCountBySlot[b.slot_id] = (indoorCountBySlot[b.slot_id] || 0) + 1
    }
  }

  const typeLabel = event.event_type === 'street' ? 'ストリート撮影' : event.event_type === 'studio' ? 'スタジオ撮影' : '撮影会'
  const typeColor = event.event_type === 'street' ? { bg: '#e8f5e9', color: '#388e3c' } : event.event_type === 'studio' ? { bg: '#e8eaf6', color: '#3949ab' } : { bg: '#fff3e0', color: '#e65100' }
  const now = new Date()
  const bookingOpen = event.booking_open_at ? new Date(event.booking_open_at) <= now : true

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/schedule" style={{ color: '#1a3560', textDecoration: 'none', fontSize: 14 }}>← スケジュール一覧</Link>

      {/* Hero image */}
      {event.main_image && (
        <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', maxHeight: 400 }}>
          <img src={event.main_image} alt={event.title || ''} style={{ width: '100%', height: 400, objectFit: 'cover' }} />
        </div>
      )}

      {/* Event header */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #e5e5e5', marginTop: 20, marginBottom: 24 }}>
        <span style={{ background: typeColor.bg, color: typeColor.color, borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>{typeLabel}</span>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: '14px 0 8px' }}>
          {event.title && <span>{event.title}<br /></span>}
          {formatDateFull(event.event_date)}
        </h1>
        {event.subtitle && <p style={{ fontSize: 15, color: '#666', margin: '0 0 16px' }}>{event.subtitle}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
          {event.location_name && (
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>場所</div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>{event.location_name}</div>
            </div>
          )}
          {event.meeting_place && (
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>集合場所</div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>
                {event.event_type === 'street' ? '確定メールに記載' : event.meeting_place}
              </div>
            </div>
          )}
          {event.meeting_address && event.event_type !== 'street' && (
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>住所</div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>{event.meeting_address}</div>
            </div>
          )}
          {event.meeting_map_url && event.event_type !== 'street' && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <a href={event.meeting_map_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1a3560', fontWeight: 600, fontSize: 14, textDecoration: 'none', background: '#f8fbff', padding: '8px 14px', borderRadius: 8 }}>
                📍 Google Mapsで見る
              </a>
            </div>
          )}
        </div>

        {event.event_type === 'studio' && event.studio_url && (
          <div style={{ marginTop: 12 }}>
            <a href={event.studio_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3949ab', fontSize: 13, textDecoration: 'none' }}>
              🏢 スタジオ詳細を見る →
            </a>
          </div>
        )}

        {event.access_note && (
          <div style={{ marginTop: 16, background: '#f8fbff', borderRadius: 8, padding: '14px', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
            <strong>アクセス：</strong>{event.access_note}
          </div>
        )}
      </div>

      {/* Street notice */}
      {event.event_type === 'street' && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: '#f57f17', marginBottom: 6, fontSize: 14 }}>⚠️ ストリート撮影について</div>
          <p style={{ color: '#795548', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            ストリートの集合場所詳細は<strong>確定メール</strong>に記載されています。ご確認ください。
            {event.street_notes && <><br />{event.street_notes}</>}
          </p>
        </div>
      )}

      {/* Gallery */}
      {event.gallery_images && event.gallery_images.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 16 }}>撮影イメージ</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {event.gallery_images.map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 16 }}>予約する</h2>
      <BookingSection
        entries={entries}
        slotsByEntry={slotsByEntry}
        indoorCountBySlot={indoorCountBySlot}
        bookingCounts={bookingCounts || []}
        bookingOpen={bookingOpen}
        bookingOpenAt={event.booking_open_at}
      />

      {/* Studio rules */}
      {event.studio_rules && (
        <div style={{ marginTop: 32, background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #e5e5e5' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 10 }}>スタジオ利用規約</h3>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{event.studio_rules}</p>
        </div>
      )}
    </div>
  )
}
