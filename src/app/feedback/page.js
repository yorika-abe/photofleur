'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true)
  const [, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login?redirect=/feedback'; return }
      setUser(user)
      setLoading(false)
    })
  }, [])

  async function submit() {
    if (!content.trim()) return
    setSending(true)
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setSending(false)
    if (res.ok) { setDone(true); setContent('') }
    else alert('送信に失敗しました。再度お試しください。')
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ background: '#fafcff', minHeight: '100vh', padding: 'clamp(40px,6vw,80px) 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Feedback</p>
          <h1 style={{ ...serif, fontSize: 'clamp(28px,5vw,40px)', fontWeight: 300, color: '#0d1f3a', margin: '0 0 20px' }}>ご意見箱</h1>
          <div style={{ width: 40, height: 1, background: '#c8e8f5', margin: '0 auto' }} />
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(24px,5vw,40px)', border: '1px solid #d6ecf5', boxShadow: '0 4px 24px rgba(13,31,58,0.06)' }}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#444', margin: '0 0 28px' }}>
            本日はPhotoFleurにお越しいただきありがとうございました。<br /><br />
            下記のようなご意見がございましたら、ぜひお聞かせください。
          </p>
          <ul style={{ fontSize: 14, lineHeight: 2.2, color: '#555', paddingLeft: 20, margin: '0 0 28px' }}>
            <li>PhotoFleurで開催したいイベント</li>
            <li>おすすめの撮影場所</li>
            <li>撮影会のシステム的な問題・改善点</li>
            <li>その他ご意見</li>
          </ul>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 20px' }}>
            ※送信専用ですので、返答が必要なものは公式LINEよりお願いいたします。
          </p>

          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📮</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', margin: '0 0 8px' }}>ご意見を受け付けました</p>
              <p style={{ fontSize: 14, color: '#888' }}>ありがとうございました。</p>
              <button onClick={() => setDone(false)}
                style={{ marginTop: 20, background: 'none', border: '1px solid #5bbfd6', color: '#5bbfd6', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
                続けて送信する
              </button>
            </div>
          ) : (
            <>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#0d1f3a', marginBottom: 10 }}>ご意見・ご感想</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="ご自由にお書きください..."
                rows={7}
                style={{ width: '100%', padding: '14px', border: '1px solid #d6ecf5', borderRadius: 10, fontSize: 14, lineHeight: 1.8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
              <button
                onClick={submit}
                disabled={sending || !content.trim()}
                style={{ marginTop: 16, width: '100%', background: content.trim() ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: content.trim() ? 'pointer' : 'default' }}>
                {sending ? '送信中...' : '送信する'}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#aaa' }}>
          Photo Fleur運営
        </p>
      </div>
    </div>
  )
}
