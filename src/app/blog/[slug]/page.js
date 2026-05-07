import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/ogp'

export async function generateMetadata({ params }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { slug } = await params
  const { data } = await supabase.from('blog_posts').select('title, cover_image').eq('slug', slug).single()
  return buildMetadata({
    title: data?.title ? `${data.title} | PhotoFleur Blog` : 'ブログ | PhotoFleur',
    path: `/blog/${slug}`,
    imageUrl: data?.cover_image || null,
  })
}

export default async function BlogPostPage({ params }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { slug } = await params

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  let author = null
  if (post.author_id) {
    const { data } = await supabase.from('models').select('name, image').eq('user_id', post.author_id).maybeSingle()
    author = data
  }

  // HTMLタグが含まれているか判定（リッチエディター出力）
  const isHtml = (post.content || '').includes('<')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,56px) 20px' }}>
      <Link href="/blog" style={{ color: '#2f2244', textDecoration: 'none', fontSize: 14 }}>← ブログ一覧</Link>

      {post.cover_image && (
        <div style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden', maxHeight: 400 }}>
          <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: 400, objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 700, color: '#2f2244', margin: '0 0 12px', lineHeight: 1.4 }}>
          {post.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          {author?.image && (
            <img src={author.image} alt={author.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div style={{ fontSize: 13, color: '#aaa' }}>
            {author?.name && <span style={{ marginRight: 8 }}>{author.name}</span>}
            {post.published_at && new Date(post.published_at).toLocaleDateString('ja-JP')}
          </div>
        </div>

        {isHtml ? (
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{ fontSize: 15, color: '#444', lineHeight: 2 }}
          />
        ) : (
          <div style={{ fontSize: 15, color: '#444', lineHeight: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(post.content || '').split('\n').filter(l => l.trim()).map((p, i) => (
              <p key={i} style={{ margin: 0 }}>{p}</p>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .blog-content img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .blog-content video { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .blog-content a { color: #1a3560; }
        .blog-content p { margin: 0 0 12px; }
      `}</style>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
        <Link href="/blog" style={{ color: '#2f2244', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← ブログ一覧に戻る</Link>
      </div>
    </div>
  )
}
