import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

export const metadata = { title: 'モデル一覧 | PhotoFleur' }

export default async function ModelsPage() {
  const supabase = await createSupabaseAdminClient()
  const { data: models } = await supabase
    .from('models')
    .select('id, name, name_en, image')
    .eq('status', 'active')
    .order('name', { ascending: true })

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '36px 20px 0' }}>
        <p style={{ ...serif, fontSize: 11, letterSpacing: '0.3em', color: '#999', textTransform: 'uppercase', marginBottom: 8, fontStyle: 'italic' }}>Our</p>
        <h1 style={{ ...serif, fontSize: 'clamp(52px, 10vw, 96px)', fontWeight: 400, color: '#0d1f3a', letterSpacing: '0.18em', margin: 0, lineHeight: 1 }}>
          MODELS
        </h1>
        <div style={{ width: '100%', maxWidth: 600, height: 1, background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.15), transparent)', margin: '20px auto 0' }} />
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px' }}>
        {!models || models.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>現在出演モデルの情報はありません。</p>
        ) : (
          <div className="model-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {models.map(model => (
              <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }} className="model-card">
                <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '3/4', background: '#f0f0f0', overflow: 'hidden', position: 'relative' }}>
                    {model.image
                      ? <img src={model.image} alt={model.name} className="model-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.45s ease', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#ccc' }}>👤</div>
                    }
                    <div className="model-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,20,50,0.75) 0%, transparent 55%)', opacity: 0, transition: 'opacity 0.35s ease' }} />
                    <div className="model-name-overlay" style={{ position: 'absolute', bottom: 10, left: 12, right: 12, opacity: 0, transition: 'opacity 0.35s ease' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{model.name}</div>
                      {model.name_en && <div style={{ ...serif, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{model.name_en}</div>}
                    </div>
                  </div>
                  <div className="model-info" style={{ padding: '8px 2px 4px', transition: 'opacity 0.35s ease' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>{model.name}</div>
                    {model.name_en && <div style={{ ...serif, fontSize: 11, color: '#999', fontStyle: 'italic' }}>{model.name_en}</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .model-card:hover .model-img { transform: scale(1.06); }
        .model-card:hover .model-overlay { opacity: 1 !important; }
        .model-card:hover .model-name-overlay { opacity: 1 !important; }
        .model-card:hover .model-info { opacity: 0 !important; }
        @media (max-width: 640px) { .model-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; } }
      `}</style>
    </div>
  )
}
