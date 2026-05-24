import { createSupabaseAdminClient } from '@/lib/supabase-server'
import FadingHeroBg from '@/components/FadingHeroBg'
import { getOgpImage, buildMetadata } from '@/lib/ogp'
import EligibilityChecker from './EligibilityChecker'

export async function generateMetadata() {
  const image = await getOgpImage('ogp_request')
  return buildMetadata({ title: 'リクエスト撮影 | PhotoFleur', path: '/request', imageUrl: image })
}

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }


export default async function RequestPage() {
  const supabase = await createSupabaseAdminClient()
  const [{ data }, { data: modelsData }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'request_hero_image').single(),
    supabase.from('models').select('id, name').eq('status', 'active').order('display_order'),
  ])
  const raw = data?.value || ''
  let heroImages = []
  try { const p = JSON.parse(raw); heroImages = Array.isArray(p) ? p : (raw ? [raw] : []) } catch { heroImages = raw ? [raw] : [] }
  const activeModels = modelsData || []

  return (
    <div style={{ background: '#fff', color: '#1a1228' }}>

      {/* ─── HERO ─── */}
      <section style={{ background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 100%)', color: '#fff', padding: 'clamp(64px, 10vw, 110px) 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <FadingHeroBg images={heroImages} opacity={0.35} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{ ...serif, fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 20, fontStyle: 'italic' }}>Request Shooting</p>
          <h1 style={{ ...serif, fontSize: 'clamp(17px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.2, margin: '0 0 24px', whiteSpace: 'nowrap' }}>
            📸 リクエスト撮影について
          </h1>
          <div style={{ width: 48, height: 1, background: 'rgba(168,226,244,0.5)', margin: '0 auto 20px' }} />
          <p style={{ fontSize: 'clamp(13px, 1.8vw, 16px)', lineHeight: 1.9, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            ご希望の<strong style={{ color: '#a8e2f4' }}>モデル・ロケーション・衣装・日時</strong>をもとに、完全オーダーメイドの撮影を承ります。<br />
            ご希望のシチュエーションで、より自由度の高い撮影をお楽しみいただけます✨
          </p>
          <p style={{ fontSize: 'clamp(9px, 2.5vw, 12px)', color: 'rgba(255,255,255,0.45)', marginTop: 14, marginBottom: 0, whiteSpace: 'nowrap' }}>
            ※撮影会開催日は、リクエスト撮影の受付は行っておりません。
          </p>
        </div>
      </section>

      {/* ─── CONDITIONS ─── */}
      <section style={{ background: '#fafcff', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Requirements</p>
            <h2 style={{ ...serif, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              💡 ご利用条件
            </h2>
          </div>
          <p style={{ fontSize: 'clamp(10px, 2.5vw, 13px)', color: '#556070', textAlign: 'center', marginBottom: 24, lineHeight: 1.8, whiteSpace: 'nowrap' }}>
            下記2点の条件を満たしている方のみお申し込み可能です。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div className="req-cond-box" style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #d6ecf5' }}>
              <div style={{ ...serif, fontSize: 28, fontWeight: 700, color: '#5bbfd6', marginBottom: 10 }} className="req-cond-num">①</div>
              <div className="req-cond-label" style={{ fontSize: 12, fontWeight: 600, color: '#5bbfd6', letterSpacing: '0.1em', marginBottom: 8 }}>安全管理のための条件</div>
              <p className="req-cond-text" style={{ fontSize: 13, lineHeight: 1.9, color: '#3a3050', margin: 0, textWrap: 'balance' }}>
                Photo Fleurの撮影会を<strong>過去に10回以上ご利用</strong>いただいた方。
                <span style={{ fontSize: 12, color: '#aaa', display: 'block', marginTop: 6 }}>※規定回数未満の方はリクエスト撮影をご利用いただけません。</span>
              </p>
            </div>
            <div className="req-cond-box" style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #d6ecf5' }}>
              <div style={{ ...serif, fontSize: 28, fontWeight: 700, color: '#5bbfd6', marginBottom: 10 }} className="req-cond-num">②</div>
              <div className="req-cond-label" style={{ fontSize: 12, fontWeight: 600, color: '#5bbfd6', letterSpacing: '0.1em', marginBottom: 8 }}>モデル指名のための条件</div>
              <p className="req-cond-text" style={{ fontSize: 13, lineHeight: 1.9, color: '#3a3050', margin: 0, textWrap: 'balance' }}>
                お申し込み月の前3ヶ月以内に<strong>2枠以上の撮影に参加</strong>しており、かつ<strong>希望モデルを過去に3枠以上撮影</strong>したことがある方。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section style={{ background: '#fff', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Pricing</p>
            <h2 style={{ ...serif, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              💰 撮影料金
            </h2>
          </div>
          <div style={{ background: '#f8fbff', borderRadius: 12, padding: '24px 28px', border: '1px solid #d6ecf5' }}>
            <p className="req-pc-only" style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: '0 0 16px' }}>
              モデルスタジオ料金×撮影時間（リクエスト撮影は２時間から受付しております）<br />
              ＋スタッフ同伴料1,000円×撮影時間＋モデル・スタッフの交通費
            </p>
            <p className="req-mobile-only" style={{ fontSize: 13, lineHeight: 2, color: '#3a3050', margin: '0 0 16px' }}>
              モデルスタジオ料金×撮影時間<br />
              <span style={{ fontSize: 11, color: '#778' }}>（リクエスト撮影は２時間から受付しております）</span><br />
              ＋スタッフ同伴料1,000円<br />
              ×撮影時間＋モデル・スタッフの交通費
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#556070', lineHeight: 1.9 }}>
              <p style={{ margin: 0 }}>※モデルページのスタジオ料金をご参照ください。</p>
              <p style={{ margin: 0 }}>※モデルにより追加料金が発生する場合がございます。詳細はお問い合わせください。</p>
              <p style={{ margin: 0 }}>※スタッフおよびモデルの<strong>交通費（実費）</strong>は別途ご負担となります。</p>
              <p style={{ margin: 0 }}>※当日撮影に際して発生する料金は全てカメラマンさん持ちでお願いいたします。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AREA ─── */}
      <section style={{ background: '#f0f7fb', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Area</p>
            <h2 style={{ ...serif, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              🚃 対応エリア
            </h2>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', border: '1px solid #c8e8f5', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {['東京都', '神奈川県', '千葉県', '埼玉県'].map(area => (
                <span key={area} style={{ background: '#e8f4fb', color: '#1a3560', fontWeight: 600, fontSize: 13, padding: '6px 18px', borderRadius: 20, border: '1px solid #c8e8f5' }}>{area}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#556070', margin: 0, lineHeight: 1.9 }}>
              上記以外の地域も、移動距離・拘束時間に応じた割増料金にて対応いたします。詳細はご相談ください。
            </p>
          </div>
        </div>
      </section>

      {/* ─── FLOW ─── */}
      <section style={{ background: '#fff', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Flow</p>
            <h2 style={{ ...serif, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              📅 日程調整の流れ
            </h2>
          </div>
          <div style={{ background: '#f8fbff', borderRadius: 12, padding: '24px 28px', border: '1px solid #d6ecf5' }}>
            <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: 0 }}>
              開催希望日を<strong>第1〜第3希望</strong>までお知らせください。<br />
              モデル・スタッフのスケジュールを確認のうえ、折り返しご連絡させていただきます。
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW TO APPLY ─── */}
      <section style={{ background: '#fafcff', padding: 'clamp(32px, 5vw, 56px) 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>How to Apply</p>
            <h2 style={{ ...serif, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
              ✉️ お申し込み方法
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #d6ecf5' }}>
              <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: 0 }}>
                下の<strong>👤 ご利用条件を確認</strong>から予約条件を満たしているか確認してください。<br />
                予約条件を満たしている場合、グレーアウトしている「リクエスト撮影に申し込む」が押せるようになります。
              </p>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #d6ecf5' }}>
              <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: '0 0 12px' }}>
                リクエスト撮影に関するご連絡は公式LINEよりさせていただきますので、会員アカウントとの紐付けをお願いしております。
              </p>
              <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: 0 }}>
                必要情報を入力の上、希望日時を3日程お送りください。<br />
                該当モデルに参加可否を確認、スタッフの日程調整の上<strong>1週間以内にご連絡</strong>させていただきます。
              </p>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #d6ecf5' }}>
              <p style={{ fontSize: 14, lineHeight: 2, color: '#3a3050', margin: 0 }}>
                会員マイページよりリクエスト撮影の確認ステータスが表示されます。<br />
                詳細とお支払いに関するご連絡をいたしますので、そちらからご予約いただきましたらリクエスト予約の確定となります。
              </p>
            </div>
            <div style={{ background: '#f0f7fb', borderRadius: 12, padding: '20px 24px', border: '1px solid #c8e8f5' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3560', margin: '0 0 8px' }}>💳 お支払い方法に関して</p>
              <p style={{ fontSize: 13, lineHeight: 2, color: '#3a3050', margin: 0 }}>
                原則クレジット払いをお願いしております。<br />
                現金の場合はリクエスト撮影前の通常撮影会にお越しいただき前払い、もしくは特例で当日現金払いが可能になる場合もございますので、申し込み時に要望欄にてご相談ください。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ELIGIBILITY CHECK ─── */}
      <EligibilityChecker models={activeModels} />

      {/* ─── CLOSING ─── */}
      <section style={{ background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 100%)', color: '#fff', padding: 'clamp(40px, 6vw, 70px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ width: 40, height: 1, background: 'rgba(168,226,244,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontSize: 14, lineHeight: 2, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            <span className="req-closing-pc">📷 ご希望のロケーションで、あなたの理想を形にする特別撮影。<br />モデル・スタッフ一同、心を込めてサポートいたします✨</span>
            <span className="req-closing-mobile">📷 ご希望のロケーションで、<br />あなたの理想を形にする特別撮影。<br />モデル・スタッフ一同、心を込めてサポートいたします✨</span>
          </p>
          <div style={{ width: 40, height: 1, background: 'rgba(168,226,244,0.4)', margin: '24px auto 0' }} />
        </div>
      </section>

      <style>{`
        .req-closing-mobile { display: none; }
        .req-mobile-only { display: none; }
        @media (max-width: 640px) {
          .req-closing-pc { display: none; }
          .req-closing-mobile { display: inline; }
          .req-pc-only { display: none; }
          .req-mobile-only { display: block; }
          .req-cond-box { padding: 14px 12px !important; border-radius: 10px !important; }
          .req-cond-num { font-size: 20px !important; margin-bottom: 6px !important; }
          .req-cond-label { font-size: 10px !important; margin-bottom: 6px !important; }
          .req-cond-text { font-size: 11px !important; line-height: 1.7 !important; }
        }
      `}</style>
    </div>
  )
}
