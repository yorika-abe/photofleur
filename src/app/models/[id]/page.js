import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PortfolioSlider from '@/components/PortfolioSlider'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: model } = await supabase.from('models').select('name, name_en').eq('id', id).single()
  if (!model) return {}
  return { title: `${model.name} | PhotoFleur` }
}

export default async function ModelDetailPage({ params }) {
  const { id } = await params
  const today = new Date().toISOString().split('T')[0]

  const { data: model } = await supabase
    .from('models')
    .select('*')
    .eq('id', id)
    .single()

  if (!model) notFound()

  const { data: upcomingEntries } = await supabase
    .from('event_entries')
    .select('id, event_id, events(id, event_date, event_type, title, location_name, status)')
    .eq('model_id', id)

  const upcomingEvents = (upcomingEntries || [])
    .map(e => e.events)
    .filter(ev => ev && ev.status === 'active' && ev.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3)

  const portfolioImages = model.portfolio_images || []

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) 16px' }}>
      <Link href="/models" style={{ color: '#2f2244', textDecoration: 'none', fontSize: 14 }}>← モデル一覧</Link>

      {/* Main profile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: 32, marginTop: 24, alignItems: 'start' }}
        className="model-grid">
        <style>{`
          @media (max-width: 640px) {
            .model-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Photo */}
        <div>
          <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '3/4', background: '#e0d8f0' }}>
            {model.image
              ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>👤</div>
            }
          </div>
        </div>

        {/* Info */}
        <div>
          <p style={{ fontSize: 12, color: '#aaa', letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>Model</p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, color: '#2f2244', margin: '0 0 4px' }}>{model.name}</h1>
          {model.name_en && <p style={{ fontSize: 15, color: '#aaa', margin: '0 0 20px' }}>{model.name_en}</p>}

          {model.bio && (
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.9, marginBottom: 24 }}>{model.bio}</p>
          )}

          {/* Specs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {model.height && (
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                <span style={{ color: '#aaa', minWidth: 80 }}>身長</span>
                <span style={{ color: '#333', fontWeight: 600 }}>{model.height}cm</span>
              </div>
            )}
            {model.birthday && (
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                <span style={{ color: '#aaa', minWidth: 80 }}>誕生日</span>
                <span style={{ color: '#333', fontWeight: 600 }}>{model.birthday}</span>
              </div>
            )}
            {model.shoe_size && (
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                <span style={{ color: '#aaa', minWidth: 80 }}>靴サイズ</span>
                <span style={{ color: '#333', fontWeight: 600 }}>{model.shoe_size}</span>
              </div>
            )}
          </div>

          {/* Favorite things */}
          {model.favorite_things && (
            <div style={{ background: '#f8f5ff', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>好きなもの</div>
              <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.7 }}>{model.favorite_things}</p>
            </div>
          )}

          {/* Pricing */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            {model.street_price && (
              <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: '#388e3c', marginBottom: 4, fontWeight: 600 }}>ストリート</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>¥{model.street_price.toLocaleString()}</div>
                {model.duration_street && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{model.duration_street}</div>}
              </div>
            )}
            {model.studio_price && (
              <div style={{ background: '#e8eaf6', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: '#3949ab', marginBottom: 4, fontWeight: 600 }}>スタジオ</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#283593' }}>¥{model.studio_price.toLocaleString()}</div>
                {model.duration_studio && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{model.duration_studio}</div>}
              </div>
            )}
          </div>

          {/* SNS links */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {(model.twitter_url || model.sns) && (
              <a href={model.twitter_url || model.sns} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
                𝕏 Twitter / X
              </a>
            )}
          </div>

          <Link href="/schedule"
            style={{ display: 'block', textAlign: 'center', background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700 }}>
            スケジュールで予約する
          </Link>
        </div>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2f2244', marginBottom: 16 }}>出演予定イベント</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingEvents.map(ev => (
              <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #ece8f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, background: ev.event_type === 'street' ? '#e8f5e9' : '#e8eaf6', color: ev.event_type === 'street' ? '#388e3c' : '#3949ab', borderRadius: 4, padding: '2px 7px', fontWeight: 600, marginRight: 8 }}>
                      {ev.event_type === 'street' ? 'ストリート' : ev.event_type === 'studio' ? 'スタジオ' : '不定期'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#2f2244' }}>{formatDate(ev.event_date)}</span>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{ev.title || ev.location_name}</div>
                  </div>
                  <span style={{ color: '#2f2244', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>予約 →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <PortfolioSlider images={portfolioImages} />
    </div>
  )
}
