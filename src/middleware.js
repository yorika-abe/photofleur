import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const needsAuth = path.startsWith('/admin') || path.startsWith('/model-portal') || path.startsWith('/staff-portal')
  if (!needsAuth) return supabaseResponse

  const redirectPath = path.startsWith('/admin') ? '/admin' : path.startsWith('/model-portal') ? '/model-portal' : '/staff-portal'
  if (!user) {
    return NextResponse.redirect(new URL(`/login?redirect=${redirectPath}`, request.url))
  }

  // DBクエリは1回だけ
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('roles, role')
    .eq('id', user.id)
    .single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])

  if (path.startsWith('/admin') && !roles.includes('admin')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (path.startsWith('/model-portal') && !roles.some(r => ['model', 'admin'].includes(r))) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (path.startsWith('/staff-portal') && !roles.some(r => ['staff', 'admin'].includes(r))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/model-portal/:path*', '/staff-portal/:path*'],
}
