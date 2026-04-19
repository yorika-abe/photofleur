'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole(data?.role)
      }
    })
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
    { href: '/schedule', label: 'スケジュール' },
    { href: '/models', label: 'モデル一覧' },
    { href: '/blog', label: 'ブログ' },
    { href: '/request', label: 'リクエスト撮影' },
    { href: '/model-recruit', label: 'モデル募集' },
    { href: '/faq', label: 'FAQ' },
  ]

  return (
    <header style={{ background: '#2f2244', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 22, letterSpacing: '0.05em' }}>
          PhotoFleur
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }} className="desktop-nav">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              {link.label}
            </Link>
          ))}
          {user ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {role === 'admin' && (
                <Link href="/admin" style={{ color: '#f0c040', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>管理画面</Link>
              )}
              {role === 'model' && (
                <>
                  <Link href="/model-portal/shifts" style={{ color: '#a0d8ef', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>シフト提出</Link>
                  <Link href="/model-portal/blog" style={{ color: '#a0d8ef', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>ブログ</Link>
                </>
              )}
              <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
                ログアウト
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 500 }}>
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
          <span style={{ display: 'block', width: 22, height: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#fff' }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#3d2d5a', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }} className="mobile-menu">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 16 }}>
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              {role === 'admin' && <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ color: '#f0c040', textDecoration: 'none', fontSize: 16 }}>管理画面</Link>}
              {role === 'model' && <Link href="/model-portal/shifts" onClick={() => setMenuOpen(false)} style={{ color: '#a0d8ef', textDecoration: 'none', fontSize: 16 }}>シフト提出</Link>}
              {role === 'model' && <Link href="/model-portal/blog" onClick={() => setMenuOpen(false)} style={{ color: '#a0d8ef', textDecoration: 'none', fontSize: 16 }}>ブログ</Link>}
              <button onClick={handleLogout} style={{ background: 'none', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 16, padding: 0 }}>ログアウト</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 16 }}>ログイン</Link>
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
