import Image from 'next/image'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/ogp'

export async function generateMetadata({ params }) {
  const admin = await createSupabaseAdminClient()
  const { slug } = await params
  const { data } = await admin.from('blog_posts').select('title, cover_image').eq('slug', decodeURIComponent(slug)).maybeSingle()
  return buildMetadata({
    title: data?.title ? `${data.title} | PhotoFleur Blog` : 'ブログ | PhotoFleur',
    path: `/blog/${slug}`,
    imageUrl: data?.cover_image || null,
  })
}

export default async function BlogPostPage({ params }) {
  const admin = await createSupabaseAdminClient()
  const { slug } = await params

  const decodedSlug = decodeURIComponent(slug)
  const [{ data: post }, { data: avatarSetting }] = await Promise.all([
    admin.from('blog_posts').select('*').eq('slug', decodedSlug).eq('status', 'published').maybeSingle(),
    admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle(),
  ])

  if (!post) notFound()

  const adminAvatarUrl = avatarSetting?.value || null

  let authorName = null
  let authorAvatar = null
  if (post.author_id) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('name, role, roles')
      .eq('id', post.author_id)
      .maybeSingle()
    if (profile) {
      const isAdminUser = profile.role === 'owner' || profile.roles?.includes('admin')
      const showAsAdmin = isAdminUser && post.posted_as_admin
      if (showAsAdmin) {
        authorName = profile.name || null
        authorAvatar = adminAvatarUrl
      } else {
        const { data: modelProfile } = await admin
          .from('models')
          .select('name, image')
          .eq('user_id', post.author_id)
          .maybeSingle()
        authorName = modelProfile?.name || profile.name?.replace(/^運営\s*/, '') || profile.name
        authorAvatar = modelProfile?.image || null
      }
    }
  }

  const isHtml = (post.content || '').includes('<')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,56px) 20px' }}>
      <Link href="/blog" style={{ color: '#2f2244', textDecoration: 'none', fontSize: 14 }}>← ブログ一覧</Link>

      {post.cover_image && (
        <div style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 400 }}>
          <Image src={post.cover_image} alt={post.title} fill style={{ objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 700, color: '#2f2244', margin: '0 0 12px', lineHeight: 1.4 }}>
          {post.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          {authorAvatar && (
            <Image src={authorAvatar} alt="" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ fontSize: 13, color: '#aaa' }}>
            {authorName && <span style={{ marginRight: 8, color: '#888' }}>{authorName}</span>}
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
