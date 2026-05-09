import { createSupabaseAdminClient } from '@/lib/supabase-server'
import FadingHeroBg from '@/components/FadingHeroBg'
import { getOgpImage, buildMetadata } from '@/lib/ogp'

export async function generateMetadata() {
  const image = await getOgpImage('ogp_recruit')
  return buildMetadata({ title: 'モデル募集 | PhotoFleur', path: '/model-recruit', imageUrl: image })
}

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

export default async function ModelRecruitPage() {
  const supabase = await createSupabaseAdminClient()
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'recruit_hero_image').single()
  const raw = data?.value || ''
  let heroImages = []
  try { const p = JSON.parse(raw); heroImages = Array.isArray(p) ? p : (raw ? [raw] : []) } catch { heroImages = raw ? [raw] : [] }

  return (
    <div style={{ background: '#fff', color: '#1a1a2e' }}>

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', background: 'linear-gradient(160deg, #fce8f4 0%, #e8f7fc 60%, #fff0f6 100%)', padding: 'clamp(80px, 12vw, 140px) 20px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 40%, rgba(168,226,244,0.25) 0%, transparent 60%)' }} />
        <FadingHeroBg images={heroImages} opacity={0.18} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <p style={{ ...serif, fontSize: 11, letterSpacing: '0.4em', color: '#00acc1', textTransform: 'uppercase', marginBottom: 20, fontStyle: 'italic', fontWeight: 600 }}>Model Recruit</p>
          <h1 style={{ ...serif, fontSize: 'clamp(36px, 7vw, 72px)', fontWeight: 400, lineHeight: 1.1, margin: '0 0 24px', color: '#0d1f3a' }}>
            モデル募集の<br /><em style={{ fontStyle: 'italic', fontWeight: 700, color: '#d81b60' }}>ご案内</em>
          </h1>
          <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, #f4a0be, #5bbfd6)', margin: '0 auto 28px', borderRadius: 2 }} />
          <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', lineHeight: 2, color: '#3a3050', margin: 0 }}>
            Photo Fleur（フォトフルール）は、<br />
            完全女性運営によるサポートのもと<br />
            <strong style={{ color: '#00acc1' }}>あなたのモデル活動を全力で応援いたします。</strong>
          </p>
        </div>
      </section>

      {/* ─── INTRO ─── */}
      <section style={{ background: '#fff', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(15px, 2.2vw, 18px)', lineHeight: 2.2, color: '#3a3050' }}>
            未経験でも大丈夫。<br />
            上手くポーズが取れなくても、モデル経験がなくても、<br />
            <strong><em style={{ ...serif, fontSize: '1.2em', color: '#d81b60' }}>"やってみたい" という気持ち</em></strong>を大切にしています。
          </p>
          <div style={{ margin: '40px 0', padding: '28px 32px', background: 'linear-gradient(135deg, #fce8f4 0%, #e8f7fc 100%)', borderLeft: '3px solid #f4a0be', borderRadius: '0 8px 8px 0', textAlign: 'left' }}>
            <p style={{ fontSize: 15, lineHeight: 2, color: '#3a3050', margin: 0 }}>
              撮影会の拡大に伴い新規所属モデルを募集しています。<br />
              私たちと一緒に、<strong>あなただけの魅力を咲かせてみませんか？</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE VALUE ─── */}
      <section style={{ background: '#f0fbfc', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#00acc1', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>What We Value</p>
            <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              大切にしていること
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { icon: '✿', title: '安心して活動できる環境', body: '所属モデルの多くが未経験からスタートしています。初めての撮影でも安心して臨めるよう、受付・撮影ルール・安全面のサポートを徹底しています。' },
              { icon: '✿', title: 'モデルとしての成長をサポート', body: '撮影会は実践の場。ポージング、表情づくり、衣装選びなど、回数を重ねるごとに自然とスキルが身につきます。希望者には簡単なレクチャーも行っています。' },
              { icon: '✿', title: '女性が安心して働ける現場づくり', body: '運営スタッフは完全女性のみ。不安なことや相談したいことがあれば、いつでも運営に話せる環境を整えています。' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', border: '1px solid #b2ebf2', boxShadow: '0 2px 12px rgba(0,172,193,0.07)' }}>
                <div style={{ fontSize: 24, color: '#f4a0be', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ ...serif, fontSize: 19, fontWeight: 600, color: '#0d1f3a', margin: '0 0 14px' }}>{item.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 2, color: '#556070', margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OUR ACTIVITIES ─── */}
      <section style={{ background: 'linear-gradient(135deg, #fce8f4 0%, #e8f7fc 100%)', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#d81b60', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Our Activities</p>
            <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              活動内容
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              '土日祝を中心としたスタジオ撮影・ストリート撮影',
              '1枠60〜90分の個撮形式',
              '私服・ファッション撮影中心',
              '都内・神奈川を中心に活動中',
              '撮影会参加経験ゼロでもOK！',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 20px', background: '#fff', borderRadius: 8, border: '1px solid #f4c8de', boxShadow: '0 2px 8px rgba(216,27,96,0.06)' }}>
                <span style={{ color: '#d81b60', fontSize: 16, flexShrink: 0, marginTop: 1 }}>◇</span>
                <span style={{ fontSize: 14, lineHeight: 1.8, color: '#3a3050' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRAINING ─── */}
      <section style={{ background: '#fff', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#00acc1', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Training</p>
            <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              充実した研修内容
            </h2>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #f0fbfc 0%, #fff0f6 100%)', borderRadius: 12, padding: '36px', border: '1px solid #b2ebf2' }}>
            <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', marginTop: 0, marginBottom: 20 }}>
              不定期で開催の<strong>完全女性スタッフのみの撮影研修</strong>では
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {[
                'OGモデルによるポージング指導',
                '撮影研修・ポートフォリオ撮影',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: '#3a3050' }}>
                  <span style={{ color: '#00acc1', fontWeight: 700, flexShrink: 0 }}>◇</span>
                  {item}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: 0, paddingTop: 20, borderTop: '1px solid #e0f7fa' }}>
              撮影の勉強が撮影会内でしっかりできる仕組みが整っています。
            </p>
          </div>
        </div>
      </section>

      {/* ─── CONDITIONS ─── */}
      <section style={{ background: '#f0fbfc', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#00acc1', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Requirements</p>
            <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              応募条件
            </h2>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: '36px', border: '1px solid #b2ebf2', marginBottom: 28 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                '16歳以上の女性',
                '健康状態に問題がなく、時間を守れる方',
                'SNS（X / Instagram など）で告知協力ができる方',
                'モデルとして前向きに取り組める方',
                '未経験歓迎・学生さん歓迎',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: '#3a3050', lineHeight: 1.8 }}>
                  <span style={{ color: '#00acc1', fontWeight: 700, flexShrink: 0 }}>・</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 20, marginBottom: 0, borderTop: '1px solid #e0f7fa', paddingTop: 16 }}>
              ※事務所所属の方は必ず許可をお取りください。
            </p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #fce8f4 0%, #e8f7fc 100%)', borderRadius: 12, padding: '32px', border: '1px solid #f4c8de' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#d81b60', marginBottom: 18, marginTop: 0 }}>こんな方にぴったりです</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                '写真を撮られるのが好き',
                '自分を変えたい・挑戦したい',
                '将来モデル・女優・アナウンサーを目指している',
                'コミュニケーションを楽しめる',
                'ファッション・美容が好き',
                '可愛い同年代の友だちがほしい',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3a3050' }}>
                  <span style={{ color: '#d81b60', fontSize: 12 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14, color: '#d81b60', fontWeight: 600, margin: '20px 0 0', paddingTop: 16, borderTop: '1px solid #f4c8de' }}>
              どれか1つでも当てはまったら、ぜひ一度ご連絡ください。
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW TO APPLY ─── */}
      <section style={{ background: '#fff', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#00acc1', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>How to Apply</p>
            <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              応募方法
            </h2>
          </div>

          <div style={{ background: '#f0fbfc', borderRadius: 12, padding: '36px', border: '1px solid #b2ebf2', marginBottom: 32 }}>
            <p style={{ fontSize: 14, color: '#556070', marginTop: 0, marginBottom: 20 }}>公式LINEより以下をお送りください。</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                'お名前',
                '生年月日',
                '身長',
                'お住まい（市区まで）',
                'SNSアカウント',
                '顔・全身写真（アプリ加工なし推奨）',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#3a3050', padding: '10px 0', borderBottom: '1px solid #e0f7fa' }}>
                  <span style={{ ...serif, fontSize: 18, color: '#00acc1', fontStyle: 'italic', lineHeight: 1 }}>{i + 1}.</span>
                  {item}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#aaa', margin: '20px 0 0' }}>確認後、採用の可能性のある方にのみ運営よりご連絡いたします。</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href="https://lin.ee/VgTzmhe" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#06C755', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '16px 40px', fontWeight: 700, fontSize: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              📩 LINEはこちら →
            </a>
          </div>
        </div>
      </section>

      {/* ─── CLOSING ─── */}
      <section style={{ background: 'linear-gradient(135deg, #fce8f4 0%, #e8f7fc 50%, #fff0f6 100%)', padding: 'clamp(60px, 8vw, 100px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #f4a0be, #5bbfd6)', margin: '0 auto 32px', borderRadius: 2 }} />
          <h2 style={{ ...serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 400, lineHeight: 1.5, margin: '0 0 24px', color: '#0d1f3a' }}>
            最後に
          </h2>
          <p style={{ fontSize: 15, lineHeight: 2.2, color: '#3a3050', margin: '0 0 16px' }}>
            Photo Fleur は、<strong style={{ color: '#00acc1' }}>「モデルの一歩目を応援する撮影会」</strong>です。
          </p>
          <p style={{ fontSize: 15, lineHeight: 2.2, color: '#556070', margin: 0 }}>
            まだ知られていない魅力を咲かせて、<br />
            花のように見る人を魅了する作品を一緒に作れたら嬉しいです。
          </p>
          <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #f4a0be, #5bbfd6)', margin: '32px auto 0', borderRadius: 2 }} />
        </div>
      </section>

    </div>
  )
}
