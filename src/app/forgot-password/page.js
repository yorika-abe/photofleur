'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError('送信に失敗しました: ' + error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 12 }}>メールを送信しました</h2>
          <p style={{ color: '#666', lineHeight: 1.8, fontSize: 14 }}>
            {email} にパスワード変更の案内を送りました。<br />
            メール内のリンクをクリックして新しいパスワードを設定してください。
          </p>
          <Link href="/login" style={{ display: 'inline-block', marginTop: 24, color: '#1a3560', fontWeight: 600, fontSize: 14 }}>ログインページへ戻る</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', marginBottom: 8, textAlign: 'center' }}>パスワードをお忘れの方</h1>
      <p style={{ color: '#888', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>登録済みのメールアドレスを入力してください</p>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid #e5e5e5' }}>
        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>メールアドレス</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="example@email.com"
          />
        </div>
        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '送信中...' : 'パスワード変更メールを送る'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          <Link href="/login" style={{ color: '#888' }}>ログインページへ戻る</Link>
        </div>
      </form>
    </div>
  )
}
