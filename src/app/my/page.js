'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export default function MyPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [bookings, setBookings] = useState([])
  const [form, setForm] = useState({ last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', phone: '', sns_url: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/my'; return }

      const [profileRes, bookingsRes] = await Promise.all([
        fetch('/api/customer/profile'),
        fetch('/api/customer/bookings'),
      ])
      const { profile, email: userEmail } = await profileRes.json()
      const { bookings } = await bookingsRes.json()

      setEmail(userEmail || user.email || '')
      setBookings(bookings || [])
      if (profile) {
        setForm({
          last_name: profile.last_name || '',
          first_name: profile.first_name || '',
          last_name_kana: profile.last_name_kana || '',
          first_name_kana: profile.first_name_kana || '',
          phone: profile.phone || '',
          sns_url: profile.sns_url || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>マイページ</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>{email}</p>

      {/* Profile form */}
      <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5', marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>登録情報</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -12 }}>予約フォームに自動入力されます</p>

        {saved && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#388e3c' }}>
            保存しました
          </div>
        )}

        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>姓</label><input style={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="山田" /></div>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>名</label><input style={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="太郎" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>せい（カナ）</label><input style={inp} value={form.last_name_kana} onChange={e => setForm(f => ({ ...f, last_name_kana: e.target.value }))} placeholder="ヤマダ" /></div>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>めい（カナ）</label><input style={inp} value={form.first_name_kana} onChange={e => setForm(f => ({ ...f, first_name_kana: e.target.value }))} placeholder="タロウ" /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>電話番号</label>
            <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>SNS URL（Instagram / X など）</label>
            <input style={inp} value={form.sns_url} onChange={e => setForm(f => ({ ...f, sns_url: e.target.value }))} placeholder="https://instagram.com/..." />
          </div>
          <button type="submit" disabled={saving} style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '保存する'}
          </button>
        </form>
      </section>

      {/* Booking history */}
      <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>予約履歴</h2>
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#bbb' }}>
            <p style={{ marginBottom: 16 }}>まだ予約履歴がありません。</p>
            <Link href="/schedule" style={{ color: '#1a3560', fontWeight: 600, fontSize: 14 }}>スケジュールを見る →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookings.map(b => {
              const typeLabel = b.event_type === 'street' ? 'ストリート' : b.event_type === 'studio' ? 'スタジオ' : ''
              const typeColor = b.event_type === 'street' ? { bg: '#e8f5e9', color: '#388e3c' } : { bg: '#e8eaf6', color: '#3949ab' }
              const isPaid = b.payment_method === 'card'
              return (
                <div key={b.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e8f4fb', background: '#f8fbff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        {typeLabel && <span style={{ fontSize: 11, background: typeColor.bg, color: typeColor.color, borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>{typeLabel}</span>}
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{formatDate(b.event_date)}</span>
                        <span style={{ fontSize: 13, color: '#555' }}>{b.slot_label}</span>
                      </div>
                      {b.model_name && <div style={{ fontSize: 13, color: '#888' }}>モデル：{b.model_name}</div>}
                      {b.location_name && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{b.location_name}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 15 }}>¥{(b.final_price || 0).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: isPaid ? '#388e3c' : '#e65100', marginTop: 2 }}>
                        {isPaid ? '💳 カード済み' : '💴 現金払い'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
