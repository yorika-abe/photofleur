import Link from 'next/link'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import BookingSection from './BookingSection'
import GalleryMarquee from './GalleryMarquee'
import ProductCards from './ProductCards'
import { buildMetadata } from '@/lib/ogp'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { data: ev } = await supabase.from('events').select('title, main_image, thumbnail_image').eq('id', id).single()
  return buildMetadata({
    title: ev?.title ? `${ev.title} | PhotoFleur` : 'イベント詳細 | PhotoFleur',
    path: `/events/${id}`,
    imageUrl: ev?.main_image || ev?.thumbnail_image || null,
  })
}

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

export default async function EventDetailPage({ params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()

  // Check current user role for model-only sections
  let isModelOrAdmin = false
  try {
    const serverClient = await createSupabaseServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('role, roles').eq('id', user.id).single()
      const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
      isModelOrAdmin = roles.includes('model') || roles.includes('admin')
    }
  } catch {}

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
    .select('id, name, image, description, price, stock, available_slots, options')
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
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: 4,
          lineHeight: 1,
          marginBottom: 16,
          color: '#111',
        }}>
          {formatDateShort(event.event_date)}
        </div>

        {event.location_name && (
          <div style={{ fontSize: 15, color: '#222', marginBottom: 6, letterSpacing: 1 }}>
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
      {(event.main_image || event.thumbnail_image) && (
        <div style={{ marginBottom: 32, borderRadius: 16, overflow: 'hidden' }}>
          <img src={event.main_image || event.thumbnail_image} alt={event.title || ''} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}

      {/* Map + Address + Thumbnail */}
      {(embedUrl || event.location_name || event.access_note || event.studio_url || mapsLink || event.thumbnail_image) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'stretch' }}>
          {embedUrl && (
            <div style={{ flexShrink: 0, width: 260, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', minHeight: 220 }}>
              <iframe
                src={embedUrl}
                style={{ border: 0, display: 'block', width: '100%', height: '100%', minHeight: 220 }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
            {(event.address || event.location_name) && (
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 3 }}>開催場所</div>
                {event.address && <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>{event.address}</div>}
              </div>
            )}
            {event.access_note && (
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 3 }}>アクセス</div>
                <div style={{ fontSize: 15, color: '#333', lineHeight: 1.7 }}>{event.access_note}</div>
              </div>
            )}
            {mapsLink && (
              <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#222', fontSize: 14, textDecoration: 'underline', width: 'fit-content' }}>
                🗺️ Google Mapsで開く
              </a>
            )}
            {event.studio_url && (
              <a href={event.studio_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#222', fontSize: 14, textDecoration: 'underline', fontWeight: 600, width: 'fit-content' }}>
                🏢 スタジオ詳細を見る →
              </a>
            )}
          </div>
          {event.thumbnail_image && (
            <div style={{ flexShrink: 0, width: 130, borderRadius: 12, overflow: 'hidden' }}>
              <img src={event.thumbnail_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
        </div>
      )}

      {/* Street notice (meeting place note) */}
      {event.event_type === 'street' && (
        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#1565c0', lineHeight: 1.8 }}>
          ⚠️ 集合場所の詳細は<strong>確定メール</strong>に記載されています。
          {event.street_notes && <><br />{event.street_notes}</>}
        </div>
      )}
      {event.event_type !== 'street' && event.street_notes && (
        <div style={{ background: '#f8f8f8', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {event.street_notes}
        </div>
      )}

      {/* 企画書（一般公開） */}
      {event.planning_note && (
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: event.planning_note }}
          style={{ fontSize: 15, color: '#444', lineHeight: 2, marginBottom: 32 }} />
      )}

      {/* 企画書（モデル向け） */}
      {isModelOrAdmin && event.planning_note_model && (
        <div style={{ background: '#f8fbff', border: '1px solid #d6ecf5', borderRadius: 12, padding: '16px 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3560', marginBottom: 10, letterSpacing: 1 }}>モデルにのみ表示</div>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: event.planning_note_model }}
            style={{ fontSize: 15, color: '#444', lineHeight: 2 }} />
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
        <div>※ご予約前に必ず<Link href="/terms" style={{ color: '#333', fontWeight: 700, textDecoration: 'underline' }}>ご利用規約</Link>をご確認ください。</div>
        {event.studio_capacity && event.event_type === 'studio' && (
          <>
            <div>※各部のスタジオ撮影定員（<span style={{ color: '#e00', fontWeight: 700 }}>{event.studio_capacity}名</span>）は、『枠の先着順』となります。</div>
            <div>※定員人数を超えている場合は、野外撮影を「<span style={{ color: '#e00', fontWeight: 700 }}>{(event.studio_fee || 0).toLocaleString()}</span>円引き」で受付させていただきます。</div>
          </>
        )}
        {event.studio_capacity && event.event_type === 'irregular' && (
          <>
            <div>※各部の特別撮影定員（<span style={{ color: '#e00', fontWeight: 700 }}>{event.studio_capacity}名</span>）は、『枠の先着順』となります。</div>
            <div>※定員人数を超えている場合は、定員外撮影を「<span style={{ color: '#e00', fontWeight: 700 }}>{(event.studio_fee || 0).toLocaleString()}</span>円引き」で受付させていただきます。</div>
          </>
        )}
        <div>※確定メールにて予約完了です。</div>
        <div>※同じモデルの撮影は１日２枠まででお願いいたします。</div>
        <div>※続けての撮影の場合モデルと別行動による15分休憩でお願い致します。</div>
      </div>

      {/* Slot availability table */}
      {entries.length > 0 && (allSlots || []).length > 0 && (() => {
        const uniqueLabels = []
        const seenLabels = new Set()
        for (const s of allSlots || []) {
          if (!seenLabels.has(s.slot_label)) { seenLabels.add(s.slot_label); uniqueLabels.push(s.slot_label) }
        }
        const hasCapacity = (event.event_type === 'studio' || event.event_type === 'irregular') && event.studio_capacity
        const capacity = hasCapacity ? event.studio_capacity : null
        const totalRows = entries.length
        // count all bookings (indoor + outdoor) per label
        const totalCountByLabel = {}
        for (const b of bookingCounts || []) {
          const slot = slotMap[b.slot_id]
          if (slot) totalCountByLabel[slot.slot_label] = (totalCountByLabel[slot.slot_label] || 0) + 1
        }
        return (
          <div style={{ marginBottom: 32, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#333', margin: 0 }}>予約状況</h2>
              <span style={{ fontSize: 11, color: '#aaa', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                ※時間あたりの埋まり状況
                <span>🈵 予約済み</span>
                <span>🈳 空き</span>
                {capacity !== null && <span>（🈳）定員超えの予約可能枠</span>}
              </span>
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {uniqueLabels.map(label => (
                    <th key={label} style={{ padding: '8px 14px', background: '#f5f5f5', border: '1px solid #e0e0e0', whiteSpace: 'nowrap', fontWeight: 700, color: '#444', textAlign: 'center', minWidth: 72 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {uniqueLabels.map(label => {
                    const count = totalCountByLabel[label] || 0
                    return (
                      <td key={label} style={{ padding: '10px 14px', border: '1px solid #e0e0e0', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          {Array.from({ length: totalRows }, (_, i) => {
                            if (i < count) return <span key={i} style={{ fontSize: 18, lineHeight: 1 }}>🈵</span>
                            if (capacity !== null && i >= capacity) return <span key={i} style={{ fontSize: 14, lineHeight: 1, color: '#888' }}>（🈳）</span>
                            return <span key={i} style={{ fontSize: 18, lineHeight: 1 }}>🈳</span>
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Gallery - horizontal scroll, no title */}
      <GalleryMarquee images={event.gallery_images} />

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
        eventDate={event.event_date}
        eventLocation={event.location_name || ''}
      />

      {/* Products */}
      <ProductCards
        products={products || []}
        eventId={id}
        slotLabels={[...new Set((allSlots || []).map(s => s.slot_label))]}
        eventModels={[...new Map(entries.filter(e => e.models).map(e => [e.model_id, e.models])).values()]}
        eventDate={event.event_date}
        eventLocation={event.location_name || ''}
      />

      <style>{`
        .blog-content img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .blog-content video { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .blog-content a { color: #1a3560; }
        .blog-content p { margin: 0 0 12px; }
      `}</style>
    </div>
  )
}
