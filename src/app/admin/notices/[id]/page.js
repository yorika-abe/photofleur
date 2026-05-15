'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import RichEditor from '@/components/RichEditor'

export default function AdminNoticeEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState({ title: '', content: '', cover_image: '', status: 'draft' })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const coverInputRef = useRef(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    if (isNew) return
    supabase.from('blog_posts').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm({ title: data.title || '', content: data.content || '', cover_image: data.cover_image || '', status: data.status || 'draft' })
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function uploadCover(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `notices/${Date.now()}.${ext}`
    const fd = new FormData()
    fd.append('file', file)
    fd.append('path', path)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.error) { alert('アップロードエラー: ' + data.error); return }
    setForm(f => ({ ...f, cover_image: data.url }))
  }

  async function save(publishNow = false) {
    if (!form.title) { alert('タイトルを入力してください'); return }
    setSaving(true)
    const now = new Date().toISOString()
    const status = publishNow ? 'published' : form.status
    const updates = {
      title: form.title,
      slug: `notice-${Date.now()}`,
      content: form.content,
      cover_image: form.cover_image || null,
      status,
      category: 'notice',
      updated_at: now,
      ...(publishNow ? { published_at: now } : {}),
    }

    if (isNew) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('blog_posts').insert({ ...updates, author_id: user?.id }).select('id').single()
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      router.replace(`/admin/notices/${data.id}`)
    } else {
      const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
      if (error) { alert('エラー: ' + error.message); setSaving(false); return }
      setForm(f => ({ ...f, status }))
      alert(publishNow ? '公開しました' : '保存しました')
    }
    setSaving(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin/notices" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← お知らせ管理</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>
        {isNew ? 'お知らせ新規作成' : 'お知らせ編集'}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>タイトル *</label>
            <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="お知らせタイトル" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>ステータス</label>
            <select style={{ ...inp, width: 'auto' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>
        </div>

        {/* カバー画像 */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>カバー画像</label>
          {form.cover_image ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ position: 'relative', height: 200, borderRadius: 10, overflow: 'hidden' }}>
                <Image src={form.cover_image} alt="" fill style={{ objectFit: 'cover' }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, cover_image: '' }))}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  削除
                </button>
              </div>
            </div>
          ) : (
            <>
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              <label onMouseDown={() => coverInputRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f7fb', color: '#1a3560', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, border: '2px dashed #5bbfd6' }}>
                {uploading ? '⏳ アップロード中...' : '📷 カバー画像をアップロード'}
              </label>
            </>
          )}
        </div>

        {/* 本文 */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>本文</label>
          <RichEditor
            value={form.content}
            onChange={content => setForm(f => ({ ...f, content }))}
            uploadPath="notices"
            uploadEndpoint="/api/admin/upload"
          />
        </div>

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
        </div>
      </div>
    </div>
  )
}
