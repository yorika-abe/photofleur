import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import PdfImageSlider from '@/components/PdfImageSlider'
import ProfileSection from './ProfileSection'

export const dynamic = 'force-dynamic'

export default async function StaffGuidePage() {
  const supabase = await createSupabaseAdminClient()
  const { data: rows } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['staff_guide_images_howto', 'staff_onboarding_images_regist', 'staff_onboarding_images_about'])
  const settings = Object.fromEntries((rows || []).map(r => [r.key, r.value]))
  const guideImages = JSON.parse(settings.staff_guide_images_howto || '[]')
  const registImages = JSON.parse(settings.staff_onboarding_images_regist || '[]')
  const aboutImages = JSON.parse(settings.staff_onboarding_images_about || '[]')

  const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '24px', marginBottom: 20 }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/staff-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← スタッフ画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 28px' }}>スタッフ活動の手引き</h1>

      <ProfileSection />

      {guideImages.length > 0 ? (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>スタッフ活動手引き</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>スタッフとして活動するための手引きです</p>
          <PdfImageSlider images={guideImages} />
        </div>
      ) : (
        <div style={{ ...card, background: '#f5f9ff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>スタッフ活動手引き</h2>
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, padding: '24px 0' }}>📄 資料（後ほど追加されます）</div>
        </div>
      )}

      {registImages.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>撮影会スタッフ登録説明</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>スタッフ登録の手続きについて</p>
          <PdfImageSlider images={registImages} />
        </div>
      )}

      {aboutImages.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>About PhotoFleur</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 16 }}>PhotoFleurについて</p>
          <PdfImageSlider images={aboutImages} />
        </div>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/staff-portal" style={{ display: 'inline-block', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '14px 40px', fontWeight: 700, fontSize: 15 }}>
          スタッフポータルに戻る
        </Link>
      </div>
    </div>
  )
}
