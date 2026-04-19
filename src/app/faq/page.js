'use client'

import { useState } from 'react'

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
      { q: 'モデル経験がなくても応募できますか？', a: 'はい、経験は問いません。プロフィールページの「モデル募集」からお気軽にご応募ください。' },
      { q: '審査にどのくらいかかりますか？', a: '通常3〜5営業日以内にご連絡します。審査状況によって前後することがあります。' },
      { q: '報酬はありますか？', a: '撮影会の形式によって異なります。詳細はモデル承認後にご案内いたします。' },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #eee' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '20px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}
      >
        <span style={{ fontWeight: 600, color: '#2f2244', fontSize: 15, lineHeight: 1.5 }}>Q. {q}</span>
        <span style={{ color: '#2f2244', fontSize: 20, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 20, color: '#555', lineHeight: 1.8, fontSize: 14 }}>
          A. {a}
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>よくある質問</h1>
      <p style={{ color: '#666', marginBottom: 48, fontSize: 15 }}>ご不明な点がある場合はLINEにてお気軽にお問い合わせください。</p>

      {faqs.map(section => (
        <div key={section.category} style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2f2244', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #2f2244' }}>{section.category}</h2>
          <div style={{ background: '#fff', borderRadius: 12, padding: '0 24px', border: '1px solid #e5e5e5' }}>
            {section.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      ))}

      <div style={{ background: '#f8f5ff', borderRadius: 16, padding: '28px 32px', textAlign: 'center', border: '1px solid #e0d5f5' }}>
        <h3 style={{ fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>解決しない場合は</h3>
        <p style={{ color: '#666', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>上記以外のご質問はLINEからお気軽にどうぞ。</p>
        <a
          href="https://lin.ee/7XLB4St"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', background: '#00b900', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 15 }}
        >
          LINEで問い合わせる
        </a>
      </div>
    </div>
  )
}
