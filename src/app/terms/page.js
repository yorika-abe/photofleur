export const metadata = { title: '利用規約 | PhotoFleur' }

const sections = [
  {
    title: '撮影した写真について',
    items: [
      '撮影会で撮影した写真の肖像権は、モデル本人及び弊社撮影会にございます。',
      '弊社撮影会で撮影した写真の商業利用は一切禁止させていただきます。',
    ],
  },
  {
    title: 'キャンセルポリシー',
    lead: 'キャンセルは公式LINEにてご連絡ください。',
    items: [
      'ご予約完了後：キャンセル料30%',
      '撮影７日前：キャンセル料50%',
      '撮影3日前：キャンセル料100%',
    ],
  },
  {
    title: 'スタジオ、小道具',
    items: [
      '撮影中に発生する料金はカメラマンさんにご負担お願いしております。',
      'スタジオ備品の破損があった場合修理代をお支払いいただきます。破損した場合速やかに運営にお知らせください。',
    ],
  },
  {
    title: 'その他',
    items: [
      '所属モデルに撮影と関係のない連絡はしないようお願いいたします。',
      'モデルの個人情報を聞き出す行為はご遠慮願います。',
      '撮影前後モデルを待ち伏せしないでください。',
      '受付時に身分証のご提示をお願いしております。',
      '撮影時間外に、モデルを個人のカメラで撮影する行為はお断りしております。',
    ],
  },
  {
    title: '撮影に関する禁止事項',
    items: [
      'モデルへ直接触れる行為',
      '無理なポージング・過度な露出の強要',
      '許可のない撮影時間内の飲食店利用',
      '打ち合わせのない衣装持ち込み',
      'ローアングルからの撮影',
      '動画の撮影（機材を問わず禁止）',
      'スマホ、コンパクトカメラでの撮影',
      '車や公共交通機関を使った移動',
      '野外撮影時にモデルと閉鎖空間、密室に入る行為',
      '野外撮影時モデルとショッピングモールへの立入り、及びショッピングモール内での撮影',
    ],
    footer: '万が一確認された場合は、撮影の中止または今後のご利用をお断りする場合がございます。あらかじめご了承ください。',
  },
  {
    title: '衣装に関して',
    items: [
      'スタジオ撮影では当日モデルが提示するいくつかの衣装の中から選んでいただきます。',
      '衣装に指定のある場合は事前にモデルへ連絡を入れるようお願いいたします。',
      '衣装の持ち込みに関しては前日までにモデルの同意を得て当日運営にお渡しください。持ち込み衣装は返却致しかねます。',
    ],
  },
  {
    title: '撮影会都合のキャンセル、変更',
    items: [
      '天候やモデルの体調不良により当日に撮影の変更をお願いする可能性がございます。その場合全額の返金と別日にて優先的に予約を受け付けさせていただきます。',
    ],
  },
  {
    title: '休憩時間の設定について',
    lead: '撮影の安全性およびパフォーマンス維持の観点から、モデルには定期的に休憩時間を設けております。',
    items: [
      '原則として、60分の撮影につき15分の休憩を実施いたします。',
      '休憩時間中は撮影行為・ポーズ指定・接触を伴う指示等はご遠慮ください。',
      '本ルールは全ての撮影に適用されますので、あらかじめご了承ください。',
    ],
    highlights: ['60分の撮影につき15分の休憩'],
  },
  {
    title: '移動・解散時のルールについて',
    lead: '個人情報保護およびモデルの安全確保のため、撮影終了後は現地にて解散といたします。',
    items: [
      'モデルと同じ方面へ移動される場合であっても、改札内への同行・同乗（同じ電車への乗車）はご遠慮ください。',
    ],
    highlights: ['改札内への同行・同乗（同じ電車への乗車）はご遠慮ください。'],
  },
]

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>利用規約</h1>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 48 }}>PhotoFleur 撮影会をご利用いただく際のルールです。ご予約前に必ずお読みください。</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {sections.map(s => (
          <div key={s.title} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', border: '1px solid #e5e5e5' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginTop: 0, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #f0ecfa' }}>
              {s.title}
            </h2>
            {s.lead && (
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, marginBottom: 12, marginTop: 0 }}>{s.lead}</p>
            )}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s.items.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#444', lineHeight: 1.8 }}>
                  <span style={{ color: '#5bbfd6', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>・</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {s.footer && (
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.8, marginBottom: 0, marginTop: 14, padding: '10px 14px', background: '#fdf8ff', borderRadius: 8 }}>{s.footer}</p>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, padding: '20px 24px', background: '#f8f5ff', borderRadius: 12, border: '1px solid #e0d5f5' }}>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          ご不明な点がある場合は、LINEまたはメールにてお問い合わせください。
        </p>
      </div>
    </div>
  )
}
