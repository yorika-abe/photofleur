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

  // Admin routes require admin role
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('roles, role')
      .eq('id', user.id)
      .single()
    const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
    if (!roles.includes('admin')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Model portal requires model role
  if (path.startsWith('/model-portal')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/model-portal', request.url))
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('roles, role')
      .eq('id', user.id)
      .single()
    const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
    if (!roles.some(r => ['model', 'admin'].includes(r))) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Staff portal requires staff or admin role
  if (path.startsWith('/staff-portal')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/staff-portal', request.url))
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('roles, role')
      .eq('id', user.id)
      .single()
    const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
    if (!roles.some(r => ['staff', 'admin'].includes(r))) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/model-portal/:path*', '/staff-portal/:path*'],
}
