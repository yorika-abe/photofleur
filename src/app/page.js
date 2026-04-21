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
      .eq('status', 'active'),
  ])

  return (
    <div style={{ background: '#fff' }}>

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,20,40,0.9) 0%, rgba(10,20,40,0.2) 50%, transparent 100%)' }} />

        <div style={{ position: 'absolute', top: 28, right: 28, textAlign: 'right' }}>
          <div style={{ ...serif, fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Photography × Model</div>
          <div style={{ ...serif, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Since 2024</div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(32px, 5vw, 64px)', width: '100%' }}>
          <p style={{ ...serif, fontSize: 'clamp(11px, 1.5vw, 13px)', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Let your own unique flower bloom
          </p>
          <h1 style={{ ...serif, fontSize: 'clamp(64px, 14vw, 140px)', fontWeight: 300, lineHeight: 0.9, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            <span style={{ display: 'block', fontWeight: 300, color: '#fff' }}>Photo</span>
            <span style={{ display: 'block', fontWeight: 700, fontStyle: 'italic', color: '#a8e2f4' }}>FLEUR</span>
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

        <div style={{ position: 'absolute', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ ...serif, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', writingMode: 'vertical-rl' }}>Scroll</div>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }} />
        </div>
      </section>

      {/* ─── MISSION ─── */}
      <section style={{ background: '#fff', padding: 'clamp(80px, 12vw, 140px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 24, fontWeight: 600 }}>Mission Statement.</p>
          <h2 style={{ ...serif, fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 400, fontStyle: 'italic', color: '#0d1f3a', margin: '0 0 48px', lineHeight: 1.4 }}>
            &ldquo;Every flower deserves to bloom.&rdquo;
          </h2>
          <div style={{ width: 40, height: 1, background: '#c8e8f5', margin: '0 auto 48px' }} />
          <p style={{ fontSize: 'clamp(15px, 2.2vw, 18px)', lineHeight: 2.4, color: '#3a3050', margin: 0 }}>
            ここに集まる全ての人が一人の人間として、<br />
            モデル、カメラマン、クリエーターとして、<br />
            <br />
            それぞれが自分らしい<strong style={{ ...serif, fontSize: '1.1em', color: '#1a3560', fontStyle: 'italic' }}>&ldquo;花&rdquo;</strong>となり、芽生え咲き、輝ける。<br />
            そんな場所を目指しています。
          </p>
        </div>
      </section>

      {/* ─── SCHEDULE ─── */}
      {events && events.length > 0 && (
        <section style={{ background: '#f0f7fb', padding: '80px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, borderBottom: '1px solid #c8e8f5', paddingBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Schedule</p>
                <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0d1f3a' }}>
                  直近の撮影会
                </h2>
              </div>
              <Link href="/schedule" style={{ ...serif, color: '#5bbfd6', fontSize: 13, letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase', borderBottom: '1px solid #5bbfd6', paddingBottom: 2 }}>
                All Events →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 3 }}>
              {events.map((ev) => {
                const d = formatDate(ev.event_date)
                const modelList = ev.event_entries?.map(e => e.models).filter(Boolean) || []
                const isStreet = ev.event_type === 'street'
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/5', background: '#d6ecf5', cursor: 'pointer' }} className="event-card">
                      {ev.main_image
                        ? <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, transition: 'transform 0.6s ease' }} className="event-img" />
                        : <div style={{ width: '100%', height: '100%', background: isStreet ? 'linear-gradient(160deg, #c8e8f5, #a8d8ea)' : 'linear-gradient(160deg, #f4d6e8, #e8b8d0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 48, opacity: 0.4 }}>{isStreet ? '🌆' : '🏢'}</span>
                          </div>
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,25,50,0.85) 0%, rgba(10,25,50,0.1) 60%, transparent 100%)' }} />
                      <div style={{ position: 'absolute', top: 16, left: 16 }}>
                        <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#fff', textTransform: 'uppercase', background: isStreet ? 'rgba(91,191,214,0.7)' : 'rgba(244,160,190,0.7)', padding: '4px 10px', borderRadius: 2, fontWeight: 600 }}>
                          {isStreet ? 'Street' : ev.event_type === 'studio' ? 'Studio' : 'Special'}
                        </span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px' }}>
                        <div style={{ ...serif, fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 300, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                          {d.day} <span style={{ fontSize: '0.5em', opacity: 0.7, fontStyle: 'italic' }}>{d.month}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{ev.title || ev.location_name}</div>
                        {modelList.length > 0 && (
                          <div style={{ display: 'flex' }}>
                            {modelList.slice(0, 4).map((m, idx) => (
                              <div key={idx} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.6)', overflow: 'hidden', background: '#d6ecf5', marginLeft: idx > 0 ? -8 : 0 }}>
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
        <section style={{ background: '#0d1f3a', padding: '80px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div style={{ textAlign: 'center', marginBottom: 56, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 32 }}>
              <h2 style={{ ...serif, fontSize: 'clamp(56px, 10vw, 100px)', fontWeight: 300, margin: 0, color: '#fff', letterSpacing: '0.15em' }}>
                MODELS
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 20vw, 200px), 1fr))', gap: 20 }}>
              {models.map((model) => (
                <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                  <div>
                    <div style={{ position: 'relative', aspectRatio: '2/3', background: '#1a3560', overflow: 'hidden', borderRadius: 2 }} className="model-card">
                      {model.image
                        ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }} className="model-img" />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5bbfd6' }}>
                            <span style={{ fontSize: 36 }}>👤</span>
                          </div>
                      }
                    </div>
                    <div style={{ padding: '10px 4px 0' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{model.name}</div>
                      {model.name_en && <div style={{ ...serif, color: '#a8e2f4', fontSize: 11, fontStyle: 'italic' }}>{model.name_en}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ background: '#fff', padding: '80px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>How it works</p>
            <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0d1f3a' }}>ご参加の流れ</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: '#e8f4f8' }}>
            {[
              { num: '01', en: 'Browse', ja: 'スケジュールを確認', desc: '開催日程・出演モデルをチェック。ストリートとスタジオから選べます。' },
              { num: '02', en: 'Reserve', ja: '時間枠を選んで予約', desc: '好きな時間枠を選択し、お名前・メールアドレスを入力するだけ。' },
              { num: '03', en: 'Confirm', ja: '確認メールを受け取る', desc: '予約確認メールが届いたら完了。当日はQRコードをご提示ください。' },
              { num: '04', en: 'Shoot', ja: '当日を楽しむ', desc: 'カメラを持って現地へ。スタッフがご案内します。素敵な写真を撮りましょう。' },
            ].map(item => (
              <div key={item.num} style={{ background: '#fff', padding: '40px 28px' }}>
                <div style={{ ...serif, fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 300, color: '#d6ecf5', lineHeight: 1, marginBottom: 16 }}>{item.num}</div>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>{item.en}</p>
                <h3 style={{ ...serif, fontSize: 18, fontWeight: 600, color: '#0d1f3a', marginBottom: 12, marginTop: 0 }}>{item.ja}</h3>
                <p style={{ fontSize: 13, color: '#667', lineHeight: 1.8, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RECRUIT CTA ─── */}
      <section style={{ position: 'relative', padding: '120px 20px', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(135deg, #fce8f0 0%, #e8f4fb 100%)' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <p style={{ ...serif, fontSize: 12, letterSpacing: '0.3em', color: '#f4a0be', textTransform: 'uppercase', marginBottom: 20, fontStyle: 'italic' }}>Join us</p>
          <h2 style={{ ...serif, fontSize: 'clamp(36px, 7vw, 72px)', fontWeight: 300, color: '#0d1f3a', lineHeight: 1.1, margin: '0 0 24px' }}>
            モデルとして<br /><em style={{ color: '#5bbfd6' }}>PhotoFleurの一員になりませんか？</em>
          </h2>
          <p style={{ fontSize: 14, color: '#667', lineHeight: 2, marginBottom: 40 }}>
            経験不問。公式LINEからお気軽にご連絡ください。
          </p>
          <Link href="/model-recruit" style={{
            ...serif, display: 'inline-block', fontSize: 14, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#fff', textDecoration: 'none',
            background: '#1a3560', padding: '16px 48px', borderRadius: 2,
          }}>
            詳しく見る →
          </Link>
        </div>
      </section>

      <style>{`
        .event-card:hover .event-img { transform: scale(1.05); }
        .model-card:hover .model-img { transform: scale(1.05); }
        @media (max-width: 640px) { .concept-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
