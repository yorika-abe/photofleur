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

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}（${days[d.getDay()]}）`
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

  const slotMap = {}
  for (const s of allSlots || []) slotMap[s.id] = s
  const indoorCountByLabel = {}
  for (const b of bookingCounts || []) {
    if (!b.is_outdoor) {
      const slot = slotMap[b.slot_id]
      if (slot) indoorCountByLabel[slot.slot_label] = (indoorCountByLabel[slot.slot_label] || 0) + 1
    }
  }

  const now = new Date()
  const bookingOpen = event.booking_open_at ? new Date(event.booking_open_at) <= now : true

  const mapAddr = event.address || event.location_name
  const embedUrl = mapAddr ? `https://maps.google.com/maps?q=${encodeURIComponent(mapAddr)}&output=embed&hl=ja` : null
  const mapsLink = event.map_address || (mapAddr ? `https://maps.google.com/maps?q=${encodeURIComponent(mapAddr)}` : null)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 64px' }}>
      <Link href="/schedule" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>← スケジュール一覧</Link>

      {/* Header: date / location / title / subtitle / description */}
      <div style={{ marginTop: 28, marginBottom: 32, textAlign: 'center' }}>
        {/* Date with Playfair Display italic + gradient effect */}
        <div style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 68,
          fontWeight: 700,
          letterSpacing: 4,
          lineHeight: 1,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #111 0%, #555 60%, #111 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {formatDateShort(event.event_date)}
        </div>

        {event.location_name && (
          <div style={{ fontSize: 15, color: '#888', marginBottom: 6, letterSpacing: 1 }}>
            📍 {event.location_name}
          </div>
        )}

        {/* Title: small, gray (swapped) */}
        {event.title && (
          <div style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: 15,
            fontWeight: 500,
            color: '#aaa',
            letterSpacing: 2,
            marginBottom: 4,
          }}>
            {event.title}
          </div>
        )}

        {/* Subtitle: large, black (swapped) */}
        {event.subtitle && (
          <div style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 30,
            fontWeight: 600,
            color: '#1a1a1a',
            letterSpacing: 1,
            lineHeight: 1.3,
            marginBottom: 0,
          }}>
            {event.subtitle}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '24px auto', maxWidth: 360 }} />

        {event.description && (
          <p style={{ fontSize: 14, color: '#666', lineHeight: 2, margin: '0 auto', whiteSpace: 'pre-line', maxWidth: 560 }}>
            {event.description}
          </p>
        )}
      </div>

      {/* Main image */}
      {event.main_image && (
        <div style={{ marginBottom: 32, borderRadius: 16, overflow: 'hidden' }}>
          <img src={event.main_image} alt={event.title || ''} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}

      {/* Map */}
      {embedUrl && (
        <div style={{ marginBottom: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5' }}>
          <iframe
            src={embedUrl}
            width="100%" height="280" style={{ border: 0, display: 'block' }}
            allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Address / Access / Studio URL */}
      {(event.location_name || event.access_note || event.studio_url || mapsLink) && (
        <div style={{ marginTop: 16, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {event.location_name && (
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>開催場所</div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 15 }}>{event.location_name}</div>
              {event.address && <div style={{ fontSize: 13, color: '#777', marginTop: 2 }}>{event.address}</div>}
            </div>
          )}
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#555', fontSize: 13, textDecoration: 'underline', width: 'fit-content' }}>
              🗺️ Google Mapsで開く
            </a>
          )}
          {event.access_note && (
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
              <span style={{ color: '#888', fontWeight: 600 }}>アクセス：</span>{event.access_note}
            </div>
          )}
          {event.studio_url && (
            <a href={event.studio_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#444', fontSize: 13, textDecoration: 'underline', fontWeight: 600, width: 'fit-content' }}>
              🏢 スタジオ詳細を見る →
            </a>
          )}
        </div>
      )}

      {/* Street notice (meeting place note) */}
      {event.event_type === 'street' && (
        <div style={{ background: '#fffbf0', border: '1px solid #ffe082', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#7a5f00', lineHeight: 1.8 }}>
          ⚠️ 集合場所の詳細は<strong>確定メール</strong>に記載されています。
          {event.street_notes && <><br />{event.street_notes}</>}
        </div>
      )}
      {event.event_type !== 'street' && event.street_notes && (
        <div style={{ background: '#f8f8f8', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {event.street_notes}
        </div>
      )}

      {/* Entry Models */}
      {entries.filter(e => e.models).length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#333', marginBottom: 20, marginTop: 0 }}>エントリーモデル</h2>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...new Map(entries.filter(e => e.models).map(e => [e.model_id, e])).values()].map(e => (
              <Link key={e.model_id} href={`/models/${e.model_id}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
                <div style={{ width: 90, height: 110, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid #e5e5e5' }}>
                  {e.models.image
                    ? <img src={e.models.image} alt={e.models.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
                  }
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>{e.models.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 32, fontSize: 13, color: '#666', lineHeight: 2.2, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div><Link href="/terms" style={{ color: '#333', fontWeight: 600 }}>※ご予約前に必ずご利用規約</Link>をご確認ください。</div>
        <div>※確定メールにて予約完了です。</div>
        <div>※同じモデルの撮影は１日２枠まででお願いいたします。</div>
        <div>※続けての撮影の場合モデルと別行動による15分休憩でお願い致します。</div>
      </div>

      {/* Gallery - horizontal scroll, no title */}
      {event.gallery_images && event.gallery_images.length > 0 && (
        <div style={{ marginBottom: 40, overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4 }}>
          {event.gallery_images.map((url, i) => (
            <img key={i} src={url} alt="" style={{ height: 260, width: 'auto', objectFit: 'cover', borderRadius: 10, flexShrink: 0, display: 'block' }} />
          ))}
        </div>
      )}

      {/* Products */}
      {products && products.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#333', marginBottom: 16 }}>予約商品</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {products.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
                {p.image && (
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#333', marginBottom: 4 }}>{p.name}</div>
                  {p.available_slots?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 600, marginBottom: 6 }}>
                      🕐 {p.available_slots.join(' / ')}
                    </div>
                  )}
                  {p.description && (
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 8 }}>{p.description}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>¥{(p.price || 0).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: '#999' }}>在庫 {p.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 16 }}>Booking</h2>
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
    </div>
  )
}
