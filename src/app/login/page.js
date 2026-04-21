'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect') || '/'
  const isAlreadyRegistered = searchParams.get('notice') === 'already_registered'
  const noticeEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(noticeEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrorType(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message || ''
      if (msg.includes('Email not confirmed')) {
        setErrorType('unconfirmed')
        setError('メールアドレスの確認が完了していません。登録時に届いたメールのリンクをクリックしてください。')
      } else if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setErrorType('invalid')
        setError('メールアドレスまたはパスワードが正しくありません。アカウントをお持ちでない場合は新規登録してください。')
      } else {
        setErrorType('invalid')
        setError('ログインに失敗しました: ' + msg)
      }
      setLoading(false)
    } else {
      // redirectパラメータがあればそこへ、なければロールに応じて振り分け
      if (redirect !== '/') {
        router.push(redirect)
      } else {
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', data.user.id).single()
        if (profile?.role === 'admin') {
          router.push('/admin')
        } else if (profile?.role === 'model') {
          router.push('/model-portal')
        } else {
          router.push('/')
        }
      }
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', marginBottom: 8, textAlign: 'center' }}>ログイン</h1>
      <p style={{ color: '#666', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>PhotoFleurアカウントでログイン</p>

      <form onSubmit={handleLogin} style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid #e5e5e5' }}>
        {isAlreadyRegistered && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#388e3c', fontSize: 14 }}>
            このメールアドレスは既に登録されています。パスワードを入力してログインしてください。
          </div>
        )}
        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="example@email.com"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
          <Link href="/forgot-password" style={{ color: '#888' }}>パスワードをお忘れの方はこちら</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
          <span style={{ color: '#666' }}>アカウントをお持ちでない方は</span>{' '}
          <Link href="/register" style={{ color: '#1a3560', fontWeight: 600 }}>新規登録</Link>
        </div>
      </form>

      {errorType === 'invalid' && (
        <div style={{ background: '#f0f7fb', border: '2px solid #1a3560', borderRadius: 14, padding: '20px 24px', marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>👤</div>
          <div style={{ fontWeight: 700, color: '#1a3560', marginBottom: 6, fontSize: 15 }}>アカウントをお持ちでないですか？</div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 14 }}>初めての方は無料で新規登録できます</div>
          <Link href="/register" style={{ display: 'inline-block', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 15 }}>
            新規登録はこちら →
          </Link>
        </div>
      )}

      {errorType === 'unconfirmed' && (
        <div style={{ background: '#fff8e1', border: '2px solid #f0c040', borderRadius: 14, padding: '20px 24px', marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>📧</div>
          <div style={{ fontWeight: 700, color: '#795548', marginBottom: 6, fontSize: 15 }}>メール確認が必要です</div>
          <div style={{ color: '#666', fontSize: 13 }}>登録時に送信されたメールを開き、確認リンクをクリックしてからログインしてください。</div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
