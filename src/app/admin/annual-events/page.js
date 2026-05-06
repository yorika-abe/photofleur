'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function CheckBox({ checked, onChange, label, color }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: color || '#555', userSelect: 'none' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: color, width: 14, height: 14 }} />
      {label}
    </label>
  )
}

export default function AnnualEventsPage() {
  const [events, setEvents] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ month: 1, day: 1, title: '', notify_model_group: true, notify_camera: false })
  const [saving, setSaving] = useState(false)
  const [sendState, setSendState] = useState({ sending: false, result: null })

  const currentMonth = new Date().getMonth() + 1

  useEffect(() => {
    fetch('/api/admin/annual-events')
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setModels(d.models || []); setLoading(false) })
  }, [])

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
    if (json.event) setEvents(prev => [...prev, json.event].sort((a, b) => a.month - b.month || a.day - b.day))
    setForm(f => ({ ...f, title: '' }))
    setSaving(false)
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
    const month = currentMonth

    // 当月のイベント一覧を構築
    const birthdays = getBirthdaysForMonth(month)
    const monthEvents = getEventsForMonth(month)

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
      setSendState({ sending: false, result: { error: '送信対象のイベントがありません' } })
      return
    }

    const eventsList = items.map(e => `${e.day}日　${e.title}`).join('\n')
    const tmplKey = channel === 'model_group' ? 'monthly_events_model' : 'monthly_events_camera'

    const tmplRes = await fetch('/api/admin/line-templates').then(r => r.json())
    const template = tmplRes.templates?.[tmplKey] || ''
    const message = template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (k === 'month') return String(month)
      if (k === 'events_list') return eventsList
      return ''
    })

    const lineChannel = channel === 'model_group' ? 'group' : 'camera'
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: lineChannel }),
    })
    const json = await res.json()
    setSendState({ sending: false, result: json.ok ? { ok: true, channel } : { error: json.error || '送信失敗' } })
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>🗓️ 年間イベント一覧</h1>
      </div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        毎月1日朝7時に当月のイベントをLINEで自動配信します。誕生日はモデル全体に自動で含まれます。
      </p>

      {/* 今月を手動送信 */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 10 }}>
          📣 今月（{currentMonth}月）の告知を今すぐ送る
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => sendNow('model_group')} disabled={!!sendState.sending}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: sendState.sending === 'model_group' ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {sendState.sending === 'model_group' ? '送信中...' : '👥 モデル全体へ送信'}
          </button>
          <button onClick={() => sendNow('camera')} disabled={!!sendState.sending}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: sendState.sending === 'camera' ? '#ccc' : '#e65100', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {sendState.sending === 'camera' ? '送信中...' : '📣 公式LINEへ送信'}
          </button>
          {sendState.result && (
            <span style={{ fontSize: 13, fontWeight: 600, color: sendState.result.ok ? '#2e7d32' : '#c62828' }}>
              {sendState.result.ok
                ? `✅ ${sendState.result.channel === 'model_group' ? 'モデル全体' : '公式LINE'}に送信しました`
                : `❌ ${sendState.result.error}`}
            </span>
          )}
        </div>
      </div>

      {/* イベント追加フォーム */}
      <div style={{ background: '#f0f8ff', borderRadius: 12, border: '1px solid #b3d9f5', padding: '16px 20px', marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>＋ イベントを追加</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>月</div>
            <select value={form.month} onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}>
              {months.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>日</div>
            <select value={form.day} onChange={e => setForm(f => ({ ...f, day: parseInt(e.target.value) }))}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}>
              {Array.from({ length: MONTH_DAYS[form.month - 1] }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}日</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>イベント名</div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例：クリスマス、バレンタイン..."
              onKeyDown={e => e.key === 'Enter' && addEvent()}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CheckBox checked={form.notify_model_group} onChange={v => setForm(f => ({ ...f, notify_model_group: v }))}
              label="👥 モデル全体" color="#1a3560" />
            <CheckBox checked={form.notify_camera} onChange={v => setForm(f => ({ ...f, notify_camera: v }))}
              label="📣 公式LINE" color="#e65100" />
          </div>
          <button onClick={addEvent} disabled={saving || !form.title.trim()}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: saving || !form.title.trim() ? '#ccc' : '#06c755', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {saving ? '追加中...' : '追加'}
          </button>
        </div>
      </div>

      {/* 月別リスト */}
      {loading ? (
        <p style={{ color: '#aaa', textAlign: 'center' }}>読み込み中...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {months.map(month => {
            const birthdays = getBirthdaysForMonth(month)
            const monthEvents = getEventsForMonth(month)
            const isCurrentMonth = month === currentMonth
            if (birthdays.length === 0 && monthEvents.length === 0) {
              return (
                <div key={month} style={{ background: '#fafafa', borderRadius: 10, border: '1px solid #eee', padding: '12px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: isCurrentMonth ? '#06c755' : '#888' }}>
                    {isCurrentMonth ? '▶ ' : ''}{MONTH_NAMES[month - 1]}
                    {isCurrentMonth && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: '#06c755' }}>今月</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#ccc', marginTop: 6 }}>登録なし</div>
                </div>
              )
            }
            return (
              <div key={month} style={{ background: '#fff', borderRadius: 12, border: `2px solid ${isCurrentMonth ? '#06c755' : '#e5e5e5'}`, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: isCurrentMonth ? '#f0fff4' : '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: isCurrentMonth ? '#2e7d32' : '#1a3560' }}>
                    {MONTH_NAMES[month - 1]}
                  </span>
                  {isCurrentMonth && <span style={{ fontSize: 11, background: '#06c755', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>今月</span>}
                  <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
                    {birthdays.length + monthEvents.length}件
                  </span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {/* 誕生日（読み取り専用） */}
                  {birthdays.map((b, i) => (
                    <div key={`b-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: '#fffde7' }}>
                      <span style={{ fontSize: 13, color: '#666', minWidth: 36, textAlign: 'right' }}>{month}/{b.day}</span>
                      <span style={{ flex: 1, fontSize: 14, color: '#333' }}>{b.title}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 11, color: '#1a3560', fontWeight: 600 }}>👥 自動</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>📣 なし</span>
                      </div>
                    </div>
                  ))}
                  {/* 年間イベント */}
                  {monthEvents.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderTop: '1px solid #f5f5f5' }}>
                      <span style={{ fontSize: 13, color: '#666', minWidth: 36, textAlign: 'right' }}>{month}/{ev.day}</span>
                      <span style={{ flex: 1, fontSize: 14, color: '#333' }}>{ev.title}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <CheckBox
                          checked={ev.notify_model_group}
                          onChange={v => toggleCheck(ev.id, 'notify_model_group', v)}
                          label="👥"
                          color="#1a3560"
                        />
                        <CheckBox
                          checked={ev.notify_camera}
                          onChange={v => toggleCheck(ev.id, 'notify_camera', v)}
                          label="📣"
                          color="#e65100"
                        />
                      </div>
                      <button onClick={() => deleteEvent(ev.id)}
                        style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #ffcdd2', background: '#fff', color: '#e53935', fontSize: 12, cursor: 'pointer' }}>
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
