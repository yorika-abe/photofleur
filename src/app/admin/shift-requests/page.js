'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const TYPE_CONFIG = {
  both:   { label: '両方', color: '#7c5cbf', bg: '#ede7f6' },
  street: { label: 'ST',   color: '#0097a7', bg: '#e0f7fa' },
  studio: { label: 'Stu',  color: '#d81b60', bg: '#fce4ec' },
}
const TYPE_CYCLE = ['both', 'street', 'studio']

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function MonthCalendar({ year, month, selected, onToggle, onTypeChange }) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0',
            color: i === 0 ? '#e53935' : i === 6 ? '#1565c0' : '#999' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr = toDateStr(year, month, d)
          const sel = selected[dateStr]
          const dow = (firstDow + d - 1) % 7
          const isPast = dateStr < today
          const tc = sel ? TYPE_CONFIG[sel.type] : null

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <button
                type="button"
                onClick={() => !isPast && onToggle(dateStr)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  border: 'none',
                  borderRadius: 8,
                  background: sel ? tc.color : 'transparent',
                  color: sel ? '#fff' : isPast ? '#ccc' : dow === 0 ? '#e53935' : dow === 6 ? '#1565c0' : '#333',
                  fontWeight: sel ? 700 : 400,
                  fontSize: 14,
                  cursor: isPast ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {d}
              </button>
              {sel && (
                <div style={{ display: 'flex', gap: 1 }}>
                  {TYPE_CYCLE.map(t => (
                    <button key={t} type="button" onClick={() => onTypeChange(dateStr, t)}
                      style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, cursor: 'pointer',
                        background: sel.type === t ? TYPE_CONFIG[t].color : '#ddd',
                        color: sel.type === t ? '#fff' : '#888', fontWeight: 700 }}>
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${DOW[d.getDay()]}）`
}

export default function ShiftRequestsPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState({}) // { '2026-05-01': { type: 'both' } }
  const [common, setCommon] = useState({ deadline: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/admin/shift-requests')
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function toggleDate(dateStr) {
    setSelected(prev => {
      if (prev[dateStr]) {
        const next = { ...prev }
        delete next[dateStr]
        return next
      }
      return { ...prev, [dateStr]: { type: 'both' } }
    })
  }

  function changeType(dateStr, type) {
    setSelected(prev => ({ ...prev, [dateStr]: { type } }))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const selectedEntries = Object.entries(selected).sort(([a], [b]) => a.localeCompare(b))

  async function submit(e) {
    e.preventDefault()
    if (selectedEntries.length === 0) { alert('日付を選択してください'); return }
    setSaving(true)

    // 種別ごとにグループ化してまとめてPOST
    const byType = {}
    for (const [date, { type }] of selectedEntries) {
      if (!byType[type]) byType[type] = []
      byType[type].push(date)
    }

    const typeEntries = Object.entries(byType)
    for (let i = 0; i < typeEntries.length; i++) {
      const [type, dates] = typeEntries[i]
      const isLast = i === typeEntries.length - 1
      const res = await fetch('/api/admin/shift-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates, event_type: type, deadline: common.deadline || null, notes: common.notes || null, notify: isLast }),
      })
      const data = await res.json()
      if (data?.error) { alert('エラー: ' + data.error); setSaving(false); return }
    }

    setSaving(false)
    setSelected({})
    setCommon({ deadline: '', notes: '' })
    setShowForm(false)
    load()
  }

  async function deleteRequest(id) {
    if (!confirm('この日付を削除しますか？')) return
    await fetch('/api/admin/shift-requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 28px' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: 0 }}>シフト提出指定日の管理</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '6px 0 0' }}>モデルにシフト提出を求める日付を登録します</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {showForm ? 'キャンセル' : '+ 日付を追加'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ background: '#fff', border: '2px solid #1a3560', borderRadius: 16, padding: '28px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>日付を選択</h2>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 20px' }}>日付をクリックして選択。各日付の下のボタンで種別（両方 / ST＝ストリート / Stu＝スタジオ）を切り替えてください。</p>

          {/* カレンダー凡例 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: v.color }} />
                <span style={{ color: '#555' }}>{v.label === 'ST' ? 'ストリート' : v.label === 'Stu' ? 'スタジオ' : '両方'}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
            {/* カレンダー */}
            <div>
              {/* 月ナビ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <button type="button" onClick={prevMonth}
                  style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 16 }}>‹</button>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>
                  {viewYear}年{viewMonth + 1}月
                </span>
                <button type="button" onClick={nextMonth}
                  style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 16 }}>›</button>
              </div>
              <MonthCalendar
                year={viewYear} month={viewMonth}
                selected={selected}
                onToggle={toggleDate}
                onTypeChange={changeType}
              />
            </div>

            {/* 選択済み一覧 */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3560', marginBottom: 10 }}>
                選択中：{selectedEntries.length}日
              </div>
              {selectedEntries.length === 0 ? (
                <p style={{ fontSize: 13, color: '#bbb' }}>カレンダーから日付を選択してください</p>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {selectedEntries.map(([dateStr, { type }]) => {
                    const tc = TYPE_CONFIG[type]
                    const d = new Date(dateStr + 'T00:00:00')
                    const dow = d.getDay()
                    return (
                      <div key={dateStr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', borderRadius: 8, padding: '7px 10px', border: '1px solid #eee' }}>
                        <span style={{ fontSize: 13, color: dow === 0 ? '#e53935' : dow === 6 ? '#1565c0' : '#333', fontWeight: 600 }}>
                          {String(d.getMonth() + 1).padStart(2, '0')}/{String(d.getDate()).padStart(2, '0')}（{DOW[dow]}）
                        </span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {TYPE_CYCLE.map(t => (
                            <button key={t} type="button" onClick={() => changeType(dateStr, t)}
                              style={{ fontSize: 11, padding: '3px 7px', border: 'none', borderRadius: 5, cursor: 'pointer',
                                background: type === t ? tc.color : '#e8e8e8',
                                color: type === t ? '#fff' : '#888', fontWeight: 700 }}>
                              {TYPE_CONFIG[t].label}
                            </button>
                          ))}
                          <button type="button" onClick={() => toggleDate(dateStr)}
                            style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 共通設定 */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>シフト提出締め切り日（全日共通）</label>
              <input type="date" style={inp} value={common.deadline}
                onChange={e => setCommon(c => ({ ...c, deadline: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>メモ（モデルへの連絡事項）</label>
              <input style={inp} value={common.notes}
                onChange={e => setCommon(c => ({ ...c, notes: e.target.value }))}
                placeholder="衣装の指定など" />
            </div>
          </div>

          <button type="submit" disabled={saving || selectedEntries.length === 0}
            style={{ marginTop: 20, background: selectedEntries.length === 0 ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 36px', cursor: selectedEntries.length === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : `${selectedEntries.length}日分を登録する`}
          </button>
        </form>
      )}

      {/* 登録済みリスト */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>読み込み中...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p>まだシフト指定日が登録されていません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {requests.map(r => {
            const isPast = r.request_date < new Date().toISOString().split('T')[0]
            const tc = TYPE_CONFIG[r.event_type] || TYPE_CONFIG.both
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: isPast ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{formatDate(r.request_date)}</span>
                      <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                        {r.event_type === 'street' ? 'ストリート' : r.event_type === 'studio' ? 'スタジオ' : '両方'}
                      </span>
                      {isPast && <span style={{ fontSize: 10, color: '#ccc' }}>過去</span>}
                    </div>
                    {r.deadline && <div style={{ fontSize: 11, color: '#aaa' }}>締め切り：{formatDate(r.deadline)}</div>}
                    {r.notes && <div style={{ fontSize: 12, color: '#666' }}>{r.notes}</div>}
                  </div>
                </div>
                <button onClick={() => deleteRequest(r.id)}
                  style={{ background: 'none', border: '1px solid #eee', color: '#e53935', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  削除
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
