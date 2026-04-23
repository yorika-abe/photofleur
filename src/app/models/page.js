import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const metadata = { title: 'モデル一覧 | PhotoFleur' }

export default async function ModelsPage() {
  const supabase = await createSupabaseAdminClient()
  const { data: models } = await supabase
    .from('models')
    .select('id, name, name_en, image')
    .eq('status', 'active')
    .order('name', { ascending: true })

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Models</p>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#2f2244', margin: 0 }}>出演モデル一覧</h1>
      </div>

      {!models || models.length === 0 ? (
        <p style={{ color: '#999' }}>現在出演モデルの情報はありません。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
          {models.map(model => (
            <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', border: '1px solid #ece8f5' }}>
                <div style={{ aspectRatio: '3/4', background: '#e0d8f0', overflow: 'hidden' }}>
                  {model.image
                    ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>👤</div>
                  }
                </div>
                <div style={{ padding: '12px 14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2f2244', marginBottom: 2 }}>{model.name}</div>
                  {model.name_en && <div style={{ fontSize: 11, color: '#aaa' }}>{model.name_en}</div>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
