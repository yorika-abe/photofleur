import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import PdfImageSlider from '@/components/PdfImageSlider'
import MarkGuideVisited from './MarkGuideVisited'

export const dynamic = 'force-dynamic'

export default async function ModelGuidePage() {
  const supabase = await createSupabaseAdminClient()
  const { data: rows } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['guide_images_howto', 'guide_images_booking', 'onboarding_images_regist', 'onboarding_images_about'])
  const settings = Object.fromEntries((rows || []).map(r => [r.key, r.value]))
  const imagesHowto = JSON.parse(settings.guide_images_howto || '[]')
  const imagesBooking = JSON.parse(settings.guide_images_booking || '[]')
  const imagesRegist = JSON.parse(settings.onboarding_images_regist || '[]')
  const imagesAbout = JSON.parse(settings.onboarding_images_about || '[]')

  const card = { background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <MarkGuideVisited />
      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデルポータル</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 28px' }}>モデル活動の手引き</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>モデフルの使い方</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>シフト提出や変更・予約状況の確認</p>
          {imagesHowto.length > 0 ? (
            <PdfImageSlider images={imagesHowto} />
          ) : (
            <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '32px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              📄 資料（後ほど追加されます）
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>予約の埋め方・Xの運用方法</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>予約を埋めるのに大切なのはXの運用です</p>
          {imagesBooking.length > 0 ? (
            <PdfImageSlider images={imagesBooking} />
          ) : (
            <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '32px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              📄 資料（後ほど追加されます）
            </div>
          )}
        </div>

        {imagesRegist.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>モデル登録の手引き</h2>
            <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>撮影会モデル登録説明</p>
            <PdfImageSlider images={imagesRegist} />
          </div>
        )}

        {imagesAbout.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>About PhotoFleur</h2>
            <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>PhotoFleurについて</p>
            <PdfImageSlider images={imagesAbout} />
          </div>
        )}

      </div>
    </div>
  )
}
