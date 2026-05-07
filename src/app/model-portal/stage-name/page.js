'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StageNamePage() {
  const [form, setForm] = useState({ name: '', name_en: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/model-portal/profile')
      .then(r => r.json())
      .then(({ model }) => {
        if (model) {
          const src = model.pending_data || model
          setForm({ name: src.name || '', name_en: src.name_en || '' })
        }
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    if (!form.name.trim()) { setError('芸名を入力してください'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/model-portal/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, name_en: form.name_en }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '保存に失敗しました')
      setSaving(false)
      return
    }

    router.push('/model-portal/profile')
  }

  const inp = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', marginBottom: 32 }}>芸名・X作成</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* 芸名 */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '28px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>1. 芸名を決めてください</h2>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.9, marginBottom: 20, marginTop: 0 }}>
            Photo Fleurでは芸名の使用をお勧めします。（本名を希望する場合は本名でも大丈夫）<br />
            <strong>名字を必ずつけた芸名</strong>を考えて記入してください。
          </p>

          {error && (
            <div style={{ background: '#ffeef0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#c62828', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>
                芸名（日本語）<span style={{ color: 'red', marginLeft: 4 }}>*</span>
              </label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="阿部 依花" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>
                芸名（英字）
              </label>
              <input style={inp} value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="Yorika Abe" />
            </div>
          </div>
        </section>

        {/* X作成 */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '28px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>2. 撮影会用のX作成をお願いします</h2>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.9, marginTop: 0, marginBottom: 20 }}>
            撮影会の宣伝は主にXを使います。
          </p>

          <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '20px', fontSize: 14, color: '#1a3560', lineHeight: 2 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>【Xアカウント作成】</div>
            <p style={{ margin: '0 0 12px' }}>
              📍 ユーザー名を<strong>芸名下の名前_FLeur_</strong>にしてください<br />
              例）Yorika_Fleur_
            </p>
            <p style={{ margin: '0 0 12px' }}>
              📍 名前は、<strong>芸名フルネーム_Fleur</strong>でお願いします<br />
              例）阿部依花_Fleur
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
              自己紹介やアイコンは後でまた作るからここではアカウント作成だけで大丈夫です！<br />
              （作り方が分からない子は遠慮なくLINEで聞いてください）
            </p>
          </div>
        </section>

        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 48px', fontWeight: 700, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '最後に公開情報を登録する →'}
          </button>
        </div>
      </div>
    </div>
  )
}
