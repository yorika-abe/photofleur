'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Suspense } from 'react'

function LineCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/my'

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    async function establish() {
      // @supabase/ssr uses cookies, not localStorage — must manually parse #access_token from hash
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (data.session) {
          router.push(next)
          router.refresh()
          return
        }
      }

      // Fallback: check if already has a session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(next)
        router.refresh()
        return
      }

      router.push('/login?error=line_session_failed')
    }

    establish()
  }, [])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔐</div>
      <div style={{ fontSize: 16, color: '#666' }}>LINEログイン処理中...</div>
    </div>
  )
}

export default function LineCompletePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>ログイン中...</div>}>
      <LineCompleteContent />
    </Suspense>
  )
}
