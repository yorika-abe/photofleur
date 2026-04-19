import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#1a1228', color: 'rgba(255,255,255,0.7)', padding: '48px 20px 32px', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>PhotoFleur</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              プロカメラマンと個性豊かなモデルが出会う、撮影会予約プラットフォーム。
            </p>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>サービス</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/schedule" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>スケジュール</Link>
              <Link href="/models" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>モデル一覧</Link>
              <Link href="/request" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>リクエスト撮影</Link>
              <Link href="/model-recruit" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>モデル募集</Link>
            </div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>サポート</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/faq" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>よくある質問</Link>
              <a href="https://lin.ee/7XLB4St" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>LINEで問い合わせ</a>
            </div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>法的情報</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/terms" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>利用規約</Link>
              <Link href="/tokushoho" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>特定商取引法に基づく表記</Link>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          © 2024 PhotoFleur. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
