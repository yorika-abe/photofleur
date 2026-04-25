import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const metadata = { title: 'スケジュール一覧 | PhotoFleur' }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
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
    <div style={{ background: '#f7f5f2', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.35em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Schedule</p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1a3560', margin: 0 }}>開催予定のイベント</h1>
        </div>

        {!eventsWithEntries || eventsWithEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#999' }}>
            <p>現在、予定されているイベントはありません。</p>
          </div>
        ) : (
          <div className="schedule-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {eventsWithEntries.map(ev => {
              const date = formatDate(ev.event_date)
              const isStreet = ev.event_type === 'street'
              const isStudio = ev.event_type === 'studio'
              const tagBg = isStreet ? 'rgba(0,151,167,0.85)' : isStudio ? 'rgba(194,24,91,0.85)' : 'rgba(26,53,96,0.85)'
              const cardBg = isStreet ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : isStudio ? 'linear-gradient(160deg,#f4d6e8,#e8b8d0)' : 'linear-gradient(160deg,#c5cae9,#9fa8da)'
              const modelList = (ev.event_entries || []).map(e => e.models).filter(Boolean)

              return (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="sched-card" style={{ background: '#fff', borderRadius: 4, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'box-shadow 0.3s ease, transform 0.3s ease' }}>

                    {/* 画像エリア */}
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: cardBg, overflow: 'hidden' }}>
                      {ev.main_image && (
                        <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} className="sched-img" />
                      )}
                      <div style={{ position: 'absolute', top: 12, left: 12 }}>
                        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: '#fff', textTransform: 'uppercase', background: tagBg, padding: '4px 10px', borderRadius: 2, fontWeight: 600 }}>
                          {isStreet ? 'Street' : isStudio ? 'Studio' : 'Special'}
                        </span>
                      </div>
                    </div>

                    {/* テキストエリア */}
                    <div style={{ padding: '18px 20px 20px' }}>
                      <div style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: '#1a3560', letterSpacing: '0.05em', marginBottom: 6 }}>
                        {date}
                      </div>
                      {ev.title && (
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>{ev.title}</div>
                      )}
                      {ev.location_name && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{ev.location_name}</div>
                      )}

                      {modelList.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex' }}>
                            {modelList.slice(0, 5).map((m, idx) => (
                              <div key={idx} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', overflow: 'hidden', background: '#e0d8f0', marginLeft: idx > 0 ? -8 : 0, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                                {m.image && <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              </div>
                            ))}
                          </div>
                          {modelList.length > 5 && (
                            <span style={{ fontSize: 11, color: '#aaa' }}>+{modelList.length - 5}</span>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: 14, fontSize: 12, color: '#5bbfd6', fontWeight: 600, letterSpacing: '0.05em' }}>
                        詳細・予約 →
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .sched-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important; transform: translateY(-2px); }
        .sched-card:hover .sched-img { transform: scale(1.04); }
        @media (max-width: 600px) {
          .schedule-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
