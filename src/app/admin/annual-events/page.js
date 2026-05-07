'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export default function AnnualEventsPage() {
  const currentMonth = new Date().getMonth() + 1
  const nextMonth = (currentMonth % 12) + 1
  const orderedMonths = Array.from({ length: 12 }, (_, i) => ((currentMonth - 1 + i) % 12) + 1)

  const [events, setEvents] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [openMonths, setOpenMonths] = useState(new Set([currentMonth, nextMonth]))
  const [form, setForm] = useState({ month: currentMonth, day: 1, title: '', notify_model_group: true, notify_camera: false })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [sendState, setSendState] = useState({ sending: null, result: null })

  useEffect(() => {
    fetch('/api/admin/annual-events')
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setModels(d.models || []); setLoading(false) })
  }, [])

  function toggleMonth(month) {
    setOpenMonths(prev => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })
  }

  function getBirthdaysForMonth(month) {
    return models
      .filter(m => m.birthday && parseInt(m.birthday.split('-')[1]) === month)
      .map(m => ({ type: 'birthday', day: parseInt(m.birthday.split('-')[2]), title: `🎂 ${m.name}さんの誕生日` }))
      .sort((a, b) => a.day - b.day)
  }

  function getEventsForMonth(month) {
    return events.filter(e => e.month === month).sort((a, b) => a.day - b.day)
  }

  async function addEvent() {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/annual-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.event) {
      setEvents(prev => [...prev, json.event].sort((a, b) => a.month - b.month || a.day - b.day))
      setOpenMonths(prev => new Set([...prev, form.month]))
    }
    setForm(f => ({ ...f, title: '' }))
    setSaving(false)
    setShowForm(false)
  }

  async function toggleCheck(id, field, value) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
    await fetch('/api/admin/annual-events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    })
  }

  async function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id))
    await fetch('/api/admin/annual-events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function sendNow(channel) {
    setSendState({ sending: channel, result: null })
    const birthdays = getBirthdaysForMonth(currentMonth)
    const monthEvents = getEventsForMonth(currentMonth)

    let items = []
    if (channel === 'model_group') {
      items = [
        ...birthdays,
        ...monthEvents.filter(e => e.notify_model_group).map(e => ({ day: e.day, title: e.title })),
      ].sort((a, b) => a.day - b.day)
    } else {
      items = monthEvents.filter(e => e.notify_camera).map(e => ({ day: e.day, title: e.title }))
        .sort((a, b) => a.day - b.day)
    }

    if (items.length === 0) {
      setSendState({ sending: null, result: { error: '送信対象のイベントがありません（チェックを確認してください）' } })
      return
    }

    const eventsList = items.map(e => `${e.day}日　${e.title}`).join('\n')
    const tmplKey = channel === 'model_group' ? 'monthly_events_model' : 'monthly_events_camera'
    const tmplRes = await fetch('/api/admin/line-templates').then(r => r.json())
    const template = tmplRes.templates?.[tmplKey] || ''
    const message = template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (k === 'month') return String(currentMonth)
      if (k === 'events_list') return eventsList
      return ''
    })

    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: channel === 'model_group' ? 'group' : 'camera' }),
    })
    const json = await res.json()
    setSendState({ sending: null, result: json.ok ? { ok: true, channel } : { error: json.error || '送信失敗' } })
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 14px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: 0 }}>🌱 年間イベント一覧</h1>
        <button onClick={() => setShowForm(v => !v)}
          style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: showForm ? '#eee' : '#06c755', color: showForm ? '#666' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {showForm ? '✕ 閉じる' : '＋ イベントを追加'}
        </button>
      </div>

      {/* イベント追加フォーム */}
      {showForm && (
        <div style={{ background: '#f0f8ff', borderRadius: 10, border: '1px solid #b3d9f5', padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>月</div>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value), day: 1 }))}
                style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #ccc', fontSize: 13 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>日</div>
              <select value={form.day} onChange={e => setForm(f => ({ ...f, day: parseInt(e.target.value) }))}
                style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #ccc', fontSize: 13 }}>
                {Array.from({ length: MONTH_DAYS[form.month - 1] }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>イベント名</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="例：クリスマス、バレンタイン"
                onKeyDown={e => e.key === 'Enter' && addEvent()}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.notify_model_group}
                  onChange={e => setForm(f => ({ ...f, notify_model_group: e.target.checked }))}
                  style={{ accentColor: '#1a3560' }} />
                <span style={{ color: '#1a3560', fontWeight: 600 }}>👥</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.notify_camera}
                  onChange={e => setForm(f => ({ ...f, notify_camera: e.target.checked }))}
                  style={{ accentColor: '#1a3560' }} />
                <span style={{ color: '#1a3560', fontWeight: 600 }}>📣</span>
              </label>
            </div>
            <button onClick={addEvent} disabled={saving || !form.title.trim()}
              style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: saving || !form.title.trim() ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {saving ? '追加中...' : '追加'}
            </button>
          </div>
        </div>
      )}

      {/* 今月の手動送信 */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e5e5', padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>📣 {currentMonth}月の告知を今すぐ送る</span>
        <button onClick={() => sendNow('model_group')} disabled={!!sendState.sending}
          style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: sendState.sending === 'model_group' ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {sendState.sending === 'model_group' ? '送信中...' : '👥 モデル全体'}
        </button>
        <button onClick={() => sendNow('camera')} disabled={!!sendState.sending}
          style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: sendState.sending === 'camera' ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {sendState.sending === 'camera' ? '送信中...' : '📣 公式LINE'}
        </button>
        {sendState.result && (
          <span style={{ fontSize: 12, fontWeight: 600, color: sendState.result.ok ? '#2e7d32' : '#c62828' }}>
            {sendState.result.ok ? `✅ 送信しました` : `❌ ${sendState.result.error}`}
          </span>
        )}
        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>毎月1日朝7時に自動配信</span>
      </div>

      {/* 凡例 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: '#888' }}>
        <span>👥 = モデル全体LINEに配信</span>
        <span>📣 = 公式LINEに配信</span>
        <span>🎂 = 誕生日（自動）</span>
      </div>

      {/* 月別リスト */}
      {loading ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>読み込み中...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {orderedMonths.map(month => {
            const birthdays = getBirthdaysForMonth(month)
            const monthEvents = getEventsForMonth(month)
            const isCurrentMonth = month === currentMonth
            const isNextMonth = month === nextMonth
            const isOpen = openMonths.has(month)
            const totalItems = birthdays.length + monthEvents.length

            return (
              <div key={month} style={{
                background: '#fff',
                borderRadius: 10,
                border: `1.5px solid ${isCurrentMonth ? '#06c755' : isNextMonth ? '#90caf9' : '#e5e5e5'}`,
                overflow: 'hidden',
              }}>
                {/* 月ヘッダー（クリックで開閉） */}
                <button
                  onClick={() => toggleMonth(month)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '9px 14px',
                    background: isCurrentMonth ? '#f0fff4' : isNextMonth ? '#e3f2fd' : '#fafafa',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: isOpen && totalItems > 0 ? '1px solid #eee' : 'none',
                  }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: isCurrentMonth ? '#2e7d32' : isNextMonth ? '#1565c0' : '#555' }}>
                    {MONTH_NAMES[month - 1]}
                  </span>
                  {isCurrentMonth && <span style={{ fontSize: 10, background: '#06c755', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>今月</span>}
                  {isNextMonth && <span style={{ fontSize: 10, background: '#1976d2', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>来月</span>}
                  <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>{totalItems > 0 ? `${totalItems}件` : '登録なし'}</span>
                  <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* イベント一覧 */}
                {isOpen && (
                  <div>
                    {totalItems === 0 ? (
                      <div style={{ padding: '8px 14px', fontSize: 12, color: '#ccc' }}>登録なし</div>
                    ) : (
                      <>
                        {birthdays.map((b, i) => (
                          <div key={`b-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: '#f8fbff', borderBottom: '1px solid #f5f5f5' }}>
                            <span style={{ fontSize: 12, color: '#888', minWidth: 32, textAlign: 'right' }}>{month}/{b.day}</span>
                            <span style={{ flex: 1, fontSize: 13 }}>{b.title}</span>
                            <span style={{ fontSize: 11, color: '#1a3560', fontWeight: 600 }}>👥 自動</span>
                          </div>
                        ))}
                        {monthEvents.map((ev, i) => (
                          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: i < monthEvents.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                            <span style={{ fontSize: 12, color: '#888', minWidth: 32, textAlign: 'right' }}>{month}/{ev.day}</span>
                            <span style={{ flex: 1, fontSize: 13, color: '#333' }}>{ev.title}</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: 12, color: ev.notify_model_group ? '#1a3560' : '#bbb', fontWeight: ev.notify_model_group ? 700 : 400 }}>
                              <input type="checkbox" checked={ev.notify_model_group}
                                onChange={e => toggleCheck(ev.id, 'notify_model_group', e.target.checked)}
                                style={{ accentColor: '#1a3560', width: 13, height: 13 }} />
                              👥
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: 12, color: ev.notify_camera ? '#1a3560' : '#bbb', fontWeight: ev.notify_camera ? 700 : 400 }}>
                              <input type="checkbox" checked={ev.notify_camera}
                                onChange={e => toggleCheck(ev.id, 'notify_camera', e.target.checked)}
                                style={{ accentColor: '#1a3560', width: 13, height: 13 }} />
                              📣
                            </label>
                            <button onClick={() => deleteEvent(ev.id)}
                              style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid #ffcdd2', background: '#fff', color: '#e53935', fontSize: 11, cursor: 'pointer' }}>
                              削除
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
