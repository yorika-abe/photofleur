import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const metadata = { title: 'ブログ | PhotoFleur' }

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, cover_image, published_at, author_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(32px,5vw,56px) 20px' }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Blog</p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 700, color: '#1a3560', margin: 0 }}>ブログ</h1>
      </div>

      {!posts || posts.length === 0 ? (
        <p style={{ color: '#999' }}>まだ記事がありません。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #d6ecf5', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 180, background: '#e0d8f0', overflow: 'hidden', flexShrink: 0 }}>
                  {post.cover_image
                    ? <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>✍️</div>
                  }
                </div>
                <div style={{ padding: '16px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', margin: 0, lineHeight: 1.5 }}>{post.title}</h2>
                  {post.published_at && (
                    <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
                      {new Date(post.published_at).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
