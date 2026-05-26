'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useCart } from '@/context/CartContext'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [chatUnread, setChatUnread] = useState(0)
  const pathname = usePathname()
  const { items, ready, openCart } = useCart()

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
        setChatUnread(0)
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => applyUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    // Initial unread count fetch
    const since = localStorage.getItem('chat_last_read') || ''
    const params = since ? `?since=${encodeURIComponent(since)}` : ''
    fetch(`/api/chat/unread${params}`)
      .then(r => r.json())
      .then(({ unread }) => setChatUnread(unread || 0))
      .catch(() => {})

    // Realtime broadcast subscription
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const channel = supabase
      .channel(`chat:${user.email}`)
      .on('broadcast', { event: 'new_message' }, () => {
        setChatUnread(prev => prev + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // Reset badge when user navigates to /chat
  useEffect(() => {
    if (pathname.startsWith('/chat')) {
      setChatUnread(0)
    }
  }, [pathname])

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
    { href: '/shop', label: 'ショップ' },
    { href: '/faq', label: 'FAQ' },
    { href: '/chat', label: '💬 chat' },
  ]

  function isActive(href) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, gap: 4 }}>
        <Link href="/" style={{ color: '#1a3560', textDecoration: 'none', fontWeight: 700, fontSize: 17, letterSpacing: '0.04em', flexShrink: 0 }}>
          PhotoFleur
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: 0, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }} className="desktop-nav">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: isActive(link.href) ? '#1a3560' : '#555',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive(link.href) ? 700 : 500,
                padding: '5px 7px',
                borderRadius: 5,
                whiteSpace: 'nowrap',
                background: isActive(link.href) ? 'rgba(26,53,96,0.07)' : 'transparent',
                borderBottom: isActive(link.href) ? '2px solid #1a3560' : '2px solid transparent',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {link.label}
              {link.href === '/chat' && chatUnread > 0 && (
                <span style={{ background: '#e53935', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </Link>
          ))}
          {ready && items.length > 0 && (
            <button onClick={openCart} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0, marginLeft: 4 }}>
              🛒 {items.length}
            </button>
          )}
          {user ? (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginLeft: 6, flexShrink: 0, flexWrap: 'nowrap' }}>
              {roles.includes('admin') && (
                <Link href="/admin" style={{
                  color: '#a07000', textDecoration: 'none', fontSize: 12, fontWeight: 600,
                  padding: '5px 7px', borderRadius: 5, whiteSpace: 'nowrap',
                  background: isActive('/admin') ? 'rgba(160,112,0,0.08)' : 'transparent',
                }}>管理画面</Link>
              )}
              {roles.includes('model') && (
                <Link href="/model-portal" style={{ color: '#c2185b', textDecoration: 'none', fontSize: 12, fontWeight: 600, padding: '5px 7px', borderRadius: 5, whiteSpace: 'nowrap', background: isActive('/model-portal') ? 'rgba(194,24,91,0.08)' : 'transparent' }}>モデフル</Link>
              )}
              {roles.includes('staff') && (
                <Link href="/staff-portal" style={{ color: '#0097a7', textDecoration: 'none', fontSize: 12, fontWeight: 600, padding: '5px 7px', borderRadius: 5, whiteSpace: 'nowrap', background: isActive('/staff-portal') ? 'rgba(0,151,167,0.08)' : 'transparent' }}>スタッフ画面</Link>
              )}
              {!roles.includes('admin') && !roles.includes('model') && !roles.includes('staff') && (
                <Link href="/my" style={{ color: '#1a7090', textDecoration: 'none', fontSize: 12, fontWeight: 600, padding: '5px 7px', whiteSpace: 'nowrap' }}>マイページ</Link>
              )}
              <button onClick={handleLogout} style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 11px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                ログアウト
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 500, marginLeft: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isActive(link.href) ? '▶ ' : ''}{link.label}
              {link.href === '/chat' && chatUnread > 0 && (
                <span style={{ background: '#e53935', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </Link>
          ))}
          {ready && items.length > 0 && (
            <button onClick={() => { setMenuOpen(false); openCart() }} style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 12px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
              🛒 カート ({items.length}件)
            </button>
          )}
          {user ? (
            <>
              {roles.includes('admin') && <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ color: '#a07000', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>管理画面</Link>}
              {roles.includes('model') && <Link href="/model-portal" onClick={() => setMenuOpen(false)} style={{ color: '#c2185b', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>モデフル</Link>}
              {roles.includes('staff') && <Link href="/staff-portal" onClick={() => setMenuOpen(false)} style={{ color: '#0097a7', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>スタッフ画面</Link>}
              {!roles.includes('admin') && !roles.includes('model') && !roles.includes('staff') && <Link href="/my" onClick={() => setMenuOpen(false)} style={{ color: '#1a7090', textDecoration: 'none', fontSize: 15, padding: '10px 12px' }}>マイページ</Link>}
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
