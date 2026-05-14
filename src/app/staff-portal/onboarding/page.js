import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import FadingHeroBg from '@/components/FadingHeroBg'

export const dynamic = 'force-dynamic'

export default async function StaffOnboardingPage() {
  const supabase = await createSupabaseAdminClient()
  const { data: rows } = await supabase.from('site_settings').select('key, value').in('key', ['hero_bg_images', 'staff_onboarding_pdf_about', 'staff_onboarding_pdf_regist'])
  const settings = Object.fromEntries((rows || []).map(r => [r.key, r.value]))
  const heroImages = JSON.parse(settings.hero_bg_images || '[]')
  const pdfAbout = settings.staff_onboarding_pdf_about || ''
  const pdfRegist = settings.staff_onboarding_pdf_regist || ''

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{`body { overflow-x: hidden; }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <FadingHeroBg images={heroImages} opacity={0.55} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: '0 0 16px' }}>Photo Fleurにようこそ</h1>
          <p style={{ fontSize: 15, color: '#444', lineHeight: 2, margin: 0 }}>
            ここに集まる全ての人が一人の人間として、<br />
            モデル、カメラマン、クリエーターとして、<br />
            それぞれが自分らしい"花"となり、芽生え咲き、輝ける。<br />
            そんな場所を目指しています。
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', background: 'rgba(255,255,255,0.88)', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 12 }}>ABOUT Photo Fleur</h2>
              {pdfAbout ? (
                <>
                  <div className="pdf-desktop" style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #d6ecf5' }}>
                    <iframe src={pdfAbout} style={{ width: '100%', height: 560, border: 'none', display: 'block' }} title="ABOUT Photo Fleur" />
                    <div style={{ padding: '8px 12px', background: '#f5f9ff', textAlign: 'right' }}>
                      <a href={pdfAbout} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1a3560', textDecoration: 'none', fontWeight: 600 }}>↗ 別タブで開く</a>
                    </div>
                  </div>
                  <div className="pdf-mobile" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 20px', background: '#f5f9ff', borderRadius: 10, border: '1px solid #d6ecf5', textAlign: 'center' }}>
                    <div style={{ fontSize: 36 }}>📄</div>
                    <a href={pdfAbout} target="_blank" rel="noopener noreferrer" style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 14 }}>PDFを開く →</a>
                  </div>
                </>
              ) : (
                <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '32px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                  📄 PDF（後ほど追加されます）
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 400px', background: 'rgba(255,255,255,0.88)', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 12 }}>撮影会スタッフ登録説明</h2>
              {pdfRegist ? (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #d6ecf5' }}>
                  <iframe src={pdfRegist} style={{ width: '100%', height: 560, border: 'none', display: 'block' }} title="撮影会スタッフ登録説明" />
                  <div style={{ padding: '8px 12px', background: '#f5f9ff', textAlign: 'right' }}>
                    <a href={pdfRegist} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1a3560', textDecoration: 'none', fontWeight: 600 }}>↗ 別タブで開く</a>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '32px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                  📄 PDF（後ほど追加されます）
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <Link href="/staff-portal/private-info"
              style={{ display: 'inline-block', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '16px 48px', fontWeight: 700, fontSize: 16 }}>
              スタッフ登録を始める →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
