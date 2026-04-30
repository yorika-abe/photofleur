'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    async function applyUser(user) {
      setUser(user ?? null)
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('roles, role')
          .eq('id', user.id)
          .single()
        const r = data?.roles?.length > 0 ? data.roles : (data?.role ? [data.role] : [])
        setRoles(r)
      } else {
        setRoles([])
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => applyUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/schedule', label: 'スケジュール' },
    { href: '/models', label: 'モデル一覧' },
    { href: '/blog', label: 'ブログ' },
    { href: '/request', label: 'リクエスト撮影' },
    { href: '/model-recruit', label: 'モデル募集' },
    { href: '/faq', label: 'FAQ' },
  ]

  function isActive(href) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/" style={{ color: '#1a3560', textDecoration: 'none', fontWeight: 700, fontSize: 22, letterSpacing: '0.05em' }}>
          PhotoFleur
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: 2, alignItems: 'center' }} className="desktop-nav">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: isActive(link.href) ? '#1a3560' : '#555',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive(link.href) ? 700 : 500,
                padding: '6px 10px',
                borderRadius: 6,
                background: isActive(link.href) ? 'rgba(26,53,96,0.07)' : 'transparent',
                borderBottom: isActive(link.href) ? '2px solid #1a3560' : '2px solid transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
              {roles.includes('admin') && (
                <Link href="/admin" style={{
                  color: '#a07000', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  padding: '6px 10px', borderRadius: 6,
                  background: isActive('/admin') ? 'rgba(160,112,0,0.08)' : 'transparent',
                }}>管理画面</Link>
              )}
              {roles.includes('model') && (
                <Link href="/model-portal" style={{ color: '#1a7090', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 6, background: isActive('/model-portal') ? 'rgba(26,112,144,0.08)' : 'transparent' }}>モデル画面</Link>
              )}
              {!roles.includes('admin') && !roles.includes('model') && (
                <Link href="/my" style={{ color: '#1a7090', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 10px' }}>マイページ</Link>
              )}
              <button onClick={handleLogout} style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
                ログアウト
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 500, marginLeft: 8 }}>
              ログイン
            </Link>
          )}
        </nav>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', flexDirection: 'column', gap: 5, padding: 8 }}
          aria-label="メニュー"
        >
          <span style={{ display: 'block', width: 22, height: 2, background: '#1a3560' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#1a3560' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#1a3560' }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #eee', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }} className="mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                color: isActive(link.href) ? '#1a3560' : '#444',
                textDecoration: 'none',
                fontSize: 15,
                padding: '10px 12px',
                borderRadius: 8,
                background: isActive(link.href) ? 'rgba(26,53,96,0.07)' : 'transparent',
                fontWeight: isActive(link.href) ? 700 : 400,
              }}
            >
              {isActive(link.href) ? '▶ ' : ''}{link.label}
            </Link>
          ))}
          {user ? (
            <>
              {roles.includes('admin') && <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ color: '#a07000', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>管理画面</Link>}
              {roles.includes('model') && <Link href="/model-portal" onClick={() => setMenuOpen(false)} style={{ color: '#1a7090', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>モデル画面</Link>}
              {!roles.includes('admin') && !roles.includes('model') && <Link href="/my" onClick={() => setMenuOpen(false)} style={{ color: '#1a7090', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>マイページ</Link>}
              <button onClick={handleLogout} style={{ background: 'none', color: '#888', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 15, padding: '10px 12px' }}>ログアウト</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: '#1a3560', textDecoration: 'none', fontSize: 15, padding: '10px 12px', fontWeight: 600 }}>ログイン</Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
