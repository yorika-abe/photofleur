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
  const lineError = searchParams.get('error')?.startsWith('line_')

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
        setError('invalid_credentials')
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
        const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', data.user.id).single()
        const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
        if (roles.includes('admin')) {
          router.push('/admin')
        } else if (roles.includes('model')) {
          router.push('/model-portal')
        } else {
          router.push('/my')
        }
      }
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', marginBottom: 8, textAlign: 'center' }}>ログイン</h1>
      <p style={{ color: '#666', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>PhotoFleurアカウントでログイン</p>

      {lineError && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#5d4037', lineHeight: 1.7 }}>
          異なるログイン方法でご登録いただいているか会員情報がありません。<br />
          別のログイン方法でのログインもしくは新規会員登録をお願いいたします。
        </div>
      )}

      {/* LINE Login */}
      <a
        href={`/api/auth/line?next=${encodeURIComponent(redirect)}`}
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
        LINEでログイン
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
        <span style={{ fontSize: 12, color: '#aaa' }}>またはメールアドレスで</span>
        <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
      </div>

      <form onSubmit={handleLogin} style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid #e5e5e5' }}>
        {isAlreadyRegistered && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#388e3c', fontSize: 14 }}>
            このメールアドレスは既に登録されています。パスワードを入力してログインしてください。
          </div>
        )}
        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
            {error === 'invalid_credentials' ? (
              <>メールアドレスまたはパスワードが正しくありません。アカウントをお持ちでない場合は<Link href="/register" style={{ color: '#c0392b', fontWeight: 700, textDecoration: 'underline' }}>新規登録</Link>してください。</>
            ) : error}
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
