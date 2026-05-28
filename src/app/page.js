import Image from 'next/image'
import { getOgpImage, buildMetadata } from '@/lib/ogp'
import Link from 'next/link'

export async function generateMetadata() {
  const image = await getOgpImage('ogp_home')
  return buildMetadata({ title: 'PhotoFleur | 撮影会予約サービス', path: '/', imageUrl: image })
}
import { createClient } from '@supabase/supabase-js'
import HeroSection from '@/components/HeroSection'
import RecruitMarquee from '@/components/RecruitMarquee'
import ScrollReveal from '@/components/ScrollReveal'
import ScheduleCarousel from '@/components/ScheduleCarousel'
import NoticesCarousel from '@/components/NoticesCarousel'
import RepMessage from '@/components/RepMessage'
import SectionTitle from '@/components/SectionTitle'
import FeaturedPhotosSection from '@/components/FeaturedPhotosSection'

export const revalidate = 300

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

  const [{ data: events }, { data: models }, { data: siteSettingsRows }, { data: repsData }, { data: staffData }] = await Promise.all([
    adminSupabase
      .from('events')
      .select('id, event_date, event_type, title, subtitle, location_name, main_image, thumbnail_image')
      .eq('status', 'active')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(6),
    adminSupabase
      .from('models')
      .select('id, name, name_en, image')
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    adminSupabase.from('site_settings').select('key, value'),
    adminSupabase.from('representatives').select('id, photo, role, name, message, model_id').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    adminSupabase.from('staff_private_info').select('display_name, real_name, profile_photo'),
  ])
  const representatives = repsData || []
  const staffMembers = (staffData || []).map(s => ({
    name: s.display_name || '',
    photo: s.profile_photo || '',
  }))

  const siteSettings = Object.fromEntries((siteSettingsRows || []).map(r => [r.key, r.value]))
  const featuredBlogIds = JSON.parse(siteSettings.blog_featured_ids || '[]')

  // Fetch event entries + blog categories + featured posts + featured photos in parallel (after siteSettings)
  const eventIds = (events || []).map(e => e.id)
  const [{ data: blogCategories }, { data: eventEntries }, { data: noticesData }, { data: rawFeaturedPhotos }] = await Promise.all([
    adminSupabase.from('blog_categories').select('name, slug').order('display_order', { ascending: true }),
    eventIds.length > 0
      ? adminSupabase.from('event_entries').select('id, event_id, model_id, models(id, name, image)').in('event_id', eventIds)
      : { data: [] },
    featuredBlogIds.length > 0
      ? adminSupabase.from('blog_posts').select('id, title, slug, cover_image, content, published_at, category').in('id', featuredBlogIds).eq('status', 'published').order('published_at', { ascending: false })
      : { data: [] },
    adminSupabase.from('contributed_photos').select('id, photo_url, sns_url, display_name, model_ids').eq('is_featured', true).order('featured_order', { ascending: true }),
  ])
  const featuredPhotos = rawFeaturedPhotos || []
  const notices = noticesData || []

  const entriesByEvent = {}
  for (const entry of (eventEntries || [])) {
    if (!entriesByEvent[entry.event_id]) entriesByEvent[entry.event_id] = []
    entriesByEvent[entry.event_id].push(entry)
  }
  const eventsWithEntries = (events || []).map(ev => ({ ...ev, event_entries: entriesByEvent[ev.id] || [] }))
  const heroImages = JSON.parse(siteSettings.hero_bg_images || '[]')
  const heroImagesMobile = JSON.parse(siteSettings.hero_bg_images_mobile || '[]')
  const heroVideo = siteSettings.hero_video || ''
  const heroVideo2 = siteSettings.hero_video_2 || ''
  const missionBg = siteSettings.mission_bg || ''
  const recruitBgImages = JSON.parse(siteSettings.recruit_bg_images || '[]')
  const isYoutube = heroVideo.includes('youtube') || heroVideo.includes('youtu.be')
  const isYoutube2 = heroVideo2.includes('youtube') || heroVideo2.includes('youtu.be')

  return (
    <div style={{ background: '#fff' }}>
      <ScrollReveal />

      {/* ─── HERO ─── */}
      <HeroSection images={heroImages} mobileImages={heroImagesMobile} />

      {/* ─── HERO VIDEO 1 ─── */}
      {heroVideo && (
        <section style={{ background: '#0d1f3a', padding: 0, overflow: 'hidden' }}>
          {isYoutube ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
              <iframe src={toEmbedUrl(heroVideo)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
          ) : (
            <video src={heroVideo} autoPlay loop muted playsInline preload="auto" style={{ width: '100%', display: 'block', verticalAlign: 'bottom' }} />
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
            <video src={heroVideo2} autoPlay loop muted playsInline preload="auto" style={{ width: '100%', display: 'block', verticalAlign: 'bottom' }} />
          )}
        </section>
      )}

      {/* ─── MISSION ─── */}
      <section style={{ position: 'relative', padding: 'clamp(40px, 7vw, 80px) 20px', textAlign: 'center', overflow: 'hidden', background: '#fff' }}>
        {missionBg && <Image src={missionBg} alt="" fill style={{ objectFit: 'cover' }} />}
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
        <section style={{ background: '#f0f7fb', padding: '60px 0 0', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div className="reveal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, borderBottom: '1px solid #c8e8f5', paddingBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Schedule</p>
                <h2 className="schedule-title" style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0d1f3a', whiteSpace: 'nowrap' }}>
                  開催予定のイベント
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
        <section style={{ background: '#fff', padding: 'clamp(20px, 3vw, 48px) 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(20px, 4vw, 56px)', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 'clamp(16px, 3vw, 32px)', overflow: 'hidden', paddingTop: 16 }}>
              <SectionTitle text="MODELS" />
            </div>

            <div className="model-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 20vw, 200px), 1fr))', gap: 20 }}>
              {models.map((model) => (
                <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                  <div>
                    <div style={{ position: 'relative', aspectRatio: '2/3', background: '#f0f0f0', overflow: 'hidden', borderRadius: 2 }} className="model-card">
                      {model.image
                        ? <img src={model.image} alt={model.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }} className="model-img" />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                            <span style={{ fontSize: 36 }}>👤</span>
                          </div>
                      }
                    </div>
                    <div style={{ padding: '10px 4px 0' }}>
                      <div style={{ color: '#222', fontWeight: 600, fontSize: 13 }}>{model.name}</div>
                      {model.name_en && <div style={{ ...serif, color: '#999', fontSize: 11, fontStyle: 'italic' }}>{model.name_en}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ background: '#fff', padding: '32px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>How it works</p>
            <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0d1f3a' }}>ご参加の流れ</h2>
          </div>
          <div className="how-grid" style={{ display: 'grid', gap: 1, background: '#e8f4f8' }}>
            {[
              { num: '01', en: 'Browse', ja: 'スケジュールを確認', desc: '開催日程・出演モデルをチェック。撮影場所の雰囲気などもご確認ください。' },
              { num: '02', en: 'Reserve', ja: '時間枠を選んで予約', desc: '好きな時間枠を選択し、お名前・メールアドレスを入力するだけ。' },
              { num: '03', en: 'Confirm', ja: '確認メールを受け取る', desc: '予約確認メールが届いたら完了。当日はQRコードをご提示ください。' },
              { num: '04', en: 'Shoot', ja: '撮影当日', desc: 'カメラを持って現地へ。スタッフがご案内します。素敵な作品を作りましょう。' },
            ].map(item => (
              <div key={item.num} className="how-item" style={{ background: '#fff', padding: '20px 28px 28px' }}>
                <div style={{ ...serif, fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 300, color: '#d6ecf5', lineHeight: 1, marginBottom: 16 }}>{item.num}</div>
                <p style={{ fontSize: 10, letterSpacing: '0.15em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>{item.en}</p>
                <h3 className="how-title" style={{ ...serif, fontSize: 'clamp(10px, 1.1vw, 15px)', fontWeight: 600, color: '#0d1f3a', marginBottom: 8, marginTop: 0, whiteSpace: 'nowrap' }}>{item.ja}</h3>
                <p className="how-desc" style={{ fontSize: 13, color: '#667', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AFTER SHOOT ─── */}
      <section style={{ background: '#fff', padding: '32px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>After the shoot</p>
            <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0d1f3a' }}>ご参加後</h2>
          </div>
          <div className="how-grid" style={{ display: 'grid', gap: 1, background: '#e8f4f8' }}>
            {[
              { num: '01', en: 'Feedback', ja: 'ご意見をお送りください', desc: 'PhotoFleurでは日々改善・改良を重ねています。ご予約のメール宛にご意見箱を送信させていただきます。開催ご提案や感想・改善点などお送りください。' },
              { num: '02', en: 'Photos', ja: '写真のご提供', desc: 'ご予約のメール宛に撮っていただいた写真をアップロードしていただくフォームを送信させていただきます。対象のモデルを選択いただきますと運営とモデルに送信されます。' },
              { num: '03', en: 'Gallery', ja: 'ホームページへの掲載', desc: 'ご提供いただきました写真から選ばれたものが一定期間ホームページに使用されます。掲載報告のご連絡させていただきますのでご確認ください。' },
              { num: '04', en: 'Follow', ja: 'SNS・ブログをフォロー', desc: 'Xやインスタグラム・HPのブログやモデルページなど日々更新していきます。2025/09/16から開催されているまだ出来立ての撮影会の成長を見守っていただけたら嬉しいです。' },
            ].map(item => (
              <div key={item.num} className="after-item" style={{ background: '#fff', padding: '20px 28px 28px' }}>
                <div style={{ ...serif, fontSize: 'clamp(28px, 5vw, 64px)', fontWeight: 300, color: '#d6ecf5', lineHeight: 1, marginBottom: 10 }}>{item.num}</div>
                <p style={{ fontSize: 10, letterSpacing: '0.15em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>{item.en}</p>
                <h3 style={{ ...serif, fontSize: 'clamp(13px, 1.2vw, 16px)', fontWeight: 600, color: '#0d1f3a', marginBottom: 8, marginTop: 0 }}>{item.ja}</h3>
                <p className="after-desc" style={{ fontSize: 13, color: '#667', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED PHOTOS ─── */}
      <FeaturedPhotosSection photos={featuredPhotos} models={models || []} />

      {/* ─── NOTICES / BLOG ─── */}
      <section style={{ background: '#fdf7fb', padding: '80px 0 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
          <div className="reveal" style={{ marginBottom: 8, borderBottom: '1px solid #f0d6e8', paddingBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#f4a0be', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>News &amp; Info</p>
                <h2 style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, margin: 0, color: '#0d1f3a' }}>
                  Blog
                </h2>
              </div>
              <Link href="/blog" style={{ fontSize: 13, color: '#f4a0be', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #f4a0be', paddingBottom: 2, whiteSpace: 'nowrap' }}>
                ブログ一覧を見る →
              </Link>
            </div>
            {blogCategories && blogCategories.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                <Link href="/blog" style={{ fontSize: 12, padding: '4px 14px', borderRadius: 20, border: '1px solid #f4a0be', color: '#f4a0be', textDecoration: 'none', fontWeight: 600 }}>
                  すべて
                </Link>
                {blogCategories.map(cat => (
                  <Link key={cat.slug} href={`/blog?category=${cat.slug}`} style={{ fontSize: 12, padding: '4px 14px', borderRadius: 20, border: '1px solid #ddd', color: '#888', textDecoration: 'none', fontWeight: 500 }}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        {notices.length > 0 && <NoticesCarousel notices={notices} />}
        {notices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0 60px', color: '#ccc', fontSize: 14 }}>お気に入りに設定されたブログ記事がありません</div>
        )}
      </section>

      {/* ─── RECRUIT CTA ─── */}
      <RecruitMarquee items={recruitBgImages} />

      {/* ─── REPRESENTATIVE MESSAGE ─── */}
      {representatives.map((rep, idx) => (
        <RepMessage key={rep.id} photo={rep.photo} role={rep.role} name={rep.name} message={rep.message} modelId={rep.model_id} showTitle={idx === 0} />
      ))}

      {/* ─── STAFF ─── */}
      <section style={{ background: '#fff', padding: '36px 0 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)', textAlign: 'center' }}>
            <div style={{ paddingTop: 16, marginBottom: 8 }}>
              <SectionTitle text="STAFF" />
            </div>
            <p style={{ fontSize: 13, color: '#bbb', marginTop: 8, marginBottom: 32 }}>受付など担当します</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 28px', justifyContent: 'center' }}>
              {staffMembers.map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div className="staff-photo" style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', background: '#f0f4f8', border: '3px solid #e5e5e5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.photo
                      ? <img src={s.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 48 }}>🐈‍⬛</span>}
                  </div>
                  {s.name && <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>{s.name}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

      <style>{`
        .event-card:hover .event-img { transform: scale(1.05); }
        .model-card:hover .model-img { transform: scale(1.05); }
        @media (max-width: 640px) { .concept-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .model-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; } }
        @media (max-width: 640px) { .model-grid a > div > div:last-child { padding: 6px 4px 8px !important; } }
        @media (max-width: 640px) { .model-grid a > div > div:last-child > div:first-child { font-size: 10px !important; } }
        @media (max-width: 640px) { .model-grid a > div > div:last-child > div:last-child { font-size: 9px !important; } }
        .how-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        @media (max-width: 900px) { .how-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 600px) { .how-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .how-item { padding: 20px 14px !important; } }
        @media (max-width: 640px) { .how-desc { font-size: 11px !important; } }
        @media (max-width: 600px) { .how-title { font-size: 13px !important; } }
        @media (max-width: 640px) { .schedule-title { font-size: 22px !important; } }
        @media (max-width: 640px) { .staff-photo { width: 80px !important; height: 80px !important; } }
        @media (max-width: 640px) { .after-item { padding: 14px 10px 18px !important; } }
        @media (max-width: 640px) { .after-desc { font-size: 11px !important; line-height: 1.5 !important; } }
      `}</style>
    </div>
  )
}
