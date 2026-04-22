import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function formatDateFull(dateStr) {
  const d = new Date(dateStr)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export const metadata = { title: 'スケジュール一覧 | PhotoFleur' }

export default async function SchedulePage() {
  const today = new Date().toISOString().split('T')[0]
  const supabase = await createSupabaseAdminClient()

  const { data: events, error } = await supabase
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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>スケジュール一覧</h1>
      <p style={{ color: '#666', marginBottom: 32, fontSize: 15 }}>開催予定の撮影会イベントをご確認いただけます。</p>

      {error && <p style={{ color: 'red', fontSize: 14 }}>データの取得に失敗しました。</p>}

      {!eventsWithEntries || eventsWithEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <p>現在、予定されているイベントはありません。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {eventsWithEntries.map(ev => (
            <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e5e5e5', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 160 }}>
                  <div style={{ display: 'inline-block', background: ev.event_type === 'street' ? '#e8f5e9' : '#e8eaf6', color: ev.event_type === 'street' ? '#388e3c' : '#3949ab', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                    {ev.event_type === 'street' ? 'ストリート' : ev.event_type === 'studio' ? 'スタジオ' : 'イベント'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3560', marginBottom: 4 }}>{formatDateFull(ev.event_date)}</div>
                  <div style={{ fontSize: 14, color: '#666' }}>{ev.location_name}</div>
                </div>

                {ev.event_entries && ev.event_entries.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#999', marginBottom: 10 }}>出演モデル</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {ev.event_entries.map(entry => entry.models && (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0d8f0', overflow: 'hidden', flexShrink: 0 }}>
                            {entry.models.image && <img src={entry.models.image} alt={entry.models.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                          <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>{entry.models.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', color: '#1a3560', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  詳細・予約 →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
