export const metadata = { title: '特定商取引法に基づく表記 | PhotoFleur' }

export default function TokushohoPage() {
  const items = [
    { label: '事業者名', value: 'PhotoFleur' },
    { label: '運営責任者', value: '阿部依花' },
    { label: 'メールアドレス', value: 'yorika.photo@gmail.com' },
    { label: 'サービス名', value: 'PhotoFleur 撮影会予約サービスならびにイベントの運用' },
    { label: '販売価格', value: '各撮影会の予約ページに記載の金額（税込）' },
    { label: '支払い方法', value: '当日現金払い / Square（クレジットカード）' },
    { label: '支払い時期', value: '当日撮影開始前にお支払いいただきます' },
    { label: 'サービス提供時期', value: '予約確定後、指定の日時・場所にて撮影会を開催' },
    { label: '返品・キャンセルポリシー', value: 'ご予約確定後：キャンセル料30%\n撮影7日前：キャンセル料50%\n撮影3日前：キャンセル料100%\n※天候不良等運営都合のキャンセルは全額返金します' },
    { label: '特記事項', value: '撮影会は各回定員制のため、予約が確定した時点でキャンセル待ちとなる場合があります。' },
  ]

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>特定商取引法に基づく表記</h1>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 48 }}>最終更新日：2026年5月7日</p>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
        {items.map((item, i) => (
          <div key={item.label} style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            borderBottom: i < items.length - 1 ? '1px solid #eee' : 'none',
          }}>
            <div style={{ padding: '18px 24px', background: '#f8f5ff', fontWeight: 600, color: '#2f2244', fontSize: 14, borderRight: '1px solid #eee' }}>
              {item.label}
            </div>
            <div style={{ padding: '18px 24px', color: '#444', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: '20px 24px', background: '#f8f5ff', borderRadius: 12, border: '1px solid #e0d5f5' }}>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          ご不明な点はお問い合わせチャットにてお問い合わせください。
        </p>
      </div>
    </div>
  )
}
