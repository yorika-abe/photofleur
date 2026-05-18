'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

function StaffRegisterForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const router = useRouter()

  const [mode, setMode] = useState('existing') // 'new' | 'existing'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

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

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/staff-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, name, email, password, token }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '登録に失敗しました')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInError) {
      router.push('/staff-portal/guide')
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560' }}>スタッフ権限を追加しました</h2>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.8 }}>
            {mode === 'existing'
              ? `${email} のアカウントにスタッフ権限を付与しました。ログインしてスタッフポータルにアクセスしてください。`
              : '登録が完了しました。ログインしてスタッフポータルにアクセスしてください。'}
          </p>
          <Link href="/login" style={{ display: 'inline-block', marginTop: 16, background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 15 }}>
            ログインする
          </Link>
        </div>
      </div>
    )
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontWeight: 700, fontSize: 14,
    background: active ? '#1a3560' : '#f0f0f0',
    color: active ? '#fff' : '#666',
  })

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🐈‍⬛</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: 0 }}>PhotoFleur スタッフ登録</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>招待リンクからのスタッフ登録</p>
      </div>

      {/* モード切替 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f5f5f5', padding: 6, borderRadius: 10 }}>
        <button style={tabStyle(mode === 'new')} onClick={() => { setMode('new'); setError('') }}>
          新規アカウント作成
        </button>
        <button style={tabStyle(mode === 'existing')} onClick={() => { setMode('existing'); setError('') }}>
          既存アカウントに追加
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #e5e5e5' }}>
        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}

        {mode === 'existing' && (
          <div style={{ background: '#e8f4fb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1565c0', lineHeight: 1.7 }}>
            すでにモデルやカメラマンとして登録済みの場合は、そのアカウントのメールアドレスとパスワードを入力してください。スタッフ権限が追加されます。
          </div>
        )}

        {mode === 'new' && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#333' }}>お名前</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              style={{ width: '100%', padding: '11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
              placeholder="山田 太郎" />
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#333' }}>メールアドレス</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="example@email.com" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#333' }}>
            {mode === 'new' ? 'パスワード（8文字以上）' : '現在のパスワード'}
          </label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'new' ? 8 : 1}
            style={{ width: '100%', padding: '11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="••••••••" />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '処理中...' : mode === 'new' ? 'スタッフ登録する' : 'スタッフ権限を追加する'}
        </button>
      </form>
    </div>
  )
}

export default function StaffRegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>}>
      <StaffRegisterForm />
    </Suspense>
  )
}
