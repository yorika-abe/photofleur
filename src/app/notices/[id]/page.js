import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function NoticePage({ params }) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: notice } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .eq('category', 'notice')
    .single()

  if (!notice || notice.status !== 'published') {
    return (
      <div style={{ maxWidth: 700, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#aaa' }}>お知らせが見つかりません</p>
        <Link href="/" style={{ color: '#1a3560', textDecoration: 'none', fontWeight: 600 }}>← ホームに戻る</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px' }}>
      <Link href="/" style={{ color: '#5bbfd6', fontSize: 13, textDecoration: 'none' }}>← ホーム</Link>

      {notice.cover_image && (
        <div style={{ margin: '24px 0', borderRadius: 14, overflow: 'hidden', height: 320, position: 'relative' }}>
          <Image src={notice.cover_image} alt="" fill style={{ objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ marginTop: notice.cover_image ? 0 : 32 }}>
        <span style={{ fontSize: 11, background: '#fce8f4', color: '#d4608a', borderRadius: 4, padding: '3px 10px', fontWeight: 600, letterSpacing: '0.1em' }}>お知らせ</span>
        {notice.published_at && (
          <p style={{ fontSize: 13, color: '#aaa', margin: '12px 0 0' }}>{new Date(notice.published_at).toLocaleDateString('ja-JP')}</p>
        )}
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#0d1f3a', margin: '12px 0 32px', lineHeight: 1.4 }}>{notice.title}</h1>
        <div
          style={{ fontSize: 15, lineHeight: 2, color: '#333' }}
          dangerouslySetInnerHTML={{ __html: notice.content || '' }}
        />
      </div>
    </div>
  )
}
