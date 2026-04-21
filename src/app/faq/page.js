'use client'

import { useState } from 'react'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

const faqs = [
  {
    category: '予約について',
    items: [
      { q: '予約はどうすればできますか？', a: 'スケジュールページから開催イベントを選び、ご希望の時間枠の「予約する」ボタンをクリックしてください。お名前とメールアドレスを入力すると予約が完了します。' },
      { q: 'キャンセルはできますか？', a: '撮影日の3日前までであれば無料でキャンセル可能です。3日前以降のキャンセルはキャンセル料が発生する場合があります。キャンセルはLINEまたはメールにてご連絡ください。' },
      { q: '複数の時間枠を予約できますか？', a: 'はい、複数の枠を個別に予約していただくことが可能です。それぞれの枠に対して予約操作を行ってください。' },
      { q: '予約確認メールが届かない場合はどうすればよいですか？', a: '迷惑メールフォルダをご確認ください。それでも届かない場合はLINEにてご連絡ください。' },
    ],
  },
  {
    category: '撮影について',
    items: [
      { q: 'ストリート撮影の集合場所はいつ分かりますか？', a: '撮影日の3日前にメールでご案内します。変更になる場合もLINEにてお知らせします。' },
      { q: '機材のレンタルはありますか？', a: '機材のご用意はございません。ご自身のカメラでご参加ください。スマートフォンでの撮影も歓迎しています。' },
      { q: '撮影した写真の使用について制限はありますか？', a: 'ご自身の作品としてSNS等に使用いただけますが、商用利用の際はモデルへの事前連絡が必要です。利用規約もご確認ください。' },
      { q: '天候不良の場合は中止になりますか？', a: 'ストリート撮影は荒天の場合、開催日の朝8時頃にLINEにてご連絡します。スタジオ撮影は天候に関わらず開催します。' },
    ],
  },
  {
    category: '料金・お支払いについて',
    items: [
      { q: '料金の支払いはいつ行いますか？', a: '当日の撮影開始前に現金またはSquare決済でお支払いいただきます。事前のオンライン決済も選択可能です。' },
      { q: '領収書の発行はできますか？', a: 'ご希望の方はLINEまたはメールにてご連絡ください。PDFにて発行いたします。' },
    ],
  },
  {
    category: 'モデル応募について',
    items: [
      { q: 'モデル経験がなくても応募できますか？', a: 'はい、経験は問いません。モデル募集ページからお気軽にご応募ください。' },
      { q: '審査にどのくらいかかりますか？', a: '通常3〜5営業日以内にご連絡します。審査状況によって前後することがあります。' },
      { q: '報酬はありますか？', a: '撮影会の形式によって異なります。詳細はモデル承認後にご案内いたします。' },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #eef4f8' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '20px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}
      >
        <span style={{ fontWeight: 600, color: '#0d1f3a', fontSize: 15, lineHeight: 1.6 }}>Q. {q}</span>
        <span style={{ color: '#5bbfd6', fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 20, color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
          A. {a}
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div style={{ background: '#fff' }}>

      {/* ─── HERO ─── */}
      <section style={{ background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 100%)', color: '#fff', padding: 'clamp(60px, 10vw, 110px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 16, fontStyle: 'italic' }}>FAQ</p>
          <h1 style={{ ...serif, fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 400, margin: 0 }}>よくある質問</h1>
          <div style={{ width: 40, height: 1, background: 'rgba(168,226,244,0.4)', margin: '24px auto 20px' }} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            ご不明な点がある場合はLINEにてお気軽にお問い合わせください。
          </p>
        </div>
      </section>

      {/* ─── FAQ LIST ─── */}
      <section style={{ padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {faqs.map(section => (
            <div key={section.category} style={{ marginBottom: 52 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, paddingBottom: 16, borderBottom: '2px solid #0d1f3a' }}>
                <span style={{ color: '#5bbfd6', fontSize: 18 }}>◇</span>
                <h2 style={{ ...serif, fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 600, color: '#0d1f3a', margin: 0 }}>{section.category}</h2>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '0 24px', border: '1px solid #d6ecf5' }}>
                {section.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
              </div>
            </div>
          ))}

          <div style={{ background: 'linear-gradient(135deg, #f0f7fb, #fafcff)', borderRadius: 16, padding: '36px 32px', textAlign: 'center', border: '1px solid #c8e8f5' }}>
            <h3 style={{ ...serif, fontSize: 22, fontWeight: 400, color: '#0d1f3a', marginBottom: 10, marginTop: 0 }}>解決しない場合は</h3>
            <p style={{ color: '#556070', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>上記以外のご質問はLINEからお気軽にどうぞ。</p>
            <a
              href="https://lin.ee/VgTzmhe"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#06C755', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '14px 32px', fontWeight: 700, fontSize: 15 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              LINEで問い合わせる
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
