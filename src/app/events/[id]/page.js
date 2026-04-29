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
    ? await supabase.from('models').select('id, name, name_en, image, bio, street_price, studio_price, twitter_url').in('id', modelIds)
    : { data: [] }

  const modelMap = {}
  for (const m of modelsData || []) modelMap[m.id] = m

  const entries = (entriesRaw || []).map(e => ({ ...e, models: modelMap[e.model_id] || null }))

  const { data: products } = await supabase
    .from('event_products')
    .select('id, name, image, description, price, stock, available_slots')
    .eq('event_id', id)
    .order('display_order')
    .order('created_at')

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

  // スタジオ定員チェック用：同じ時間帯ラベルの屋内予約合計
  const slotMap = {}
  for (const s of allSlots || []) slotMap[s.id] = s
  const indoorCountByLabel = {}
  for (const b of bookingCounts || []) {
    if (!b.is_outdoor) {
      const slot = slotMap[b.slot_id]
      if (slot) indoorCountByLabel[slot.slot_label] = (indoorCountByLabel[slot.slot_label] || 0) + 1
    }
  }

  const typeLabel = event.event_type === 'street' ? 'ストリート撮影' : event.event_type === 'studio' ? 'スタジオ撮影' : '不定期撮影'
  const typeColor = event.event_type === 'street' ? { bg: '#e0f7fa', color: '#0097a7' } : event.event_type === 'studio' ? { bg: '#fce4ec', color: '#c2185b' } : { bg: '#e8eaf6', color: '#1a3560' }
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

        {(() => {
          const mapAddr = event.address || event.location_name
          const embedUrl = mapAddr ? `https://maps.google.com/maps?q=${encodeURIComponent(mapAddr)}&output=embed&hl=ja` : null
          const mapsLink = event.map_address || (mapAddr ? `https://maps.google.com/maps?q=${encodeURIComponent(mapAddr)}` : null)
          return (
            <div style={{ display: 'grid', gridTemplateColumns: embedUrl ? '1fr 1fr' : '1fr', gap: 20, marginTop: 20, alignItems: 'start' }}>
              {embedUrl && (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', height: 220 }}>
                  <iframe
                    src={embedUrl}
                    width="100%" height="220" style={{ border: 0, display: 'block' }}
                    allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {event.location_name && (
                  <div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>📍 開催場所</div>
                    <div style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>{event.location_name}</div>
                    {event.address && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{event.address}</div>}
                  </div>
                )}
                {event.meeting_place && (
                  <div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>集合場所</div>
                    <div style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>
                      {event.event_type === 'street' ? '確定メールに記載' : event.meeting_place}
                    </div>
                  </div>
                )}
                {mapsLink && (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1a3560', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: '#f8fbff', padding: '8px 14px', borderRadius: 8, width: 'fit-content' }}>
                    🗺️ Google Mapsで見る
                  </a>
                )}
                {event.studio_url && (
                  <a href={event.studio_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#3949ab', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                    🏢 スタジオ詳細を見る →
                  </a>
                )}
                {event.access_note && (
                  <div style={{ background: '#f8fbff', borderRadius: 8, padding: '12px', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                    <strong>アクセス：</strong>{event.access_note}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
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

      {/* Entry Models */}
      {entries.filter(e => e.models).length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 20 }}>エントリーモデル</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...new Map(entries.filter(e => e.models).map(e => [e.model_id, e])).values()].map(e => (
              <Link key={e.model_id} href={`/models/${e.model_id}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
                <div style={{ width: 90, height: 110, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid #e5e5e5' }}>
                  {e.models.image
                    ? <img src={e.models.image} alt={e.models.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: '#f0f4fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
                  }
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3560' }}>{e.models.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      {products && products.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 16 }}>予約商品</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {products.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
                {p.image && (
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 4 }}>{p.name}</div>
                  {p.available_slots?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 600, marginBottom: 6 }}>
                      🕐 {p.available_slots.join(' / ')}
                    </div>
                  )}
                  {p.description && (
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 8 }}>{p.description}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1a3560' }}>¥{(p.price || 0).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: '#999' }}>在庫 {p.stock}</span>
                  </div>
                </div>
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
        indoorCountByLabel={indoorCountByLabel}
        studioCapacity={event.studio_capacity || null}
        eventType={event.event_type}
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
