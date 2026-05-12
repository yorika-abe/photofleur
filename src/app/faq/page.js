'use client'

import { useState } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const LINE_URL = 'https://lin.ee/VgTzmhe'

function LineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
}

const faqs = [
  {
    category: '予約について',
    items: [
      {
        q: '予約はどうすればできますか？',
        a: 'スケジュールページから開催イベントを選び、ご希望の時間枠の「予約する」ボタンをクリックしてください。必要事項を入力すると予約が完了します。',
      },
      {
        q: 'キャンセルはできますか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 12px' }}>キャンセルは公式LINEにてご連絡ください。</p>
            <div style={{ background: '#f8fbff', borderRadius: 8, padding: '14px 18px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>ご予約確定後：キャンセル料 <strong>30%</strong></div>
              <div>撮影７日前：キャンセル料 <strong>50%</strong></div>
              <div>撮影３日前：キャンセル料 <strong>100%</strong></div>
            </div>
            <p style={{ margin: 0 }}>が発生いたします。</p>
          </div>
        ),
      },
      {
        q: '複数の時間枠を予約できますか？',
        a: 'はい、複数の枠を個別に予約していただくことが可能です。それぞれの枠に対して予約操作を行ってください。同一のモデルは1日に２枠までとさせていただいております。',
      },
      {
        q: '予約確認メールが届かない場合はどうすればよいですか？',
        a: '迷惑メールフォルダをご確認ください。それでも届かない場合は公式LINEにてご連絡ください。',
      },
      {
        q: '予約受付開始やイベントの公開はいつですか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 6px' }}>予約受付は撮影日の<strong>2週間前の月曜 21:00〜</strong>開始いたします。</p>
            <p style={{ margin: 0 }}>イベントは予約受付開始の<strong>2日前まで</strong>に公開されます。</p>
          </div>
        ),
      },
      {
        q: '予約締め切りはいつですか？当日でも予約できますか？',
        a: '予約が開放していれば当日でも予約可能です。開催日前日の22時までにモデルの当日エントリーが確定するため、それまでにご予約いただければ確実です。',
      },
    ],
  },
  {
    category: '撮影について',
    items: [
      {
        q: 'ストリート撮影の集合場所はいつ分かりますか？',
        a: 'ご予約後すぐの確定メールにてご案内します。変更になる場合もメールにてお知らせします。',
      },
      {
        q: '集合場所へは何分前から入れますか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 6px' }}>撮影時間の<strong>10分前</strong>から受付を開始いたします。</p>
            <p style={{ margin: 0 }}>10〜20分前を目安に撮影場所へお越しください。</p>
          </div>
        ),
      },
      {
        q: '機材のレンタルはありますか？',
        a: '機材のご用意はイベント詳細に記載のない場合基本ございません。ご自身のカメラでご参加ください。',
      },
      {
        q: '撮影した写真の使用について制限はありますか？',
        a: 'ご自身の作品としてSNS等に使用いただけます。商用利用やコンテスト、写真展への出展の際はモデルへの事前連絡をお願いいたします。利用規約もご確認ください。',
      },
      {
        q: '天候不良の場合は中止になりますか？',
        a: '基本的に開催されます。中止の場合、開催日の朝8時頃にメールにてご連絡致します。',
      },
      {
        q: '撮影に関するルールはありますか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 14px' }}>当撮影会ご利用規約をご確認ください。</p>
            <Link href="/terms"
              style={{ display: 'inline-block', background: '#0d1f3a', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700 }}>
              ご利用規約を確認する →
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    category: '衣装について',
    items: [
      {
        q: '持ち込み衣装による撮影は可能ですか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 6px' }}>持ち込み衣装に関しましてご返却は不可となっております。</p>
            <p style={{ margin: 0 }}>ご利用規約をご理解いただきました上で当日受付にお渡しください。</p>
          </div>
        ),
      },
      {
        q: 'リクエスト衣装の購入は可能ですか？',
        a: 'モデルへ衣装購入のリクエストを行う場合、衣装代金分を当日現金にて受付にてお支払いいただくことで可能です。',
      },
      {
        q: '衣装の相談はどうすれば良いですか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 6px' }}>参加モデルが３コーデ持参いたしますので当日スタジオにて受付終了後その中から衣装をお選びいただいております。</p>
            <p style={{ margin: 0 }}>ご予約後X DMにてモデルにご連絡いただけましたら事前に衣装打ち合わせが可能になる場合もございます。</p>
          </div>
        ),
      },
    ],
  },
  {
    category: '料金・お支払いについて',
    items: [
      {
        q: '料金の支払いはいつ行いますか？',
        a: '事前のオンラインSquare決済または当日の撮影開始前に現金でお支払いいただきます。',
      },
      {
        q: '領収書の発行はできますか？',
        a: 'ご希望の方は公式LINEまたは当日口頭にてお伝えください。PDFにて発行いたします。',
      },
    ],
  },
  {
    category: 'モデル応募について',
    items: [
      {
        q: '審査にどのくらいかかりますか？',
        a: '通常3〜5営業日以内に採用の可能性のある方にご連絡致します。審査状況によって前後することや運営状況によりしばらく時間が経ってからお声がけすることもございます。',
      },
      {
        q: '報酬はいくらですか？',
        a: '撮影会の形式によって異なります。詳細は公式LINEにてお問い合わせください。',
      },
    ],
  },
  {
    category: 'お問い合わせ',
    items: [
      {
        q: '撮影会運営への連絡はどこからすれば良いですか？',
        node: (
          <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>
            <p style={{ margin: '0 0 14px' }}>X DM・メールへの返信は確認させていただくこともございますが、一律公式ラインまでご連絡よろしくお願いいたします。</p>
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#06C755', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700 }}>
              <LineIcon />
              📩 contactはこちら →
            </a>
          </div>
        ),
      },
    ],
  },
]

function FAQItem({ q, a, node }) {
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
        <div style={{ paddingBottom: 20 }}>
          {node || <div style={{ color: '#556070', lineHeight: 1.9, fontSize: 14 }}>A. {a}</div>}
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
          <p className="faq-hero-sub" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
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
                {section.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} node={item.node} />)}
              </div>
            </div>
          ))}

          <div style={{ background: 'linear-gradient(135deg, #f0f7fb, #fafcff)', borderRadius: 16, padding: '36px 32px', textAlign: 'center', border: '1px solid #c8e8f5' }}>
            <h3 style={{ ...serif, fontSize: 22, fontWeight: 400, color: '#0d1f3a', marginBottom: 10, marginTop: 0 }}>解決しない場合は</h3>
            <p style={{ color: '#556070', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>上記以外のご質問はLINEからお気軽にどうぞ。</p>
            <a
              href={LINE_URL}
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

      <style>{`
        @media (max-width: 640px) {
          .faq-hero-sub { font-size: clamp(9px, 2.3vw, 13px) !important; white-space: nowrap; }
        }
      `}</style>
    </div>
  )
}
