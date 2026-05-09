'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

function BlogContent() {
  const supabaseRef = useRef(null)
  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    }
    return supabaseRef.current
  }

  const searchParams = useSearchParams()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [authors, setAuthors] = useState([])
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '')
  const [activeAuthor, setActiveAuthor] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [sort, setSort] = useState('desc')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/blog/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
    loadAuthors()
  }, [])

  useEffect(() => { load() }, [activeCategory, activeAuthor, sort])

  async function loadAuthors() {
    const { data } = await getSupabase()
      .from('blog_posts')
      .select('author_id, user_profiles!author_id(name)')
      .eq('status', 'published')
    if (!data) return
    const seen = new Set()
    const unique = []
    for (const p of data) {
      if (p.author_id && !seen.has(p.author_id)) {
        seen.add(p.author_id)
        unique.push({ id: p.author_id, name: p.user_profiles?.name || p.author_id })
      }
    }
    setAuthors(unique)
  }

  async function load() {
    setLoading(true)
    let query = getSupabase()
      .from('blog_posts')
      .select('id, title, slug, cover_image, category, published_at, author_id, user_profiles!author_id(name)')
      .eq('status', 'published')
      .order('published_at', { ascending: sort === 'asc' })
    if (activeCategory) query = query.eq('category', activeCategory)
    if (activeAuthor) query = query.eq('author_id', activeAuthor)
    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  const filtered = searchTitle
    ? posts.filter(p => p.title?.toLowerCase().includes(searchTitle.toLowerCase()))
    : posts

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(32px,5vw,56px) 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Blog</p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 700, color: '#1a3560', margin: 0 }}>ブログ</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveCategory('')}
            style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: activeCategory === '' ? '#1a3560' : '#ddd', background: activeCategory === '' ? '#1a3560' : '#fff', color: activeCategory === '' ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            すべて
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.slug)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: activeCategory === cat.slug ? '#1a3560' : '#ddd', background: activeCategory === cat.slug ? '#1a3560' : '#fff', color: activeCategory === cat.slug ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {cat.name}
            </button>
          ))}
        </div>
        {/* Search + author + sort */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={searchTitle}
            onChange={e => setSearchTitle(e.target.value)}
            placeholder="タイトルで検索..."
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, minWidth: 200, outline: 'none' }}
          />
          {authors.length > 1 && (
            <select value={activeAuthor} onChange={e => setActiveAuthor(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', cursor: 'pointer' }}>
              <option value="">作者：すべて</option>
              {authors.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            <option value="desc">新しい順</option>
            <option value="asc">古い順</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : !filtered || filtered.length === 0 ? (
        <p style={{ color: '#999' }}>記事がありません。</p>
      ) : (
        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', padding: '8px 0 24px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.blog-scroll::-webkit-scrollbar{display:none}`}</style>
          {filtered.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', flexShrink: 0, width: 260 }}>
              <article style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #d6ecf5', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 180, background: '#e0d8f0', overflow: 'hidden', flexShrink: 0 }}>
                  {post.cover_image
                    ? <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>✍️</div>
                  }
                </div>
                <div style={{ padding: '14px 16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {post.category && (
                    <span style={{ fontSize: 11, background: '#e8f5e9', color: '#388e3c', borderRadius: 4, padding: '2px 7px', alignSelf: 'flex-start', fontWeight: 600 }}>
                      {categories.find(c => c.slug === post.category)?.name || post.category}
                    </span>
                  )}
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', margin: 0, lineHeight: 1.5 }}>{post.title}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {post.user_profiles?.name && (
                      <span style={{ fontSize: 11, color: '#888' }}>{post.user_profiles.name}</span>
                    )}
                    {post.published_at && (
                      <span style={{ fontSize: 11, color: '#aaa' }}>
                        {new Date(post.published_at).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#999' }}>読み込み中...</div>}>
      <BlogContent />
    </Suspense>
  )
}
