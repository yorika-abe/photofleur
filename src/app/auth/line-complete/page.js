'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Suspense } from 'react'

function LineCompleteContent() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    async function establish() {
      // @supabase/ssr uses cookies — manually parse #access_token from URL hash
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (data.session) {
          await redirectByRole(supabase, data.session.user.id)
          return
        }
      }

      // Fallback: check existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await redirectByRole(supabase, session.user.id)
        return
      }

      router.push('/login?error=line_session_failed')
    }

    async function redirectByRole(supabase, userId) {
      const afterLogin = document.cookie.split('; ').find(r => r.startsWith('line_after_login='))?.split('=')[1]
      if (afterLogin) {
        document.cookie = 'line_after_login=; Path=/; Max-Age=0'
        router.push(decodeURIComponent(afterLogin))
        router.refresh()
        return
      }
      const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', userId).single()
      const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
      if (roles.includes('admin')) {
        router.push('/admin')
      } else if (roles.includes('model')) {
        router.push('/model-portal')
      } else {
        router.push('/my')
      }
      router.refresh()
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
