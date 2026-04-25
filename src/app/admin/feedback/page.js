'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'


export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/feedback')
    const data = await res.json()
    setFeedbacks(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function markRead(id, is_read) {
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_read }),
    })
    setFeedbacks(f => f.map(x => x.id === id ? { ...x, is_read } : x))
  }

  async function markAllRead() {
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all_read: true }),
    })
    setFeedbacks(f => f.map(x => ({ ...x, is_read: true })))
  }

  const unread = (feedbacks || []).filter(f => !f.is_read).length

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>
          📮 ご意見箱
          {unread > 0 && <span style={{ marginLeft: 10, background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 14, fontWeight: 700 }}>{unread}</span>}
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {unread > 0 && (
            <button onClick={markAllRead}
              style={{ fontSize: 13, color: '#fff', background: '#1a3560', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 600, cursor: 'pointer' }}>
              まとめて既読にする
            </button>
          )}
          <a href="/feedback" target="_blank"
            style={{ fontSize: 13, color: '#1a3560', textDecoration: 'none', border: '1px solid #1a3560', borderRadius: 8, padding: '7px 14px', fontWeight: 600 }}>
            入力画面を確認 →
          </a>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 24px' }}>カメラマンから送られたご意見・ご感想一覧</p>

      {feedbacks.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center', border: '1px solid #e5e5e5' }}>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>まだご意見はありません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.map(fb => (
            <div key={fb.id} style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: `1px solid ${fb.is_read ? '#e5e5e5' : '#5bbfd6'}`, position: 'relative' }}>
              {!fb.is_read && (
                <span style={{ position: 'absolute', top: 14, right: 14, background: '#5bbfd6', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>NEW</span>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                    {fb.sns_url
                      ? <a href={fb.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#5bbfd6', textDecoration: 'none', fontWeight: 600 }}>{fb.sns_url}</a>
                      : (fb.user_email || '不明')
                    }
                    {' '}・ {new Date(fb.created_at).toLocaleString('ja-JP')}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: '#333', margin: 0, whiteSpace: 'pre-wrap' }}>{fb.content}</p>
                </div>
              </div>
              <button
                onClick={() => markRead(fb.id, !fb.is_read)}
                style={{ fontSize: 12, color: fb.is_read ? '#aaa' : '#1a3560', background: 'none', border: `1px solid ${fb.is_read ? '#ddd' : '#1a3560'}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                {fb.is_read ? '未読に戻す' : '既読にする'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
