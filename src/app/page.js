import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return {
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    year: d.getFullYear(),
    dow: days[d.getDay()],
    ja: `${d.getMonth() + 1}月${d.getDate()}日`,
  }
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
      .limit(6),
    supabase
      .from('models')
      .select('id, name, name_en, image, is_staff')
      .eq('is_staff', false)
      .limit(8),
  ])

  return (
    <div style={{ background: '#0a0a0a', color: '#fff' }}>

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        {/* Background — swap src below with your own image URL */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a0f2e 0%, #2f2244 40%, #0d0a18 100%)',
        }} />
        {/* Gradient overlay for text readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />

        {/* Corner label */}
        <div style={{ position: 'absolute', top: 28, right: 28, textAlign: 'right' }}>
          <div style={{ ...serif, fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 4 }}>Photography × Model</div>
          <div style={{ ...serif, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Since 2024</div>
        </div>

        {/* Main hero text */}
        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(32px, 5vw, 64px)', width: '100%' }}>
          <p style={{ ...serif, fontSize: 'clamp(11px, 1.5vw, 13px)', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Let your own unique flower bloom
          </p>
          <h1 style={{ ...serif, fontSize: 'clamp(64px, 14vw, 140px)', fontWeight: 300, lineHeight: 0.9, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            <span style={{ display: 'block', fontWeight: 300 }}>Photo</span>
            <span style={{ display: 'block', fontWeight: 700, fontStyle: 'italic', color: '#e8d5f0' }}>FLEUR</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/schedule" style={{
              ...serif, fontSize: 'clamp(13px, 1.8vw, 16px)', letterSpacing: '0.2em',
              color: '#fff', textDecoration: 'none', textTransform: 'uppercase',
              borderBottom: '1px solid rgba(255,255,255,0.6)', paddingBottom: 4,
            }}>
              View Schedule
            </Link>
            <Link href="/models" style={{
              ...serif, fontSize: 'clamp(13px, 1.8vw, 16px)', letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.6)', textDecoration: 'none', textTransform: 'uppercase',
            }}>
              Our Models
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ ...serif, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', writingMode: 'vertical-rl' }}>Scroll</div>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }} />
        </div>
      </section>

      {/* ─── CONCEPT STRIP ─── */}
      <section style={{ background: '#fff', color: '#0a0a0a', padding: '80px 0', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px, 8vw, 100px)', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#999', textTransform: 'uppercase', marginBottom: 20 }}>About</p>
              <h2 style={{ ...serif, fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 300, lineHeight: 1.1, margin: '0 0 24px', color: '#0a0a0a' }}>
                撮影会という<br />
                <em>体験を、</em><br />
                もっと自由に。
              </h2>
              <p style={{ fontSize: 14, lineHeight: 2, color: '#555', margin: '0 0 32px' }}>
                PhotoFleurは、プロカメラマンと個性豊かなモデルが出会う撮影会予約プラットフォームです。
                ストリートからスタジオまで、あなただけの特別な一枚を。
              </p>
              <Link href="/schedule" style={{
                ...serif, display: 'inline-block', fontSize: 13, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#0a0a0a', textDecoration: 'none',
                borderBottom: '1px solid #0a0a0a', paddingBottom: 3,
              }}>
                撮影会を探す →
              </Link>
            </div>
            <div style={{ aspectRatio: '3/4', background: '#e8e0f0', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#b0a0c0' }}>
                <div style={{ ...serif, fontSize: 13, letterSpacing: '0.15em' }}>IMAGE</div>
              </div>
            </div>
          </div>
        </div>
        <style>{`@media(max-width:640px){.concept-grid{grid-template-columns:1fr !important}}`}</style>
      </section>

      {/* ─── SCHEDULE ─── */}
      {events && events.length > 0 && (
        <section style={{ background: '#0a0a0a', padding: '80px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>Schedule</p>
                <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#fff' }}>
                  直近の撮影会
                </h2>
              </div>
              <Link href="/schedule" style={{ ...serif, color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 2 }}>
                All Events →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
              {events.map((ev) => {
                const d = formatDate(ev.event_date)
                const modelList = ev.event_entries?.map(e => e.models).filter(Boolean) || []
                const isStreet = ev.event_type === 'street'
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/5', background: '#151515', cursor: 'pointer' }}
                      className="event-card">
                      {ev.main_image
                        ? <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7, transition: 'transform 0.6s ease, opacity 0.3s' }} className="event-img" />
                        : <div style={{ width: '100%', height: '100%', background: `linear-gradient(160deg, ${isStreet ? '#1a2a1a, #0d1a0d' : '#1a1a2f, #0d0d1a'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 48, opacity: 0.3 }}>{isStreet ? '🌆' : '🏢'}</span>
                          </div>
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
                      <div style={{ position: 'absolute', top: 16, left: 16 }}>
                        <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 2 }}>
                          {isStreet ? 'Street' : ev.event_type === 'studio' ? 'Studio' : 'Special'}
                        </span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px' }}>
                        <div style={{ ...serif, fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 300, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                          {d.day} <span style={{ fontSize: '0.5em', opacity: 0.7, fontStyle: 'italic' }}>{d.month}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>{ev.title || ev.location_name}</div>
                        {modelList.length > 0 && (
                          <div style={{ display: 'flex', gap: 0 }}>
                            {modelList.slice(0, 4).map((m, idx) => (
                              <div key={idx} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.4)', overflow: 'hidden', background: '#333', marginLeft: idx > 0 ? -8 : 0 }}>
                                {m.image && <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              </div>
                            ))}
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

      {/* ─── MODELS ─── */}
      {models && models.length > 0 && (
        <section style={{ background: '#f5f0fa', padding: '80px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>Models</p>
                <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0a0a0a' }}>
                  出演モデル
                </h2>
              </div>
              <Link href="/models" style={{ ...serif, color: '#555', fontSize: 13, letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase', borderBottom: '1px solid #555', paddingBottom: 2 }}>
                All Models →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 20vw, 200px), 1fr))', gap: 3 }}>
              {models.map((model) => (
                <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ position: 'relative', aspectRatio: '2/3', background: '#d8cce8', overflow: 'hidden' }} className="model-card">
                    {model.image
                      ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }} className="model-img" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0a0c0' }}>
                          <span style={{ fontSize: 36 }}>👤</span>
                        </div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)', opacity: 0, transition: 'opacity 0.3s' }} className="model-overlay" />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 12px', transform: 'translateY(100%)', transition: 'transform 0.3s ease' }} className="model-info">
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{model.name}</div>
                      {model.name_en && <div style={{ ...serif, color: 'rgba(255,255,255,0.7)', fontSize: 11, fontStyle: 'italic' }}>{model.name_en}</div>}
                    </div>
                    {/* Always-visible name at bottom for mobile */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 12px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>{model.name}</div>
                      {model.name_en && <div style={{ ...serif, color: 'rgba(255,255,255,0.6)', fontSize: 10, fontStyle: 'italic' }}>{model.name_en}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ background: '#fff', color: '#0a0a0a', padding: '80px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#999', textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
            <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0 }}>ご参加の流れ</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: '#e5e5e5' }}>
            {[
              { num: '01', en: 'Browse', ja: 'スケジュールを確認', desc: '開催日程・出演モデルをチェック。ストリートとスタジオから選べます。' },
              { num: '02', en: 'Reserve', ja: '時間枠を選んで予約', desc: '好きな時間枠を選択し、お名前・メールアドレスを入力するだけ。' },
              { num: '03', en: 'Confirm', ja: '確認メールを受け取る', desc: '予約確認メールが届いたら完了。当日はQRコードをご提示ください。' },
              { num: '04', en: 'Shoot', ja: '当日を楽しむ', desc: 'カメラを持って現地へ。スタッフがご案内します。素敵な写真を撮りましょう。' },
            ].map(item => (
              <div key={item.num} style={{ background: '#fff', padding: '40px 28px' }}>
                <div style={{ ...serif, fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 300, color: '#e8e0f0', lineHeight: 1, marginBottom: 16 }}>{item.num}</div>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: '#bbb', textTransform: 'uppercase', marginBottom: 8 }}>{item.en}</p>
                <h3 style={{ ...serif, fontSize: 18, fontWeight: 600, color: '#0a0a0a', marginBottom: 12, marginTop: 0 }}>{item.ja}</h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RECRUIT CTA ─── */}
      <section style={{ position: 'relative', padding: '120px 20px', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2f2244 0%, #1a0f2e 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(200,150,255,0.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <p style={{ ...serif, fontSize: 12, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 20, fontStyle: 'italic' }}>Join us</p>
          <h2 style={{ ...serif, fontSize: 'clamp(36px, 7vw, 72px)', fontWeight: 300, color: '#fff', lineHeight: 1.1, margin: '0 0 24px' }}>
            モデルとして<br /><em>活躍しませんか？</em>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 2, marginBottom: 40 }}>
            経験不問。公式LINEからお気軽にご連絡ください。
          </p>
          <a href="https://lin.ee/VgTzmhe" target="_blank" rel="noopener noreferrer" style={{
            ...serif, display: 'inline-block', fontSize: 14, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#fff', textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.5)', padding: '16px 48px', borderRadius: 2,
          }}>
            LINEで応募する
          </a>
        </div>
      </section>

      <style>{`
        .event-card:hover .event-img { transform: scale(1.05); opacity: 0.9; }
        .model-card:hover .model-overlay { opacity: 1; }
        .model-card:hover .model-img { transform: scale(1.05); }
        @media (max-width: 640px) {
          .concept-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
