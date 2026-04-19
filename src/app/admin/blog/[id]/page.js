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

export default function AdminBlogEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState({ title: '', slug: '', content: '', cover_image: '', status: 'draft' })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    if (isNew) return
    supabase.from('blog_posts').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm({ title: data.title || '', slug: data.slug || '', content: data.content || '', cover_image: data.cover_image || '', status: data.status || 'draft' })
      setLoading(false)
    })
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

  async function save(publishNow = false) {
    if (!form.title) { alert('タイトルを入力してください'); return }
    setSaving(true)

    const slug = form.slug || slugify(form.title) || `post-${Date.now()}`
    const status = publishNow ? 'published' : form.status
    const updates = {
      title: form.title,
      slug,
      content: form.content,
      cover_image: form.cover_image || null,
      status,
      updated_at: new Date().toISOString(),
      ...(publishNow && !form.published_at ? { published_at: new Date().toISOString() } : {}),
    }

    if (isNew) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('blog_posts').insert({ ...updates, author_id: user?.id }).select('id').single()
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      router.replace(`/admin/blog/${data.id}`)
    } else {
      const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      setForm(f => ({ ...f, slug, status }))
      alert(publishNow ? '公開しました' : '保存しました')
    }
    setSaving(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin/blog" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← ブログ管理</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>
        {isNew ? '新規記事作成' : '記事編集'}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>タイトル *</label>
            <input style={inp} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))}
              placeholder="記事タイトル" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>スラッグ（URL）</label>
            <input style={inp} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="my-blog-post" />
            <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>/blog/{form.slug || 'スラッグ'}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>ステータス</label>
            <select style={{ ...inp, width: 'auto' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>
        </div>

        {/* Cover image */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>カバー画像</label>
          {form.cover_image && (
            <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', height: 200 }}>
              <img src={form.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>ファイルアップロード</p>
              <input type="file" accept="image/*" disabled={uploading}
                onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} style={{ fontSize: 13 }} />
              {uploading && <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>アップロード中...</span>}
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>または画像URL</p>
              <input style={inp} value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>本文</label>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 10px' }}>改行で段落を区切ります</p>
          <textarea style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8 }} rows={20}
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="ここに記事の内容を書いてください..." />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => save(false)} disabled={saving || uploading}
            style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '保存'}
          </button>
          {form.status !== 'published' && (
            <button onClick={() => save(true)} disabled={saving || uploading}
              style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              保存して公開
            </button>
          )}
          {!isNew && form.status === 'published' && (
            <Link href={`/blog/${form.slug}`} target="_blank"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 20px', border: '2px solid #2f2244', color: '#2f2244', textDecoration: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14 }}>
              公開ページを確認 →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
