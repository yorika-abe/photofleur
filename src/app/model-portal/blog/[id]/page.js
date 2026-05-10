'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import RichEditor from '@/components/RichEditor'
import { compressImage } from '@/lib/compressImage'

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
  const [savedCoverImage, setSavedCoverImage] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [modelCategorySlug, setModelCategorySlug] = useState(null)
  const coverInputRef = useRef(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', user.id).single()
      const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
      if (!roles.includes('model')) { window.location.href = '/'; return }
      setUserId(user.id)

      fetch('/api/admin/blog/categories').then(r => r.json()).then(cats => {
        const modelCat = Array.isArray(cats) && cats.find(c => c.name.includes('モデルの記事'))
        if (modelCat) setModelCategorySlug(modelCat.slug)
      })

      if (!isNew) {
        const { data } = await supabase.from('blog_posts').select('*').eq('id', id).eq('author_id', user.id).single()
        if (!data) { router.push('/model-portal/blog'); return }
        if (data.status !== 'draft') { router.push('/model-portal/blog'); return }
        setForm({ title: data.title || '', slug: data.slug || '', content: data.content || '', cover_image: data.cover_image || '' })
        setSavedCoverImage(data.cover_image || '')
      }
      setLoading(false)
    }
    init()
  }, [id])

  async function uploadCover(file) {
    setCoverUploading(true)
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.85, aspectRatio: 16 / 9 })
      const path = `blog/cover/${userId || 'u'}-${Date.now()}.jpg`
      const fd = new FormData()
      fd.append('file', compressed, 'cover.jpg')
      fd.append('path', path)
      const res = await fetch('/api/model-portal/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { alert('アップロードエラー: ' + data.error); return }
      // 古いカバー画像をストレージから削除
      if (form.cover_image && form.cover_image !== savedCoverImage) {
        deleteStorageUrl(form.cover_image)
      }
      setForm(f => ({ ...f, cover_image: data.url }))
    } finally {
      setCoverUploading(false)
    }
  }

  function deleteStorageUrl(url) {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
    if (!url?.startsWith(base)) return
    fetch('/api/model-portal/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: url.replace(base, '') }),
    })
  }

  function removeCover() {
    const old = form.cover_image
    setForm(f => ({ ...f, cover_image: '' }))
    // DBに保存済みの画像はsave時にAPIで削除。未保存アップロードは即削除
    if (old && old !== savedCoverImage) deleteStorageUrl(old)
  }

  async function save(submitForReview = false) {
    if (!form.title) { alert('タイトルを入力してください'); return }
    setSaving(true)

    const baseSlug = form.slug || slugify(form.title)
    const slug = isNew && !form.slug
      ? `${baseSlug || 'post'}-${Date.now()}`
      : baseSlug || `post-${Date.now()}`
    const status = submitForReview ? 'pending_review' : 'draft'
    const category = submitForReview && modelCategorySlug ? modelCategorySlug : undefined
    const updates = {
      title: form.title, slug, content: form.content,
      cover_image: form.cover_image || null, status,
      updated_at: new Date().toISOString(),
      ...(category ? { category } : {}),
    }

    if (isNew) {
      const { data, error } = await supabase.from('blog_posts').insert({ ...updates, author_id: userId }).select('id').single()
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      if (submitForReview) {
        alert('承認申請しました。運営の確認後に公開されます。')
        router.push('/model-portal/blog')
      } else {
        setSavedCoverImage(form.cover_image)
        router.replace(`/model-portal/blog/${data.id}`)
      }
    } else {
      // カバー画像が変わった場合、API経由で古い画像削除
      const res = await fetch(`/api/model-portal/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) { alert('エラーが発生しました'); setSaving(false); return }
      if (submitForReview) {
        alert('承認申請しました。運営の確認後に公開されます。')
        router.push('/model-portal/blog')
      } else {
        setSavedCoverImage(form.cover_image)
        alert('下書きを保存しました')
      }
    }
    setSaving(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/model-portal/blog" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← ブログ記事一覧</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>
        {isNew ? '新規記事作成' : '記事編集'}
      </h1>

      <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1565c0' }}>
        💡 「承認を申請する」を押すと運営に送信されます。承認後に公開されます。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>タイトル *</label>
            <input style={inp} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="記事タイトル" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>スラッグ（URL・任意）</label>
            <input style={inp} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="my-blog-post" />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>カバー画像（任意）</label>
          {form.cover_image && (
            <div style={{ position: 'relative', marginBottom: 12, borderRadius: 10, overflow: 'hidden', height: 200 }}>
              <img src={form.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={removeCover}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          <label onMouseDown={() => coverInputRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f7fb', color: '#1a3560', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, border: '2px dashed #5bbfd6' }}>
            {coverUploading ? '⏳ アップロード中...' : '📷 カバー画像をアップロード'}
          </label>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>本文 *</label>
          <RichEditor
            value={form.content}
            onChange={content => setForm(f => ({ ...f, content }))}
            uploadPath={`blog/${userId || 'tmp'}`}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => save(false)} disabled={saving || coverUploading}
            style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 10, padding: '13px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            下書き保存
          </button>
          <button onClick={() => save(true)} disabled={saving || coverUploading}
            style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '送信中...' : '承認を申請する'}
          </button>
        </div>
      </div>
    </div>
  )
}
