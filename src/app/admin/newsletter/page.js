'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function NewsletterPage() {
  const [subscriberCount, setSubscriberCount] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    fetch('/api/admin/newsletter').then(r => r.json()).then(d => {
      if (d.count !== undefined) setSubscriberCount(d.count)
    })
  }, [])

  async function send() {
    setSending(true)
    setResult(null)
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    })
    const json = await res.json()
    setSending(false)
    setConfirmed(false)
    if (!res.ok) setResult({ error: json.error })
    else setResult({ ok: true, sent: json.sent, failed: json.failed, total: json.total })
  }

  const canSend = subject.trim() && body.trim() && subscriberCount > 0

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: '8px 0 8px' }}>📧 メルマガ配信</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>
        メルマガ同意済みのカメラマン：
        <strong style={{ color: subscriberCount === null ? '#aaa' : '#1a3560' }}>
          {subscriberCount === null ? '読み込み中...' : `${subscriberCount}名`}
        </strong>
      </p>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #d6ecf5', padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>件名</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="メールの件名"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>本文</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="メール本文を入力してください。改行はそのまま反映されます。"
            rows={12}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7 }}
          />
        </div>

        {!confirmed ? (
          <button
            onClick={() => setConfirmed(true)}
            disabled={!canSend}
            style={{ background: canSend ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed' }}>
            送信内容を確認する
          </button>
        ) : (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '16px 20px', marginTop: 4 }}>
            <p style={{ fontSize: 14, color: '#795548', margin: '0 0 12px', fontWeight: 600 }}>
              {subscriberCount}名に送信します。よろしいですか？
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={send}
                disabled={sending}
                style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
                {sending ? '送信中...' : '送信する'}
              </button>
              <button
                onClick={() => setConfirmed(false)}
                style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ffcdd2' : '#c8e6c9'}` }}>
            {result.error
              ? <p style={{ color: '#e53935', margin: 0, fontSize: 14 }}>エラー: {result.error}</p>
              : <p style={{ color: '#388e3c', margin: 0, fontSize: 14, fontWeight: 600 }}>
                  ✅ 送信完了：{result.sent}件成功 {result.failed > 0 && `/ ${result.failed}件失敗`}
                </p>
            }
          </div>
        )}
      </div>
    </div>
  )
}
