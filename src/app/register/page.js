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
      if (signUpError.message.includes('already')) {
        router.push(`/login?notice=already_registered&email=${encodeURIComponent(email)}`)
        return
      }
      setError(`登録に失敗しました: ${signUpError.message}`)
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
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', marginBottom: 24, textAlign: 'center' }}>新規登録</h1>

      {/* LINE Login */}
      <a
        href="/api/auth/line?next=/my"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#06C755', color: '#fff', textDecoration: 'none',
          borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 700,
          marginBottom: 16, boxShadow: '0 2px 8px rgba(6,199,85,0.3)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
        LINEで登録・ログイン
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
        <span style={{ fontSize: 12, color: '#aaa' }}>またはメールアドレスで</span>
        <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
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
