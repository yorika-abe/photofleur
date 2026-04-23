'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const PRICE_TIERS = [
  { key: 'staff',  label: '運営スタッフ', street: 12000, studio: 10000, is_staff: true,  color: '#1a3560', bg: '#e8f0fb' },
  { key: '12000',  label: '12000モデル',  street: 12000, studio: 10000, is_staff: false, color: '#6a1b9a', bg: '#f3e5f5' },
  { key: '9900',   label: '9900モデル',   street: 9900,  studio: 7900,  is_staff: false, color: '#00695c', bg: '#e0f2f1' },
  { key: '8900',   label: '8900モデル',   street: 8900,  studio: 6900,  is_staff: false, color: '#e65100', bg: '#fff3e0' },
]

export default function AdminModelEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('active')
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkedUserId, setLinkedUserId] = useState(null)
  const [form, setForm] = useState({
    name: '', name_en: '', bio: '', height: '', birthday: '', shoe_size: '',
    street_price: '', studio_price: '', duration_street: '', duration_studio: '',
    image: '', twitter_url: '', instagram_url: '', line_id: '', favorite_things: '',
    is_staff: false, price_tier: '',
  })
  const [portfolioImages, setPortfolioImages] = useState([])

  useEffect(() => {
    if (isNew) return
    fetch(`/api/admin/model/${id}`)
      .then(r => r.json())
      .then(model => {
        if (!model || model.error) { router.push('/admin/models'); return }
        setStatus(model.status || 'active')
        setLinkedUserId(model.user_id || null)
        setForm({
          name: model.name || '',
          name_en: model.name_en || '',
          bio: model.bio || '',
          height: model.height || '',
          birthday: model.birthday || '',
          shoe_size: model.shoe_size || '',
          street_price: model.street_price || '',
          studio_price: model.studio_price || '',
          duration_street: model.duration_street || '',
          duration_studio: model.duration_studio || '',
          image: model.image || '',
          twitter_url: model.twitter_url || '',
          instagram_url: model.instagram_url || '',
          line_id: model.line_id || '',
          favorite_things: model.favorite_things || '',
          is_staff: model.is_staff || false,
          price_tier: model.price_tier || '',
        })
        setPortfolioImages(model.portfolio_images || [])
        setLoading(false)
      })
  }, [id])

  async function uploadImage(file, field) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `models/${isNew ? 'new' : id}/${field}-${Date.now()}.${ext}`
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.error) { alert('アップロードエラー: ' + data.error); setUploading(false); return }
    if (field === 'portfolio') setPortfolioImages(prev => [...prev, data.url])
    else setForm(f => ({ ...f, [field]: data.url }))
    setUploading(false)
  }

  async function save() {
    setSaving(true)
    const body = {
      name: form.name,
      name_en: form.name_en || null,
      bio: form.bio || null,
      height: form.height ? Number(form.height) : null,
      birthday: form.birthday || null,
      shoe_size: form.shoe_size || null,
      street_price: form.street_price ? Number(form.street_price) : null,
      studio_price: form.studio_price ? Number(form.studio_price) : null,
      duration_street: form.duration_street || null,
      duration_studio: form.duration_studio || null,
      image: form.image || null,
      twitter_url: form.twitter_url || null,
      instagram_url: form.instagram_url || null,
      line_id: form.line_id || null,
      favorite_things: form.favorite_things || null,
      price_tier: form.price_tier || null,
      is_staff: form.price_tier === 'staff',
      portfolio_images: portfolioImages,
      status,
    }

    if (isNew) {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setSaving(false)
      if (data.error) { alert('エラー: ' + data.error); return }
      router.replace(`/admin/models/${data.id}`)
    } else {
      const res = await fetch(`/api/admin/model/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setSaving(false)
      if (data.error) alert('エラー: ' + data.error)
      else alert('保存しました')
    }
  }

  async function linkUser() {
    if (!linkEmail.trim()) return
    setLinkLoading(true)
    const res = await fetch(`/api/admin/model/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link_user', email: linkEmail.trim() }),
    })
    const data = await res.json()
    setLinkLoading(false)
    if (data.error) alert('エラー: ' + data.error)
    else { setLinkedUserId(data.user_id); setLinkEmail(''); alert('アカウントを紐付けました') }
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const lbl = (text, req) => (
    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
      {text}{req && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
    </label>
  )

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin/models" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデル管理</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '8px 0 28px' }}>
        {isNew ? '新規モデル登録' : 'モデル編集'}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Status */}
        {!isNew && (
          <section style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e5e5e5' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>公開ステータス</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { val: 'active', label: '公開中', color: '#388e3c', bg: '#e8f5e9' },
                { val: 'pending', label: '承認待ち', color: '#e65100', bg: '#fff3e0' },
                { val: 'inactive', label: '非公開', color: '#999', bg: '#f5f5f5' },
              ].map(s => (
                <button key={s.val} onClick={() => setStatus(s.val)}
                  style={{ padding: '8px 20px', borderRadius: 20, border: status === s.val ? `2px solid ${s.color}` : '2px solid #e5e5e5', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: status === s.val ? s.bg : '#fff', color: status === s.val ? s.color : '#999' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Basic info */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>基本情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>{lbl('表示名', true)}<input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>{lbl('英字名')}<input style={inp} value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Hanako Yamada" /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            {lbl('自己紹介・プロフィール')}
            <textarea style={{ ...inp, resize: 'vertical' }} rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>{lbl('身長（cm）')}<input type="number" style={inp} value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} /></div>
            <div>{lbl('誕生日')}<input style={inp} value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} placeholder="2000/01/01" /></div>
            <div>{lbl('靴サイズ')}<input style={inp} value={form.shoe_size} onChange={e => setForm(f => ({ ...f, shoe_size: e.target.value }))} placeholder="24.0cm" /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            {lbl('好きなもの')}
            <input style={inp} value={form.favorite_things} onChange={e => setForm(f => ({ ...f, favorite_things: e.target.value }))} placeholder="カフェ巡り、読書、旅行..." />
          </div>
        </section>

        {/* Profile image */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>プロフィール画像</h2>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {form.image && (
              <div style={{ width: 100, height: 133, borderRadius: 10, overflow: 'hidden', background: '#e0d8f0', flexShrink: 0 }}>
                <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                📷 写真を選ぶ
                <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'image')} />
              </label>
              {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...</p>}
            </div>
          </div>
        </section>

        {/* Pricing tier */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>料金区分</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>区分を選ぶと料金が自動入力されます。割引時は手動で変更できます。</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
            {PRICE_TIERS.map(tier => {
              const selected = form.price_tier === tier.key
              return (
                <button key={tier.key} type="button"
                  onClick={() => setForm(f => ({ ...f, price_tier: tier.key, street_price: tier.street, studio_price: tier.studio }))}
                  style={{ padding: '14px 10px', borderRadius: 10, border: selected ? `2px solid ${tier.color}` : '2px solid #e5e5e5', cursor: 'pointer', background: selected ? tier.bg : '#fafafa', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: tier.color, marginBottom: 4 }}>{tier.label}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>ストリート90分 ¥{tier.street.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>スタジオ60分 ¥{tier.studio.toLocaleString()}</div>
                </button>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>{lbl('ストリート料金（円）')}<input type="number" style={inp} value={form.street_price} onChange={e => setForm(f => ({ ...f, street_price: e.target.value }))} /></div>
            <div>{lbl('ストリート撮影時間')}<input style={inp} value={form.duration_street} onChange={e => setForm(f => ({ ...f, duration_street: e.target.value }))} placeholder="30分" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>{lbl('スタジオ料金（円）')}<input type="number" style={inp} value={form.studio_price} onChange={e => setForm(f => ({ ...f, studio_price: e.target.value }))} /></div>
            <div>{lbl('スタジオ撮影時間')}<input style={inp} value={form.duration_studio} onChange={e => setForm(f => ({ ...f, duration_studio: e.target.value }))} placeholder="30分" /></div>
          </div>
        </section>

        {/* SNS */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>SNS・連絡先</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>{lbl('X / Twitter URL')}<input style={inp} value={form.twitter_url} onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="https://x.com/..." /></div>
            <div>{lbl('Instagram URL')}<input style={inp} value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." /></div>
            <div>{lbl('LINE ID（通知用）')}<input style={inp} value={form.line_id} onChange={e => setForm(f => ({ ...f, line_id: e.target.value }))} placeholder="U1234..." /></div>
          </div>
        </section>

        {/* Portfolio */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>ポートフォリオ画像</h2>
          {portfolioImages.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 16 }}>
              {portfolioImages.map((url, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4', background: '#e0d8f0' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setPortfolioImages(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f7fb', color: '#1a3560', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, border: '2px dashed #5bbfd6' }}>
            📷 写真を追加（複数可）
            <input type="file" accept="image/*" multiple disabled={uploading} style={{ display: 'none' }}
              onChange={async e => {
                if (!e.target.files?.length) return
                setUploading(true)
                for (const file of Array.from(e.target.files)) {
                  const ext = file.name.split('.').pop()
                  const path = `models/${isNew ? 'new' : id}/portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('path', path)
                  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                  const data = await res.json()
                  if (data.error) { alert('アップロードエラー: ' + data.error); continue }
                  setPortfolioImages(prev => [...prev, data.url])
                }
                setUploading(false)
              }} />
          </label>
          {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...</p>}
        </section>

        {/* User account link */}
        {!isNew && (
          <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>モデルアカウント紐付け</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
              モデルが自分でプロフィールを編集できるよう、ログインアカウントと紐付けます。
            </p>
            {linkedUserId
              ? <div style={{ fontSize: 13, color: '#388e3c', fontWeight: 600, marginBottom: 12 }}>✓ アカウント紐付け済み</div>
              : <div style={{ fontSize: 13, color: '#e65100', marginBottom: 12 }}>未紐付け（モデルは自分でプロフィールを編集できません）</div>
            }
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} value={linkEmail} onChange={e => setLinkEmail(e.target.value)}
                placeholder="モデルのログインメールアドレス" type="email" />
              <button onClick={linkUser} disabled={linkLoading || !linkEmail.trim()}
                style={{ padding: '10px 16px', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', opacity: linkLoading ? 0.7 : 1 }}>
                {linkLoading ? '検索中...' : '紐付ける'}
              </button>
            </div>
          </section>
        )}

        {/* Save */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={save} disabled={saving || uploading}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '変更を保存'}
          </button>
          {!isNew && (
            <Link href={`/models/${id}`} target="_blank"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 20px', border: '2px solid #1a3560', color: '#1a3560', textDecoration: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14 }}>
              公開ページを確認 →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
