'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const days = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export default function ActivityReportsAdminPage() {
  const [reports, setReports] = useState(null)

  useEffect(() => {
    fetch('/api/admin/activity-reports')
      .then(r => r.json())
      .then(data => {
        setReports(data)
        // 未読を既読にマーク
        if (data.some(r => !r.is_read)) {
          fetch('/api/admin/activity-reports', { method: 'PATCH' })
        }
      })
  }, [])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 32px' }}>外部活動報告</h1>

      {reports === null ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 60 }}>読み込み中...</div>
      ) : reports.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 60 }}>報告はまだありません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => (
            <div key={r.id} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              border: `1px solid ${r.is_read ? '#e5e5e5' : '#90caf9'}`,
              borderLeft: `4px solid ${r.is_read ? '#ddd' : '#1976d2'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8f4fb', overflow: 'hidden', flexShrink: 0 }}>
                  {r.models?.image
                    ? <img src={r.models.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0d1f3a' }}>{r.models?.name || '不明'}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{formatDate(r.report_date)}</div>
                </div>
                {!r.is_read && (
                  <span style={{ marginLeft: 'auto', background: '#1976d2', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>NEW</span>
                )}
              </div>
              <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', paddingLeft: 48 }}>{r.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
