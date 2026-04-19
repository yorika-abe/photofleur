import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export default async function Home() {
  const today = new Date().toISOString().split('T')[0]

  const [{ data: events }, { data: models }] = await Promise.all([
    supabase
      .from('events')
      .select('id, event_date, event_type, title, location_name, main_image, event_entries(id, models(id, name, image))')
      .eq('status', 'active')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(4),
    supabase
      .from('models')
      .select('id, name, name_en, image, is_staff')
      .eq('is_staff', false)
      .limit(8),
  ])

  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #2f2244 0%, #4a3570 100%)', color: '#fff', padding: 'clamp(60px, 10vw, 100px) 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(255,200,100,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.2em', opacity: 0.6, marginBottom: 16, textTransform: 'uppercase' }}>Photography × Model</p>
          <h1 style={{ fontSize: 'clamp(30px, 6vw, 52px)', fontWeight: 700, marginBottom: 20, lineHeight: 1.3, letterSpacing: '0.01em' }}>
            Photo Fleur
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.5vw, 18px)', lineHeight: 1.9, opacity: 0.85, marginBottom: 40 }}>
            個性豊かなモデルと一緒に、<br />
            特別な一枚を撮影しませんか。<br />
            ストリート・スタジオ撮影、随時開催中。
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/schedule" style={{ background: '#fff', color: '#2f2244', textDecoration: 'none', borderRadius: 50, padding: '14px 32px', fontWeight: 700, fontSize: 15, display: 'inline-block' }}>
              スケジュールを見る
            </Link>
            <Link href="/models" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', textDecoration: 'none', borderRadius: 50, padding: '14px 28px', fontWeight: 600, fontSize: 15, border: '1.5px solid rgba(255,255,255,0.3)', display: 'inline-block' }}>
              モデル一覧
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming events */}
      {events && events.length > 0 && (
        <section style={{ padding: 'clamp(48px, 8vw, 72px) 20px', background: '#fafafa' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Schedule</p>
                <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, color: '#2f2244', margin: 0 }}>直近の撮影会</h2>
              </div>
              <Link href="/schedule" style={{ color: '#2f2244', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>すべて見る →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {events.map(ev => {
                const modelList = ev.event_entries?.map(e => e.models).filter(Boolean) || []
                const isStreet = ev.event_type === 'street'
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #ece8f5', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {ev.main_image ? (
                        <div style={{ height: 160, overflow: 'hidden', background: '#e0d8f0' }}>
                          <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ height: 120, background: isStreet ? 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' : 'linear-gradient(135deg, #e8eaf6, #c5cae9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                          {isStreet ? '🌆' : '🏢'}
                        </div>
                      )}
                      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ display: 'inline-block', background: isStreet ? '#e8f5e9' : '#e8eaf6', color: isStreet ? '#388e3c' : '#3949ab', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                          {isStreet ? 'ストリート' : ev.event_type === 'studio' ? 'スタジオ' : '不定期'}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#2f2244' }}>{formatDate(ev.event_date)}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{ev.title || ev.location_name}</div>
                        {modelList.length > 0 && (
                          <div style={{ display: 'flex', gap: -6, marginTop: 4 }}>
                            {modelList.slice(0, 4).map((m, i) => (
                              <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', overflow: 'hidden', background: '#e0d8f0', marginLeft: i > 0 ? -8 : 0, zIndex: modelList.length - i }}>
                                {m.image && <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              </div>
                            ))}
                            {modelList.length > 4 && (
                              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: '#e0d8f0', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#666', fontWeight: 600 }}>
                                +{modelList.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Models preview */}
      {models && models.length > 0 && (
        <section style={{ padding: 'clamp(48px, 8vw, 72px) 20px', background: '#fff' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Models</p>
                <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, color: '#2f2244', margin: 0 }}>出演モデル</h2>
              </div>
              <Link href="/models" style={{ color: '#2f2244', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>すべて見る →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {models.map(model => (
                <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
                    <div style={{ aspectRatio: '3/4', background: '#e0d8f0', overflow: 'hidden' }}>
                      {model.image
                        ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👤</div>
                      }
                    </div>
                    <div style={{ padding: '10px 10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#2f2244', fontSize: 13 }}>{model.name}</div>
                      {model.name_en && <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{model.name_en}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section style={{ padding: 'clamp(48px, 8vw, 72px) 20px', background: '#f8f5ff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, color: '#2f2244', margin: 0 }}>ご参加の流れ</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'スケジュールを確認', desc: '開催日程・出演モデルをチェック。ストリートとスタジオから選べます。' },
              { step: '02', title: '時間枠を選んで予約', desc: '好きな時間枠を選択し、お名前・メールアドレスを入力するだけ。' },
              { step: '03', title: '確認メールを受け取る', desc: '予約確認メールが届いたら完了。当日はQRコードをご提示ください。' },
              { step: '04', title: '当日を楽しむ', desc: 'カメラを持って現地へ。スタッフがご案内します。素敵な写真を撮りましょう。' },
            ].map(item => (
              <div key={item.step} style={{ background: '#fff', borderRadius: 14, padding: '24px 20px' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#e0d5f5', marginBottom: 10 }}>{item.step}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2f2244', marginBottom: 8, marginTop: 0 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Model recruit CTA */}
      <section style={{ background: '#2f2244', color: '#fff', padding: 'clamp(48px, 8vw, 72px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>Join us</p>
          <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, marginBottom: 14 }}>モデルとして参加しませんか？</h2>
          <p style={{ opacity: 0.75, lineHeight: 1.9, marginBottom: 32, fontSize: 14 }}>
            PhotoFleurではモデルを随時募集しています。<br />
            経験不問、まずはお気軽にご応募ください。
          </p>
          <Link href="/model-recruit" style={{ background: '#fff', color: '#2f2244', textDecoration: 'none', borderRadius: 50, padding: '14px 32px', fontWeight: 700, fontSize: 15, display: 'inline-block' }}>
            モデル募集ページへ
          </Link>
        </div>
      </section>
    </div>
  )
}
