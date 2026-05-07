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

    // getSession() detects #access_token in the URL hash and establishes a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(next)
        router.refresh()
        return
      }

      // Wait for auth state change in case it takes a moment
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          router.push(next)
          router.refresh()
        }
      })

      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        router.push('/login?error=line_session_failed')
      }, 6000)

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    })
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
