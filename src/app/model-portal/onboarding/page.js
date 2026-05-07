'use client'

import Link from 'next/link'

export default function ModelOnboardingPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: '0 0 16px' }}>Photo Fleurにようこそ</h1>
        <p style={{ fontSize: 15, color: '#555', lineHeight: 2, margin: 0 }}>
          ここに集まる全ての人が一人の人間として、<br />
          モデル、カメラマン、クリエーターとして、<br />
          それぞれが自分らしい"花"となり、芽生え咲き、輝ける。<br />
          そんな場所を目指しています。
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* PDF 1 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 12 }}>ABOUT Photo Fleur</h2>
          <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '32px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            📄 PDF（後ほど追加されます）
          </div>
        </div>

        {/* PDF 2 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 12 }}>撮影会登録説明</h2>
          <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '32px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            📄 PDF（後ほど追加されます）
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <Link href="/model-portal/private-info"
            style={{ display: 'inline-block', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '16px 48px', fontWeight: 700, fontSize: 16 }}>
            モデル登録を始める →
          </Link>
        </div>
      </div>
    </div>
  )
}
