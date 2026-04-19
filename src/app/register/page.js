'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  async function handleRegister(e) {
    e.preventDefault()
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください。')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (signUpError) {
      setError(signUpError.message.includes('already') ? 'このメールアドレスは既に登録されています。' : '登録に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        role: 'photographer',
        name,
        email,
      })
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>確認メールを送信しました</h2>
          <p style={{ color: '#666', lineHeight: 1.8, fontSize: 15 }}>
            {email} に確認メールを送信しました。<br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link href="/login" style={{ display: 'inline-block', marginTop: 24, color: '#2f2244', fontWeight: 600 }}>ログインページへ</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2f2244', marginBottom: 8, textAlign: 'center' }}>新規登録</h1>
      <p style={{ color: '#666', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>カメラマンとして登録</p>

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
            placeholder="山田 太郎" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>メールアドレス</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="example@email.com" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>パスワード（8文字以上）</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="••••••••" />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '登録中...' : 'アカウント作成'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          <span style={{ color: '#666' }}>既にアカウントをお持ちの方は</span>{' '}
          <Link href="/login" style={{ color: '#2f2244', fontWeight: 600 }}>ログイン</Link>
        </div>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 16, lineHeight: 1.6 }}>
        登録することで<Link href="/terms" style={{ color: '#666' }}>利用規約</Link>に同意したことになります。
      </p>
    </div>
  )
}
