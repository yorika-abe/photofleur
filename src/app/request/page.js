export default function RequestPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>リクエスト撮影</h1>
      <p style={{ color: '#666', lineHeight: 1.8, marginBottom: 40, fontSize: 15 }}>
        定期イベント以外にも、ご希望のロケーション・スタイル・モデルでカスタム撮影が可能です。
      </p>

      <div style={{ background: '#f8f5ff', borderRadius: 12, padding: '24px', marginBottom: 32, border: '1px solid #e0d5f5' }}>
        <h3 style={{ fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>リクエスト撮影とは？</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#555', lineHeight: 2, fontSize: 14 }}>
          <li>希望の日程・場所・モデルで撮影</li>
          <li>人数・時間帯など柔軟に対応</li>
          <li>プライベートな撮影会として開催</li>
          <li>料金はリクエスト内容により異なります</li>
        </ul>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>公式LINEからお問い合わせください</h2>
        <p style={{ color: '#666', lineHeight: 1.8, fontSize: 14, marginBottom: 28 }}>
          ご希望の日程・場所・モデル・予算などをLINEでお気軽にご相談ください。<br />
          担当者が丁寧にご対応いたします。
        </p>
        <a
          href="https://lin.ee/VgTzmhe"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#06C755', color: '#fff', textDecoration: 'none',
            borderRadius: 10, padding: '14px 32px', fontWeight: 700, fontSize: 16,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          LINEで相談する
        </a>
      </div>
    </div>
  )
}
