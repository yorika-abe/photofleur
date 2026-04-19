import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const metadata = { title: 'モデル一覧 | PhotoFleur' }

export default async function ModelsPage() {
  const { data: models } = await supabase
    .from('models')
    .select('id, name, name_en, image, bio, street_price, studio_price, is_staff')
    .order('name', { ascending: true })

  const regularModels = models?.filter(m => !m.is_staff) || []
  const staffModels = models?.filter(m => m.is_staff) || []

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Models</p>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#2f2244', margin: 0 }}>出演モデル一覧</h1>
      </div>

      {regularModels.length === 0 ? (
        <p style={{ color: '#999' }}>現在出演モデルの情報はありません。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
          {regularModels.map(model => (
            <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', border: '1px solid #ece8f5', transition: 'box-shadow 0.2s' }}>
                <div style={{ aspectRatio: '3/4', background: '#e0d8f0', overflow: 'hidden' }}>
                  {model.image
                    ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>👤</div>
                  }
                </div>
                <div style={{ padding: '12px 14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2f2244', marginBottom: 2 }}>{model.name}</div>
                  {model.name_en && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>{model.name_en}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {model.street_price && (
                      <span style={{ fontSize: 11, background: '#e8f5e9', color: '#388e3c', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                        街 ¥{model.street_price.toLocaleString()}〜
                      </span>
                    )}
                    {model.studio_price && (
                      <span style={{ fontSize: 11, background: '#e8eaf6', color: '#3949ab', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                        Studio ¥{model.studio_price.toLocaleString()}〜
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {staffModels.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2f2244', marginBottom: 20 }}>スタッフ</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {staffModels.map(model => (
              <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', border: '1px solid #e5e5e5' }}>
                  <div style={{ aspectRatio: '1/1', background: '#e0d8f0', overflow: 'hidden' }}>
                    {model.image
                      ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👤</div>
                    }
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#2f2244' }}>{model.name}</div>
                    {model.name_en && <div style={{ fontSize: 11, color: '#aaa' }}>{model.name_en}</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
