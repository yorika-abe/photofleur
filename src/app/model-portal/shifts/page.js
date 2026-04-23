'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const TIME_SLOTS_STREET = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const TIME_SLOTS_STUDIO = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

export default function ModelShiftsPage() {
  const [user, setUser] = useState(null)
  const [model, setModel] = useState(null)
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ event_date: '', event_type: 'street', notes: '' })
  const [selectedTimes, setSelectedTimes] = useState([])
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?redirect=/model-portal/shifts'
        return
      }
      setUser(user)

      const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', user.id).single()
      const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
      if (!roles.includes('model')) {
        window.location.href = '/'
        return
      }

      // Find associated model
      const { data: modelData } = await supabase
        .from('models')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setModel(modelData)

      if (modelData) {
        const { data: shiftData } = await supabase
          .from('model_shifts')
          .select('*')
          .eq('model_id', modelData.id)
          .order('event_date', { ascending: false })
        setShifts(shiftData || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  function toggleTime(time) {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }

  async function submitShift(e) {
    e.preventDefault()
    if (!model) return
    if (selectedTimes.length === 0) {
      alert('出演可能な時間枠を選択してください。')
      return
    }

    setSaving(true)

    const availableSlots = selectedTimes.sort().map(time => {
      const [h, m] = time.split(':').map(Number)
      const endH = h + 1
      return { start: time, end: `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
    })

    // 締め切りチェック：提出月の10日23:59まで通常提出、以降は承認待ち
    const targetDate = new Date(form.event_date)
    const deadline = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 10, 23, 59, 59)
    const now = new Date()
    const isPastDeadline = now > deadline
    const submitStatus = isPastDeadline ? 'pending_approval' : 'submitted'

    const { error } = await supabase.from('model_shifts').insert({
      model_id: model.id,
      event_date: form.event_date,
      event_type: form.event_type,
      available_slots: availableSlots,
      notes: form.notes || null,
      status: submitStatus,
    })

    if (!error && isPastDeadline) {
      alert('締め切りを過ぎているため、運営の承認後に反映されます。')
    }

    if (!error) {
      const { data: updated } = await supabase
        .from('model_shifts')
        .select('*')
        .eq('model_id', model.id)
        .order('event_date', { ascending: false })
      setShifts(updated || [])
      setShowForm(false)
      setForm({ event_date: '', event_type: 'street', notes: '' })
      setSelectedTimes([])
    }

    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  const timeOptions = form.event_type === 'street' ? TIME_SLOTS_STREET : TIME_SLOTS_STUDIO

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>シフト提出</h1>
      {model && <p style={{ color: '#666', marginBottom: 32, fontSize: 15 }}>{model.name} さん、こんにちは。出演可能日を登録してください。</p>}

      {!model && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 12, padding: '20px', marginBottom: 32 }}>
          <p style={{ color: '#795548', margin: 0, fontSize: 14 }}>
            モデルアカウントが設定されていません。運営にご連絡ください。
          </p>
        </div>
      )}

      {model && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {showForm ? 'キャンセル' : '+ シフトを追加'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={submitShift} style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '2px solid #2f2244', marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2f2244', marginBottom: 20 }}>出演可能日を登録</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>日付 *</label>
                  <input type="date" required value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>撮影種類 *</label>
                  <select value={form.event_type} onChange={e => { setForm(f => ({ ...f, event_type: e.target.value })); setSelectedTimes([]) }}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                    <option value="street">ストリート（4枠）</option>
                    <option value="studio">スタジオ（7枠）</option>
                    <option value="irregular">不定期</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>出演可能な時間帯（複数選択可）</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {timeOptions.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleTime(time)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '2px solid',
                        borderColor: selectedTimes.includes(time) ? '#2f2244' : '#ddd',
                        background: selectedTimes.includes(time) ? '#2f2244' : '#fff',
                        color: selectedTimes.includes(time) ? '#fff' : '#555',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {time}〜
                    </button>
                  ))}
                </div>
                {selectedTimes.length > 0 && (
                  <p style={{ fontSize: 13, color: '#2f2244', marginTop: 8 }}>{selectedTimes.length}枠選択中</p>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>備考・コメント</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                  placeholder="衣装や注意事項があれば記入してください" />
              </div>

              <button type="submit" disabled={saving}
                style={{ background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                {saving ? '送信中...' : 'シフトを提出'}
              </button>
            </form>
          )}

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2f2244', marginBottom: 16 }}>提出済みシフト</h2>
          {shifts.length === 0 ? (
            <p style={{ color: '#999' }}>まだシフトを提出していません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {shifts.map(shift => {
                const d = new Date(shift.event_date)
                const days = ['日', '月', '火', '水', '木', '金', '土']
                const dateStr = `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
                const slots = shift.available_slots || []

                return (
                  <div key={shift.id} style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #e5e5e5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 17, color: '#2f2244', marginBottom: 4 }}>{dateStr}</div>
                        <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                          {shift.event_type === 'street' ? 'ストリート' : shift.event_type === 'studio' ? 'スタジオ' : '不定期'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {slots.map(s => (
                            <span key={s.start} style={{ background: '#f8f5ff', border: '1px solid #e0d5f5', borderRadius: 6, padding: '3px 10px', fontSize: 13, color: '#2f2244', fontWeight: 600 }}>
                              {s.start}〜{s.end}
                            </span>
                          ))}
                        </div>
                        {shift.notes && <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>{shift.notes}</p>}
                      </div>
                      <span style={{
                        background: shift.status === 'submitted' ? '#e3f2fd' : shift.status === 'confirmed' ? '#e8f5e9' : '#fce4ec',
                        color: shift.status === 'submitted' ? '#1565c0' : shift.status === 'confirmed' ? '#388e3c' : '#c62828',
                        borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 600,
                      }}>
                        {shift.status === 'submitted' ? '提出済み' : shift.status === 'confirmed' ? '確定' : '却下'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
