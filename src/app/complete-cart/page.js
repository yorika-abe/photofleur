'use client'
import Link from 'next/link'

export default function CompleteCartPage() {
  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', marginBottom: 12 }}>ご予約ありがとうございます</h1>
      <p style={{ color: '#666', lineHeight: 1.8, marginBottom: 8, fontSize: 15 }}>
        ご登録のメールアドレスに確認メールをお送りしました。
      </p>
      <p style={{ color: '#666', lineHeight: 1.8, marginBottom: 32, fontSize: 14 }}>
        当日、スタッフまでお声がけください。
      </p>
      <Link href="/schedule"
        style={{ display: 'inline-block', background: '#1a3560', color: '#fff', textDecoration: 'none', padding: '13px 36px', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
        スケジュールに戻る
      </Link>
    </div>
  )
}
