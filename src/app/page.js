import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import HeroSlideshow from '@/components/HeroSlideshow'
import ScrollReveal from '@/components/ScrollReveal'
import ScheduleCarousel from '@/components/ScheduleCarousel'
import RepMessage from '@/components/RepMessage'

export const dynamic = 'force-dynamic'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function toEmbedUrl(url) {
  if (!url) return ''
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v')
    return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0]
    return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`
  }
  if (url.includes('youtube.com/embed/')) return url
  return url
}

export default async function Home() {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const today = new Date().toISOString().split('T')[0]

  const [{ data: events }, { data: models }, { data: siteSettingsRows }] = await Promise.all([
    adminSupabase
      .from('events')
      .select('id, event_date, event_type, title, location_name, main_image')
      .eq('status', 'active')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(6),
    adminSupabase
      .from('models')
      .select('id, name, name_en, image')
      .eq('status', 'active'),
    adminSupabase.from('site_settings').select('key, value'),
  ])

  // Fetch event entries separately
  const eventIds = (events || []).map(e => e.id)
  const { data: eventEntries } = eventIds.length > 0
    ? await adminSupabase.from('event_entries').select('id, event_id, model_id, models(id, name, image)').in('event_id', eventIds)
    : { data: [] }
  const entriesByEvent = {}
  for (const entry of (eventEntries || [])) {
    if (!entriesByEvent[entry.event_id]) entriesByEvent[entry.event_id] = []
    entriesByEvent[entry.event_id].push(entry)
  }
  const eventsWithEntries = (events || []).map(ev => ({ ...ev, event_entries: entriesByEvent[ev.id] || [] }))

  const siteSettings = Object.fromEntries((siteSettingsRows || []).map(r => [r.key, r.value]))
  const heroImages = JSON.parse(siteSettings.hero_bg_images || '[]')
  const heroImagesMobile = JSON.parse(siteSettings.hero_bg_images_mobile || '[]')
  const heroVideo = siteSettings.hero_video || ''
  const heroVideo2 = siteSettings.hero_video_2 || ''
  const missionBg = siteSettings.mission_bg || ''
  const recruitBgImages = JSON.parse(siteSettings.recruit_bg_images || '[]')
  const recruitBgVideo = siteSettings.recruit_bg_video || ''
  const repPhoto = siteSettings.rep_photo || ''
  const repRole = siteSettings.rep_role || ''
  const repName = siteSettings.rep_name || ''
  const repMessage = siteSettings.rep_message || ''
  const repModelId = siteSettings.rep_model_id || ''
  const isYoutube = heroVideo.includes('youtube') || heroVideo.includes('youtu.be')
  const isYoutube2 = heroVideo2.includes('youtube') || heroVideo2.includes('youtu.be')
  const isRecruitYoutube = recruitBgVideo.includes('youtube') || recruitBgVideo.includes('youtu.be')

  return (
    <div style={{ background: '#fff' }}>
      <ScrollReveal />

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <span className="hero-desktop"><HeroSlideshow images={heroImages} /></span>
        <span className="hero-mobile"><HeroSlideshow images={heroImagesMobile.length > 0 ? heroImagesMobile : heroImages} objectFit="contain" /></span>
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

      {/* ─── HERO VIDEO 1 ─── */}
      {heroVideo && (
        <section style={{ background: '#0d1f3a', padding: 0, overflow: 'hidden' }}>
          {isYoutube ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
              <iframe src={toEmbedUrl(heroVideo)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
          ) : (
            <video src={heroVideo} autoPlay loop muted playsInline style={{ width: '100%', display: 'block', verticalAlign: 'bottom' }} />
          )}
        </section>
      )}

      {/* ─── HERO VIDEO 2 ─── */}
      {heroVideo2 && (
        <section style={{ background: '#0d1f3a', padding: 0, overflow: 'hidden' }}>
          {isYoutube2 ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
              <iframe src={toEmbedUrl(heroVideo2)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
          ) : (
            <video src={heroVideo2} autoPlay loop muted playsInline style={{ width: '100%', display: 'block', verticalAlign: 'bottom' }} />
          )}
        </section>
      )}

      {/* ─── MISSION ─── */}
      <section style={{ position: 'relative', padding: 'clamp(40px, 7vw, 80px) 20px', textAlign: 'center', overflow: 'hidden', background: '#fff' }}>
        {missionBg && <img src={missionBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {missionBg && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.45)' }} />}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <p className="reveal" style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Mission Statement.</p>
          <h2 className="reveal reveal-delay-1" style={{ ...serif, fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 400, fontStyle: 'italic', color: '#0d1f3a', margin: '0 0 20px', lineHeight: 1.4 }}>
            &ldquo;Every flower deserves to bloom.&rdquo;
          </h2>
          <div className="reveal reveal-delay-2" style={{ width: 32, height: 1, background: '#c8e8f5', margin: '0 auto 20px' }} />
          <p className="reveal reveal-delay-3" style={{ fontSize: 'clamp(13px, 1.8vw, 15px)', lineHeight: 2, color: '#3a3050', margin: 0 }}>
            ここに集まる全ての人が一人の人間として、<br />
            モデル、カメラマン、クリエーターとして、<br />
            <br />
            それぞれが自分らしい<strong style={{ ...serif, fontSize: '1.05em', color: '#1a3560', fontStyle: 'italic' }}>&ldquo;花&rdquo;</strong>となり、芽生え咲き、輝ける。<br />
            そんな場所を目指しています。
          </p>
        </div>
      </section>

      {/* ─── SCHEDULE ─── */}
      {eventsWithEntries && eventsWithEntries.length > 0 && (
        <section style={{ background: '#f0f7fb', padding: '80px 0 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div className="reveal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8, borderBottom: '1px solid #c8e8f5', paddingBottom: 24 }}>
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
          </div>
          <ScheduleCarousel events={eventsWithEntries} />
        </section>
      )}

      {/* ─── MODELS ─── */}
      {models && models.length > 0 && (
        <section style={{ background: '#0d1f3a', padding: '80px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: 56, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 32 }}>
              <h2 style={{ ...serif, fontSize: 'clamp(56px, 10vw, 100px)', fontWeight: 300, margin: 0, color: '#fff', letterSpacing: '0.15em' }}>
                MODELS
              </h2>
            </div>

            <div className="model-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 20vw, 200px), 1fr))', gap: 20 }}>
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
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, background: '#e8f4f8' }}>
            {[
              { num: '01', en: 'Browse', ja: 'スケジュールを確認', desc: '開催日程・出演モデルをチェック。撮影場所の雰囲気などもご確認ください。' },
              { num: '02', en: 'Reserve', ja: '時間枠を選んで予約', desc: '好きな時間枠を選択し、お名前・メールアドレスを入力するだけ。' },
              { num: '03', en: 'Confirm', ja: '確認メールを受け取る', desc: '予約確認メールが届いたら完了。当日はQRコードをご提示ください。' },
              { num: '04', en: 'Shoot', ja: '撮影当日', desc: 'カメラを持って現地へ。スタッフがご案内します。素敵な作品を作りましょう。' },
            ].map(item => (
              <div key={item.num} className="how-item" style={{ background: '#fff', padding: '40px 28px' }}>
                <div style={{ ...serif, fontSize: 'clamp(32px, 6vw, 72px)', fontWeight: 300, color: '#d6ecf5', lineHeight: 1, marginBottom: 16 }}>{item.num}</div>
                <p style={{ fontSize: 'clamp(8px, 1.5vw, 10px)', letterSpacing: '0.15em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>{item.en}</p>
                <h3 className="how-title" style={{ ...serif, fontSize: 'clamp(9px, 1.8vw, 18px)', fontWeight: 600, color: '#0d1f3a', marginBottom: 8, marginTop: 0, wordBreak: 'keep-all' }}>{item.ja}</h3>
                <p className="how-desc" style={{ fontSize: 'clamp(8px, 1.4vw, 13px)', color: '#667', lineHeight: 1.6, margin: 0, wordBreak: 'keep-all' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RECRUIT CTA ─── */}
      <section style={{ position: 'relative', padding: '120px 20px', overflow: 'hidden', textAlign: 'center' }}>
        {/* 背景：動画 or 画像スライドショー or グラデーション */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {recruitBgVideo ? (
            isRecruitYoutube ? (
              <iframe src={toEmbedUrl(recruitBgVideo) + '&autoplay=1&mute=1&loop=1&controls=0&playsinline=1'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} allow="autoplay" />
            ) : (
              <video src={recruitBgVideo} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : recruitBgImages.length > 0 ? (
            <HeroSlideshow images={recruitBgImages} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #fce8f0 0%, #e8f4fb 100%)' }} />
          )}
          {/* テキスト可読性のためのオーバーレイ */}
          {(recruitBgVideo || recruitBgImages.length > 0) && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,50,0.55)' }} />
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <p style={{ ...serif, fontSize: 12, letterSpacing: '0.3em', color: (recruitBgVideo || recruitBgImages.length > 0) ? 'rgba(255,255,255,0.7)' : '#f4a0be', textTransform: 'uppercase', marginBottom: 20, fontStyle: 'italic' }}>Join us</p>
          <h2 style={{ ...serif, fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 300, color: (recruitBgVideo || recruitBgImages.length > 0) ? '#fff' : '#0d1f3a', lineHeight: 1.3, margin: '0 0 24px' }}>
            モデルとして<br />
            <em style={{ color: (recruitBgVideo || recruitBgImages.length > 0) ? '#a8e2f4' : '#5bbfd6' }}>PhotoFleurの一員になりませんか？</em>
          </h2>
          <p style={{ fontSize: 15, color: (recruitBgVideo || recruitBgImages.length > 0) ? 'rgba(255,255,255,0.85)' : '#667', lineHeight: 2, marginBottom: 40 }}>
            完全女性運営によるサポートのもと<br />
            あなたのモデル活動を全力で応援いたします。<br />
            経験不問。公式LINEからお気軽にご連絡ください。
          </p>
          <Link href="/model-recruit" style={{
            ...serif, display: 'inline-block', fontSize: 14, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#fff', textDecoration: 'none',
            background: (recruitBgVideo || recruitBgImages.length > 0) ? 'rgba(255,255,255,0.2)' : '#1a3560',
            border: '1px solid rgba(255,255,255,0.6)',
            padding: '16px 48px', borderRadius: 2,
          }}>
            詳しく見る →
          </Link>
        </div>
      </section>

      {/* ─── REPRESENTATIVE MESSAGE ─── */}
      {(repName || repMessage) && (
        <RepMessage photo={repPhoto} role={repRole} name={repName} message={repMessage} modelId={repModelId} />
      )}

      <style>{`
        .event-card:hover .event-img { transform: scale(1.05); }
        .model-card:hover .model-img { transform: scale(1.05); }
        @media (max-width: 640px) { .concept-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .model-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; } }
        @media (max-width: 640px) { .model-grid a > div > div:last-child { padding: 6px 4px 8px !important; } }
        @media (max-width: 640px) { .model-grid a > div > div:last-child > div:first-child { font-size: 10px !important; } }
        @media (max-width: 640px) { .model-grid a > div > div:last-child > div:last-child { font-size: 9px !important; } }
        @media (max-width: 640px) { .how-item { padding: 16px 8px !important; } }
        @media (max-width: 640px) { .how-desc { display: none; } }
      `}</style>
    </div>
  )
}
