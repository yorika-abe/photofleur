'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function ModelRegisterForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#c62828' }}>無効なリンクです</h2>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.8 }}>このページにアクセスするには、運営から送られた招待リンクが必要です。</p>
        </div>
      </div>
    )
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/model-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, token }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '登録に失敗しました')
      setLoading(false)
      return
    }

    // Sign in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('登録完了しました。ログインページからログインしてください。')
      setLoading(false)
      return
    }

    router.push('/model-portal/onboarding')
  }

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌸</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: 0 }}>PhotoFleur モデル登録</h1>
        <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>招待リンクからのモデル会員登録</p>
      </div>

      <form onSubmit={handleRegister} style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid #e5e5e5' }}>
        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>お名前</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="山田 花子" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>メールアドレス</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="example@email.com" />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>パスワード（8文字以上）</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="••••••••" />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '登録中...' : 'モデル登録する'}
        </button>
      </form>
    </div>
  )
}

export default function ModelRegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>}>
      <ModelRegisterForm />
    </Suspense>
  )
}
