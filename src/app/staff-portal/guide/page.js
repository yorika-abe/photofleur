import Link from 'next/link'

export default function StaffGuidePage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/staff-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← スタッフ画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 8px' }}>スタッフ活動の手引き</h1>
      <p style={{ color: '#aaa', fontSize: 13 }}>準備中です。</p>
    </div>
  )
}
