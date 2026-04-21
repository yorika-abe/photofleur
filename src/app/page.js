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
    <div style={{ background: '#fdf9f7' }}>

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d0a18 0%, #1a0f28 40%, #0d0a20 100%)' }} />
        {/* Rose glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 40%, rgba(244,160,190,0.18) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 70%, rgba(168,226,244,0.08) 0%, transparent 50%)' }} />
        {/* Bottom fade */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,5,20,0.7) 0%, transparent 60%)' }} />

        {/* Corner decoration */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 120, height: 120, borderRight: '1px solid rgba(244,160,190,0.2)', borderBottom: '1px solid rgba(244,160,190,0.2)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, borderLeft: '1px solid rgba(244,160,190,0.2)', borderTop: '1px solid rgba(244,160,190,0.2)' }} />

        {/* Center text */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px' }}>
          <p style={{ ...serif, fontSize: 'clamp(10px, 1.2vw, 12px)', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.45)', marginBottom: 28, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Let your own unique flower bloom
          </p>
          {/* Decorative line */}
          <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, rgba(244,160,190,0.6), transparent)', margin: '0 auto 28px' }} />
          <h1 style={{ ...serif, lineHeight: 0.88, margin: '0 0 24px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(52px, 12vw, 120px)', fontWeight: 400, color: '#fff', letterSpacing: '0.08em' }}>Photo</span>
            <span style={{ display: 'block', fontSize: 'clamp(64px, 15vw, 148px)', fontWeight: 700, fontStyle: 'italic', color: '#f4b8ce', letterSpacing: '0.02em' }}>Fleur</span>
          </h1>
          <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, rgba(244,160,190,0.6), transparent)', margin: '28px auto' }} />
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/schedule" style={{
              ...serif, fontSize: 'clamp(11px, 1.4vw, 13px)', letterSpacing: '0.3em',
              color: '#fff', textDecoration: 'none', textTransform: 'uppercase',
              paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.5)',
            }}>Schedule</Link>
            <Link href="/models" style={{
              ...serif, fontSize: 'clamp(11px, 1.4vw, 13px)', letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.5)', textDecoration: 'none', textTransform: 'uppercase',
            }}>Models</Link>
          </div>
        </div>

        {/* Scroll */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(244,160,190,0.6), transparent)' }} />
          <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Scroll</span>
        </div>
      </section>

      {/* ─── CONCEPT ─── */}
      <section style={{ background: '#fff', padding: '100px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px, 8vw, 100px)', alignItems: 'center' }} className="concept-grid">
            {/* Image placeholder */}
            <div style={{ aspectRatio: '3/4', background: 'linear-gradient(160deg, #fce8f0 0%, #e8f4fb 100%)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(244,160,190,0.4)', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ ...serif, fontSize: 12, letterSpacing: '0.2em', color: '#d4a0b8', textTransform: 'uppercase', fontStyle: 'italic' }}>Image</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#d4869e', textTransform: 'uppercase', marginBottom: 20, fontWeight: 500 }}>About Photo Fleur</p>
              <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 400, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1228' }}>
                撮影会という
              </h2>
              <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.2, margin: '0 0 28px', color: '#c4607a' }}>
                体験を、自由に。
              </h2>
              <p style={{ fontSize: 14, lineHeight: 2.1, color: '#7a6a72', margin: '0 0 36px' }}>
                PhotoFleurは、プロカメラマンと個性豊かなモデルが出会う撮影会予約プラットフォームです。
                ストリートからスタジオまで、あなただけの特別な一枚を。
              </p>
              <Link href="/schedule" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: '#c4607a', textDecoration: 'none', fontWeight: 600,
                borderBottom: '1px solid #e8a0b4', paddingBottom: 4,
              }}>
                撮影会を探す →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SCHEDULE ─── */}
      {events && events.length > 0 && (
        <section style={{ background: '#fef5f8', padding: '100px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            {/* Section header */}
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#d4869e', textTransform: 'uppercase', marginBottom: 16, fontWeight: 500 }}>Schedule</p>
              <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 400, margin: '0 0 20px', color: '#1a1228' }}>
                直近の<em style={{ fontStyle: 'italic', color: '#c4607a' }}>撮影会</em>
              </h2>
              <div style={{ width: 40, height: 1, background: '#e8a0b4', margin: '0 auto 0' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {events.map((ev) => {
                const d = formatDate(ev.event_date)
                const modelList = ev.event_entries?.map(e => e.models).filter(Boolean) || []
                const isStreet = ev.event_type === 'street'
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: '#fff', borderRadius: 4, overflow: 'hidden', border: '1px solid #f5e0e8', transition: 'box-shadow 0.3s', boxShadow: '0 2px 20px rgba(196,96,122,0.06)' }} className="event-card">
                      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: isStreet ? 'linear-gradient(135deg, #fce8f0, #f5d0df)' : 'linear-gradient(135deg, #e8f4fb, #d0e8f5)' }}>
                        {ev.main_image
                          ? <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }} className="event-img" />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.4 }}>{isStreet ? '🌸' : '✨'}</div>
                        }
                        <div style={{ position: 'absolute', top: 12, left: 12 }}>
                          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, padding: '4px 10px', borderRadius: 2, background: isStreet ? 'rgba(244,184,206,0.9)' : 'rgba(168,226,244,0.9)', color: isStreet ? '#8a2a44' : '#1a4060' }}>
                            {isStreet ? 'Street' : ev.event_type === 'studio' ? 'Studio' : 'Special'}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                          <span style={{ ...serif, fontSize: 32, fontWeight: 400, color: '#1a1228', lineHeight: 1 }}>{d.day}</span>
                          <span style={{ ...serif, fontSize: 14, fontStyle: 'italic', color: '#c4607a' }}>{d.month}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#5a4a52', fontWeight: 500, marginBottom: 12 }}>{ev.title || ev.location_name}</div>
                        {modelList.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ display: 'flex' }}>
                              {modelList.slice(0, 4).map((m, idx) => (
                                <div key={idx} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #fff', overflow: 'hidden', background: '#f5e0e8', marginLeft: idx > 0 ? -8 : 0 }}>
                                  {m.image && <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                              ))}
                            </div>
                            <span style={{ fontSize: 11, color: '#b48090' }}>{modelList.map(m => m.name).join(' / ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link href="/schedule" style={{ ...serif, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c4607a', textDecoration: 'none', borderBottom: '1px solid #e8a0b4', paddingBottom: 3, fontStyle: 'italic' }}>
                View All Events →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── MODELS ─── */}
      {models && models.length > 0 && (
        <section style={{ background: '#fff', padding: '100px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#7bc8e2', textTransform: 'uppercase', marginBottom: 16, fontWeight: 500 }}>Models</p>
              <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 400, margin: '0 0 20px', color: '#1a1228' }}>
                出演<em style={{ fontStyle: 'italic', color: '#7bc8e2' }}>モデル</em>
              </h2>
              <div style={{ width: 40, height: 1, background: '#a8d8ea', margin: '0 auto' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(150px, 22vw, 220px), 1fr))', gap: 12 }}>
              {models.map((model) => (
                <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ position: 'relative', aspectRatio: '2/3', background: 'linear-gradient(160deg, #fce8f0, #e8f4fb)', overflow: 'hidden', borderRadius: 2 }} className="model-card">
                    {model.image
                      ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }} className="model-img" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4a0b8' }}>
                          <span style={{ fontSize: 36 }}>👤</span>
                        </div>
                    }
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 14px 14px', background: 'linear-gradient(to top, rgba(20,10,20,0.75), transparent)' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{model.name}</div>
                      {model.name_en && <div style={{ ...serif, color: 'rgba(255,255,255,0.65)', fontSize: 11, fontStyle: 'italic' }}>{model.name_en}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link href="/models" style={{ ...serif, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7bc8e2', textDecoration: 'none', borderBottom: '1px solid #a8d8ea', paddingBottom: 3, fontStyle: 'italic' }}>
                View All Models →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ background: '#fdf9f7', padding: '100px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#d4869e', textTransform: 'uppercase', marginBottom: 16, fontWeight: 500 }}>How it works</p>
            <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 400, margin: '0 0 20px', color: '#1a1228' }}>
              ご参加の<em style={{ fontStyle: 'italic', color: '#c4607a' }}>流れ</em>
            </h2>
            <div style={{ width: 40, height: 1, background: '#e8a0b4', margin: '0 auto' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { num: '01', en: 'Browse', ja: 'スケジュールを確認', desc: '開催日程・出演モデルをチェック。ストリートとスタジオから選べます。' },
              { num: '02', en: 'Reserve', ja: '時間枠を選んで予約', desc: '好きな時間枠を選択し、お名前・メールアドレスを入力するだけ。' },
              { num: '03', en: 'Confirm', ja: '確認メールを受け取る', desc: '予約確認メールが届いたら完了。当日はQRコードをご提示ください。' },
              { num: '04', en: 'Shoot', ja: '当日を楽しむ', desc: 'カメラを持って現地へ。スタッフがご案内します。素敵な写真を撮りましょう。' },
            ].map(item => (
              <div key={item.num} style={{ background: '#fff', borderRadius: 4, padding: '36px 28px', border: '1px solid #f5e0e8' }}>
                <div style={{ ...serif, fontSize: 52, fontWeight: 300, color: '#f5e0e8', lineHeight: 1, marginBottom: 16, fontStyle: 'italic' }}>{item.num}</div>
                <p style={{ fontSize: 9, letterSpacing: '0.3em', color: '#d4869e', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>{item.en}</p>
                <h3 style={{ ...serif, fontSize: 17, fontWeight: 600, color: '#1a1228', marginBottom: 12, marginTop: 0 }}>{item.ja}</h3>
                <p style={{ fontSize: 13, color: '#8a7a82', lineHeight: 1.9, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RECRUIT CTA ─── */}
      <section style={{ position: 'relative', padding: '120px 20px', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(160deg, #1a0f28 0%, #2a1a3a 50%, #1a0f28 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(244,160,190,0.15) 0%, transparent 65%)' }} />
        {/* Corner decorations */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 80, borderRight: '1px solid rgba(244,160,190,0.25)', borderBottom: '1px solid rgba(244,160,190,0.25)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 80, height: 80, borderLeft: '1px solid rgba(244,160,190,0.25)', borderTop: '1px solid rgba(244,160,190,0.25)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 580, margin: '0 auto' }}>
          <div style={{ width: 40, height: 1, background: 'rgba(244,160,190,0.5)', margin: '0 auto 28px' }} />
          <p style={{ ...serif, fontSize: 11, letterSpacing: '0.4em', color: 'rgba(244,184,206,0.6)', textTransform: 'uppercase', marginBottom: 24, fontStyle: 'italic' }}>Join us</p>
          <h2 style={{ ...serif, fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 400, color: '#fff', lineHeight: 1.2, margin: '0 0 12px' }}>
            モデルとして
          </h2>
          <h2 style={{ ...serif, fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 700, fontStyle: 'italic', color: '#f4b8ce', lineHeight: 1.2, margin: '0 0 28px' }}>
            活躍しませんか？
          </h2>
          <div style={{ width: 40, height: 1, background: 'rgba(244,160,190,0.5)', margin: '0 auto 28px' }} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 2, marginBottom: 40 }}>
            経験不問。公式LINEからお気軽にご連絡ください。
          </p>
          <a href="https://lin.ee/VgTzmhe" target="_blank" rel="noopener noreferrer" style={{
            ...serif, display: 'inline-block', fontSize: 13, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: '#1a0f28', textDecoration: 'none',
            background: '#f4b8ce', padding: '16px 48px', borderRadius: 1, fontWeight: 600,
          }}>
            LINEで応募する
          </a>
        </div>
      </section>

      <style>{`
        .event-card:hover { box-shadow: 0 8px 40px rgba(196,96,122,0.15) !important; }
        .event-card:hover .event-img { transform: scale(1.05); }
        .model-card:hover .model-img { transform: scale(1.07); }
        @media (max-width: 640px) { .concept-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
