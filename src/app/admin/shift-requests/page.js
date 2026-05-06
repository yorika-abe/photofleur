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
  const [listFilter, setListFilter] = useState('active')
  const [lineNotify, setLineNotify] = useState(null) // { deadline: 'YYYY-MM-DD' } | null
  const [lineSending, setLineSending] = useState(false)
  const [lineSent, setLineSent] = useState(false)

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
    const savedDeadline = common.deadline
    setSelected({})
    setCommon({ deadline: '', notes: '' })
    setShowForm(false)
    setLineSent(false)
    setLineNotify(savedDeadline ? { deadline: savedDeadline } : null)
    load()
  }

  async function sendShiftLineNotify() {
    if (!lineNotify) return
    setLineSending(true)
    const d = new Date(lineNotify.deadline + 'T00:00:00')
    const deadlineLabel = `${d.getMonth() + 1}月${d.getDate()}日`
    const tmplRes = await fetch('/api/admin/line-templates')
    const tmplData = await tmplRes.json()
    const template = tmplData.templates?.shift_open ?? `🗓️シフト提出が解放されました。\nモデル画面から確認して提出してください。\n締め切りは{{deadline}}までです！`
    const message = template.replace('{{deadline}}', deadlineLabel)
    await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: 'group' }),
    })
    setLineSending(false)
    setLineSent(true)
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
      <div style={{ display: 'flex', gap: 0, margin: '8px 0 0', borderBottom: '2px solid #e5e5e5' }}>
        <Link href="/admin/shifts" style={{ padding: '10px 24px', fontWeight: 600, fontSize: 15, color: '#999', borderBottom: '2px solid transparent', marginBottom: -2, textDecoration: 'none' }}>シフト承認</Link>
        <div style={{ padding: '10px 24px', fontWeight: 700, fontSize: 15, color: '#1a3560', borderBottom: '2px solid #1a3560', marginBottom: -2, cursor: 'default' }}>シフト指定日管理</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 28px' }}>
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

      {/* LINE告知バナー */}
      {lineNotify && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 14, marginBottom: 4 }}>💬 モデフルでLINE告知しますか？</div>
            <div style={{ fontSize: 13, color: '#388e3c' }}>
              🗓️シフト提出が解放されました。モデル画面から確認して提出してください。締め切りは{(() => { const d = new Date(lineNotify.deadline + 'T00:00:00'); return `${d.getMonth() + 1}月${d.getDate()}日` })()}までです！
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {lineSent ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>✅ 送信済み</span>
            ) : (
              <button onClick={sendShiftLineNotify} disabled={lineSending}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: lineSending ? '#ccc' : '#06c755', color: '#fff', fontWeight: 700, fontSize: 13, cursor: lineSending ? 'not-allowed' : 'pointer' }}>
                {lineSending ? '送信中...' : 'はい、送信する'}
              </button>
            )}
            <button onClick={() => setLineNotify(null)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#888', fontSize: 13, cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 登録済みリスト */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>読み込み中...</div>
      ) : (() => {
        const todayStr = new Date().toISOString().split('T')[0]
        const active = requests.filter(r => !r.deadline || r.deadline >= todayStr)
        const closed = requests.filter(r => r.deadline && r.deadline < todayStr)
        const displayed = listFilter === 'active' ? active : closed

        return (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'active', label: `募集中（${active.length}件）` },
                { key: 'closed', label: `締め切り済み（${closed.length}件）` },
              ].map(f => (
                <button key={f.key} onClick={() => setListFilter(f.key)}
                  style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: listFilter === f.key ? '#1a3560' : '#f0f0f0',
                    color: listFilter === f.key ? '#fff' : '#555' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {displayed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <p>{listFilter === 'active' ? 'まだシフト指定日が登録されていません' : '締め切り済みの指定日はありません'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayed.map(r => {
                  const tc = TYPE_CONFIG[r.event_type] || TYPE_CONFIG.both
                  const isClosed = r.deadline && r.deadline < todayStr
                  return (
                    <div key={r.id} style={{ background: '#fff', border: `1px solid ${isClosed ? '#e0e0e0' : '#e5e5e5'}`, borderRadius: 12, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: isClosed ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isClosed ? '#bbb' : tc.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{formatDate(r.request_date)}</span>
                            <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                              {r.event_type === 'street' ? 'ストリート' : r.event_type === 'studio' ? 'スタジオ' : '両方'}
                            </span>
                            {isClosed && <span style={{ fontSize: 11, background: '#f5f5f5', color: '#999', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>締め切り済み</span>}
                          </div>
                          {r.deadline && <div style={{ fontSize: 11, color: isClosed ? '#e53935' : '#aaa', marginTop: 2 }}>締め切り：{formatDate(r.deadline)}</div>}
                          {r.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{r.notes}</div>}
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
          </>
        )
      })()}
    </div>
  )
}
