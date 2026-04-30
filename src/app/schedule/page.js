import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const metadata = { title: 'スケジュール一覧 | PhotoFleur' }

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

const TYPE_LABEL = { street: 'STREET', studio: 'STUDIO', special: 'SPECIAL' }
const TYPE_COLOR = { street: '#0097a7', studio: '#c2185b', special: '#1a3560' }

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
  const { data: entries } = eventIds.length > 0
    ? await supabase.from('event_entries').select('id, event_id, model_id, models(id, name, name_en, image)').in('event_id', eventIds)
    : { data: [] }
  const entriesByEvent = {}
  for (const entry of (entries || [])) {
    if (!entriesByEvent[entry.event_id]) entriesByEvent[entry.event_id] = []
    entriesByEvent[entry.event_id].push(entry)
  }
  const eventsWithEntries = (events || []).map(ev => ({ ...ev, event_entries: entriesByEvent[ev.id] || [] }))

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.35em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Schedule</p>
          <h1 style={{ ...serif, fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, color: '#1a3560', margin: '0 0 20px' }}>開催予定のイベント</h1>
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
              const tagColor = TYPE_COLOR[type] || TYPE_COLOR.special
              const tagLabel = TYPE_LABEL[type] || 'EVENT'
              const modelList = (ev.event_entries || []).map(e => e.models).filter(Boolean)
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
                    {/* Type tag */}
                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                      <span style={{
                        fontSize: 9, letterSpacing: '0.12em', color: '#fff', textTransform: 'uppercase',
                        background: tagColor, padding: '3px 8px', borderRadius: 2, fontWeight: 700,
                      }}>
                        {tagLabel}
                      </span>
                    </div>
                    {/* Date badge */}
                    <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                      <span style={{
                        fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.55)',
                        padding: '3px 8px', borderRadius: 3, fontWeight: 600, letterSpacing: '0.05em',
                      }}>
                        {date}（{dow}）
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '0 2px' }}>
                    <div style={{ ...serif, fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: '#1a3560', lineHeight: 1, marginBottom: 4, letterSpacing: '0.04em' }}>
                      {date}
                    </div>
                    {ev.location_name && (
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 11 }}>📍</span>{ev.location_name}
                      </div>
                    )}
                    {ev.title && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3560', marginBottom: 6, lineHeight: 1.4 }}>{ev.title}</div>
                    )}

                    {/* Model icons */}
                    {modelList.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        {modelList.slice(0, 5).map((m, idx) => (
                          <div key={idx} style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #fff', overflow: 'hidden', background: '#e0d8f0', marginLeft: idx > 0 ? -6 : 0, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                            {m.image && <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                        ))}
                        {modelList.length > 5 && <span style={{ fontSize: 10, color: '#aaa', marginLeft: 2 }}>+{modelList.length - 5}</span>}
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 600 }}>詳細・予約 →</div>
                  </div>
                </Link>
              )
            })}
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
