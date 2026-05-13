'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function randomCode() {
  return 'PFC' + Array.from({ length: 8 }, () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]).join('')
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [createMode, setCreateMode] = useState(null) // null | 'manual' | 'random'
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '', discount_type: 'fixed', discount_value: '', max_uses: '', valid_from: '', valid_until: '', description: '', is_active: true,
  })
  const [randomForm, setRandomForm] = useState({
    count: '5', discount_type: 'fixed', discount_value: '', max_uses: '1', valid_from: '', valid_until: '', description: '', is_active: true,
  })
  const [randomResult, setRandomResult] = useState(null) // created codes

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/coupons')
    const data = await res.json()
    setCoupons(data.coupons || [])
    setLoading(false)
  }

  function closeForm() {
    setShowForm(false)
    setCreateMode(null)
    setRandomResult(null)
    setForm({ code: '', discount_type: 'fixed', discount_value: '', max_uses: '', valid_from: '', valid_until: '', description: '', is_active: true })
    setRandomForm({ count: '5', discount_type: 'fixed', discount_value: '', max_uses: '1', valid_from: '', valid_until: '', description: '', is_active: true })
  }

  async function createManual(e) {
    e.preventDefault()
    if (!form.code || !form.discount_value) return
    setSaving(true)
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        description: form.description || null,
        is_active: form.is_active,
      }),
    })
    const data = await res.json()
    if (data.error) { alert('エラー: ' + data.error) }
    else { closeForm(); load() }
    setSaving(false)
  }

  async function createRandom(e) {
    e.preventDefault()
    if (!randomForm.discount_value) return
    const count = Math.min(100, Math.max(1, Number(randomForm.count) || 1))
    setSaving(true)
    const created = []
    for (let i = 0; i < count; i++) {
      let code, ok = false
      for (let t = 0; t < 10; t++) {
        code = randomCode()
        if (!coupons.find(c => c.code === code) && !created.find(c => c === code)) { ok = true; break }
      }
      if (!ok) continue
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discount_type: randomForm.discount_type,
          discount_value: Number(randomForm.discount_value),
          max_uses: randomForm.max_uses ? Number(randomForm.max_uses) : null,
          valid_from: randomForm.valid_from || null,
          valid_until: randomForm.valid_until || null,
          description: randomForm.description || null,
          is_active: randomForm.is_active,
        }),
      })
      const data = await res.json()
      if (!data.error) created.push(code)
    }
    setSaving(false)
    setRandomResult(created)
    load()
  }

  async function toggleActive(coupon) {
    await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    })
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function deleteCoupon(id) {
    if (!confirm('このクーポンを削除しますか？')) return
    await fetch('/api/admin/coupons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const purple = '#2f2244'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: purple, fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 8px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: purple, margin: 0 }}>クーポン管理</h1>
        <button onClick={() => { setShowForm(!showForm); setCreateMode(null); setRandomResult(null) }}
          style={{ background: purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {showForm ? 'キャンセル' : '+ 新規作成'}
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#bbb', margin: '0 0 20px' }}>毎月1日の深夜2時に、期限から4ヶ月以上経過したクーポンを自動削除します。</p>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: `2px solid ${purple}`, marginBottom: 24 }}>

          {/* モード選択 */}
          {!createMode && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: purple, marginTop: 0, marginBottom: 16 }}>作成方法を選択</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={() => setCreateMode('manual')}
                  style={{ background: '#f8f5ff', border: `2px solid ${purple}`, borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>✏️</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: purple, marginBottom: 4 }}>手動作成</div>
                  <div style={{ fontSize: 12, color: '#888' }}>一つのコードを手動で作成</div>
                </button>
                <button onClick={() => setCreateMode('random')}
                  style={{ background: '#f0faf0', border: '2px solid #388e3c', borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🎲</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#388e3c', marginBottom: 4 }}>ランダム作成</div>
                  <div style={{ fontSize: 12, color: '#888' }}>数枚のコードをランダムで作成</div>
                </button>
              </div>
            </>
          )}

          {/* 手動作成 */}
          {createMode === 'manual' && (
            <form onSubmit={createManual}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button type="button" onClick={() => setCreateMode(null)}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: 0 }}>← 戻る</button>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: purple, margin: 0 }}>手動作成</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>クーポンコード <span style={{ color: 'red' }}>*</span></label>
                  <input style={inp} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SUMMER2025" required />
                  <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>※ 自動で大文字変換されます</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>割引種類 <span style={{ color: 'red' }}>*</span></label>
                  <select style={inp} value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                    <option value="fixed">固定額割引（円）</option>
                    <option value="percent">割合割引（%）</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
                    割引{form.discount_type === 'fixed' ? '額（円）' : '率（%）'} <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input type="number" style={inp} value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'fixed' ? '500' : '10'} required min="1" max={form.discount_type === 'percent' ? '100' : undefined} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>最大使用回数（空白=無制限）</label>
                  <input type="number" style={inp} value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="100" min="1" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>有効開始日（任意）</label>
                  <input type="datetime-local" style={inp} value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>有効期限（任意）</label>
                  <input type="datetime-local" style={inp} value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>メモ・説明（任意）</label>
                <input style={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="初回参加者向けなど" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                作成後すぐに有効化する
              </label>

              <button type="submit" disabled={saving}
                style={{ background: purple, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                {saving ? '作成中...' : 'クーポンを作成'}
              </button>
            </form>
          )}

          {/* ランダム作成 */}
          {createMode === 'random' && !randomResult && (
            <form onSubmit={createRandom}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button type="button" onClick={() => setCreateMode(null)}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: 0 }}>← 戻る</button>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#388e3c', margin: 0 }}>ランダム作成</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>作成コード数 <span style={{ color: 'red' }}>*</span></label>
                  <input type="number" style={inp} value={randomForm.count} onChange={e => setRandomForm(f => ({ ...f, count: e.target.value }))}
                    placeholder="5" required min="1" max="100" />
                  <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>最大100枚</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>割引種類 <span style={{ color: 'red' }}>*</span></label>
                  <select style={inp} value={randomForm.discount_type} onChange={e => setRandomForm(f => ({ ...f, discount_type: e.target.value }))}>
                    <option value="fixed">固定額割引（円）</option>
                    <option value="percent">割合割引（%）</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
                    割引{randomForm.discount_type === 'fixed' ? '額（円）' : '率（%）'} <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input type="number" style={inp} value={randomForm.discount_value} onChange={e => setRandomForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={randomForm.discount_type === 'fixed' ? '500' : '10'} required min="1" max={randomForm.discount_type === 'percent' ? '100' : undefined} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>各コードの最大使用回数（空白=無制限）</label>
                  <input type="number" style={inp} value={randomForm.max_uses} onChange={e => setRandomForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="1" min="1" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>有効開始日（任意）</label>
                  <input type="datetime-local" style={inp} value={randomForm.valid_from} onChange={e => setRandomForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>有効期限（任意）</label>
                  <input type="datetime-local" style={inp} value={randomForm.valid_until} onChange={e => setRandomForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>メモ・説明（任意）</label>
                <input style={inp} value={randomForm.description} onChange={e => setRandomForm(f => ({ ...f, description: e.target.value }))} placeholder="メルマガ配布用など" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
                <input type="checkbox" checked={randomForm.is_active} onChange={e => setRandomForm(f => ({ ...f, is_active: e.target.checked }))} />
                作成後すぐに有効化する
              </label>

              <button type="submit" disabled={saving}
                style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                {saving ? `作成中...` : `🎲 ${randomForm.count || 0}枚のコードを作成`}
              </button>
            </form>
          )}

          {/* ランダム作成完了 */}
          {createMode === 'random' && randomResult && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#388e3c', marginTop: 0, marginBottom: 16 }}>✅ {randomResult.length}枚のコードを作成しました</h2>
              <div style={{ background: '#f8f8f8', borderRadius: 8, padding: 16, marginBottom: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 2 }}>
                {randomResult.map(code => <div key={code}>{code}</div>)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => navigator.clipboard.writeText(randomResult.join('\n'))}
                  style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  📋 コピー
                </button>
                <button onClick={closeForm}
                  style={{ background: purple, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  閉じる
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : coupons.length === 0 ? (
        <p style={{ color: '#999' }}>クーポンはありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coupons.map(c => {
            const usagePercent = c.max_uses ? Math.round((c.used_count / c.max_uses) * 100) : null
            const isExpired = c.valid_until && new Date(c.valid_until) < new Date()
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', opacity: (!c.is_active || isExpired) ? 0.65 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: purple, background: '#f8f5ff', padding: '3px 12px', borderRadius: 6 }}>{c.code}</span>
                      <span style={{ background: c.discount_type === 'fixed' ? '#e8f5e9' : '#e3f2fd', color: c.discount_type === 'fixed' ? '#388e3c' : '#1a3560', borderRadius: 4, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>
                        {c.discount_type === 'fixed' ? `¥${c.discount_value.toLocaleString()} OFF` : `${c.discount_value}% OFF`}
                      </span>
                      {!c.is_active && <span style={{ background: '#f5f5f5', color: '#999', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>無効</span>}
                      {isExpired && <span style={{ background: '#fce4ec', color: '#c62828', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>期限切れ</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#777', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>使用: {c.used_count || 0}{c.max_uses ? `/${c.max_uses}回` : '回'}</span>
                      {usagePercent !== null && <span>({usagePercent}%)</span>}
                      {c.valid_until && <span>期限: {new Date(c.valid_until).toLocaleDateString('ja-JP')}</span>}
                      {c.description && <span>📝 {c.description}</span>}
                    </div>
                    {c.max_uses && (
                      <div style={{ marginTop: 8, height: 4, background: '#f0f0f0', borderRadius: 2, width: 200, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, usagePercent)}%`, height: '100%', background: usagePercent >= 90 ? '#c62828' : '#388e3c', borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleActive(c)}
                      style={{ background: c.is_active ? '#ffebee' : '#e8f5e9', color: c.is_active ? '#c62828' : '#388e3c', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {c.is_active ? '無効化' : '有効化'}
                    </button>
                    <button onClick={() => deleteCoupon(c.id)}
                      style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      削除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
