'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ModelBlogEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState({ title: '', slug: '', content: '', cover_image: '' })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'model') { window.location.href = '/'; return }
      setUserId(user.id)

      if (!isNew) {
        const { data } = await supabase.from('blog_posts').select('*').eq('id', id).eq('author_id', user.id).single()
        if (!data) { router.push('/model-portal/blog'); return }
        if (data.status !== 'draft') { router.push('/model-portal/blog'); return }
        setForm({ title: data.title || '', slug: data.slug || '', content: data.content || '', cover_image: data.cover_image || '' })
      }
      setLoading(false)
    }
    init()
  }, [id])

  async function uploadCover(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `blog/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (error) { alert('アップロードエラー: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setForm(f => ({ ...f, cover_image: data.publicUrl }))
    setUploading(false)
  }

  async function save(submitForReview = false) {
    if (!form.title) { alert('タイトルを入力してください'); return }
    setSaving(true)

    const slug = form.slug || slugify(form.title) || `post-${Date.now()}`
    const status = submitForReview ? 'pending_review' : 'draft'
    const updates = { title: form.title, slug, content: form.content, cover_image: form.cover_image || null, status, updated_at: new Date().toISOString() }

    if (isNew) {
      const { data, error } = await supabase.from('blog_posts').insert({ ...updates, author_id: userId }).select('id').single()
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      if (submitForReview) {
        alert('承認申請しました。運営の確認後に公開されます。')
        router.push('/model-portal/blog')
      } else {
        router.replace(`/model-portal/blog/${data.id}`)
      }
    } else {
      const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      if (submitForReview) {
        alert('承認申請しました。運営の確認後に公開されます。')
        router.push('/model-portal/blog')
      } else {
        alert('下書きを保存しました')
      }
    }
    setSaving(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/model-portal/blog" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← ブログ記事一覧</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>
        {isNew ? '新規記事作成' : '記事編集'}
      </h1>

      <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#795548' }}>
        💡 「承認を申請する」を押すと運営に送信されます。承認後に公開されます。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>タイトル *</label>
            <input style={inp} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))}
              placeholder="記事タイトル" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>スラッグ（URL・任意）</label>
            <input style={inp} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="my-blog-post" />
          </div>
        </div>

        {/* Cover image */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>カバー画像（任意）</label>
          {form.cover_image && (
            <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', height: 180 }}>
              <img src={form.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <input type="file" accept="image/*" disabled={uploading}
            onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} style={{ fontSize: 13, marginBottom: 8, display: 'block' }} />
          <input style={inp} value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="または画像URL https://..." />
        </div>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>本文 *</label>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 10px' }}>改行で段落が区切られます</p>
          <textarea style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.9 }} rows={18}
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="ここに記事の内容を書いてください..." />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => save(false)} disabled={saving || uploading}
            style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 10, padding: '13px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            下書き保存
          </button>
          <button onClick={() => save(true)} disabled={saving || uploading}
            style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '送信中...' : '承認を申請する'}
          </button>
        </div>
      </div>
    </div>
  )
}
