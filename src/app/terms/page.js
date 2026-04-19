export const metadata = { title: '利用規約 | PhotoFleur' }

export default function TermsPage() {
  const sections = [
    {
      title: '第1条（適用）',
      content: '本規約は、PhotoFleur（以下「当サービス」）が提供する撮影会予約サービスの利用に関する条件を定めるものです。ユーザーは本規約に同意した上でサービスをご利用ください。',
    },
    {
      title: '第2条（利用登録）',
      content: 'サービスの一部機能はアカウント登録が必要です。登録に際して虚偽の情報を提供することを禁止します。未成年者は保護者の同意のもとでご利用ください。',
    },
    {
      title: '第3条（予約・キャンセル）',
      content: '予約は先着順で確定します。キャンセルは撮影日の3日前までに連絡する場合は無料です。3日前以降のキャンセルはキャンセル料（参加費の50%）が発生します。当日のキャンセル・無断欠席は参加費の全額をご請求します。',
    },
    {
      title: '第4条（撮影物の取り扱い）',
      content: '撮影した写真はご自身の作品として個人利用・SNS掲載が可能です。商用利用（販売・広告・出版など）には別途モデルおよび運営の許諾が必要です。モデルの尊厳を損なう利用、差別的・性的な利用は固く禁止します。',
    },
    {
      title: '第5条（禁止事項）',
      content: '以下の行為を禁止します：①他のユーザー・モデル・スタッフへのハラスメント行為、②承諾なく個人情報を収集・公開する行為、③当サービスを介した違法な取引、④虚偽の予約・なりすまし、⑤サービスの運営を妨害する行為。',
    },
    {
      title: '第6条（モデルに関する規定）',
      content: 'モデルとしての参加には審査があります。承認されたモデルはプロとしての振る舞いを求めます。シフトの無断欠席・遅刻は厳禁です。問題行為があった場合は活動停止・登録抹消の措置を取ることがあります。',
    },
    {
      title: '第7条（個人情報）',
      content: 'ご提供いただいた個人情報はサービス運営のみに使用し、第三者への提供は原則行いません。詳細はプライバシーポリシーをご確認ください。',
    },
    {
      title: '第8条（免責事項）',
      content: '当サービスは天候・機材トラブル等の不可抗力により撮影会を中止する場合があります。その場合は代替日の設定またはキャンセルを行います。当サービスはユーザー間のトラブルについて一切の責任を負いません。',
    },
    {
      title: '第9条（規約の変更）',
      content: '当サービスは必要に応じて本規約を変更することがあります。変更後のサービス利用をもって改定に同意したものとみなします。',
    },
  ]

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>利用規約</h1>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 48 }}>最終更新日：2024年1月1日</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {sections.map(s => (
          <div key={s.title}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>{s.title}</h2>
            <p style={{ color: '#555', lineHeight: 1.9, fontSize: 15, margin: 0 }}>{s.content}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, padding: '24px', background: '#f8f5ff', borderRadius: 12, border: '1px solid #e0d5f5' }}>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          ご不明な点がある場合は、LINEまたはメールにてお問い合わせください。
        </p>
      </div>
    </div>
  )
}
