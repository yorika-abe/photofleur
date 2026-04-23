'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

const EVENT_TYPE_LABELS = { street: 'ストリート', studio: 'スタジオ', both: '両方' }
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${DOW_LABELS[d.getDay()]}）`
}

function datesBetween(from, to, dowFilter) {
  const result = []
  const cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end) {
    if (dowFilter.length === 0 || dowFilter.includes(cur.getDay())) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      result.push(`${y}-${m}-${d}`)
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

const defaultCommon = { event_type: 'both', notes: '', deadline: '' }

export default function ShiftRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState('single') // 'single' | 'range'
  const [saving, setSaving] = useState(false)

  // 単日
  const [single, setSingle] = useState({ request_date: '', ...defaultCommon })

  // 期間
  const [range, setRange] = useState({ from: '', to: '', dowFilter: [], ...defaultCommon })

  const previewDates = useMemo(() => {
    if (mode !== 'range' || !range.from || !range.to || range.from > range.to) return []
    return datesBetween(range.from, range.to, range.dowFilter)
  }, [mode, range.from, range.to, range.dowFilter])

  async function load() {
    const res = await fetch('/api/admin/shift-requests')
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggleDow(dow) {
    setRange(r => ({
      ...r,
      dowFilter: r.dowFilter.includes(dow)
        ? r.dowFilter.filter(d => d !== dow)
        : [...r.dowFilter, dow],
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)

    let body
    if (mode === 'single') {
      if (!single.request_date) { setSaving(false); return }
      body = { request_date: single.request_date, event_type: single.event_type, notes: single.notes, deadline: single.deadline }
    } else {
      if (previewDates.length === 0) { alert('対象の日付がありません'); setSaving(false); return }
      body = { dates: previewDates, event_type: range.event_type, notes: range.notes, deadline: range.deadline }
    }

    const res = await fetch('/api/admin/shift-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (data?.error) { alert('エラー: ' + data.error); return }

    setSingle({ request_date: '', ...defaultCommon })
    setRange({ from: '', to: '', dowFilter: [], ...defaultCommon })
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
  const common = mode === 'single' ? single : range
  const setCommon = (key, val) => mode === 'single'
    ? setSingle(f => ({ ...f, [key]: val }))
    : setRange(f => ({ ...f, [key]: val }))

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 32px' }}>
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
        <form onSubmit={submit} style={{ background: '#fff', border: '2px solid #1a3560', borderRadius: 14, padding: '28px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>シフト提出日を追加</h2>

          {/* モード切替 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[['single', '1日だけ'], ['range', '期間で一括追加']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setMode(key)}
                style={{ padding: '8px 18px', borderRadius: 20, border: '2px solid', borderColor: mode === key ? '#1a3560' : '#ddd', background: mode === key ? '#1a3560' : '#fff', color: mode === key ? '#fff' : '#888', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* 日付入力 */}
          {mode === 'single' ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>指定日 *</label>
              <input type="date" required style={inp} value={single.request_date}
                onChange={e => setSingle(f => ({ ...f, request_date: e.target.value }))} />
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>期間 *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input type="date" style={{ ...inp, width: 'auto', flex: 1, minWidth: 140 }} value={range.from}
                  onChange={e => setRange(f => ({ ...f, from: e.target.value }))} />
                <span style={{ color: '#888', whiteSpace: 'nowrap' }}>〜</span>
                <input type="date" style={{ ...inp, width: 'auto', flex: 1, minWidth: 140 }} value={range.to}
                  onChange={e => setRange(f => ({ ...f, to: e.target.value }))} />
              </div>

              {/* 曜日フィルター */}
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>曜日を絞り込む（未選択＝全日）</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {DOW_LABELS.map((label, dow) => {
                  const active = range.dowFilter.includes(dow)
                  const isWeekend = dow === 0 || dow === 6
                  return (
                    <button key={dow} type="button" onClick={() => toggleDow(dow)}
                      style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid', borderColor: active ? '#1a3560' : '#ddd', background: active ? '#1a3560' : '#fff', color: active ? '#fff' : isWeekend ? '#e53935' : '#555', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      {label}
                    </button>
                  )
                })}
                {range.dowFilter.length > 0 && (
                  <button type="button" onClick={() => setRange(r => ({ ...r, dowFilter: [] }))}
                    style={{ padding: '0 12px', borderRadius: 20, border: '1px solid #ddd', background: '#fff', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>
                    クリア
                  </button>
                )}
              </div>

              {/* プレビュー */}
              {previewDates.length > 0 && (
                <div style={{ background: '#f0f7fb', borderRadius: 10, padding: '12px 16px', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3560', marginBottom: 8 }}>
                    追加予定：{previewDates.length}日間
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {previewDates.slice(0, 40).map(d => {
                      const date = new Date(d + 'T00:00:00')
                      const dow = date.getDay()
                      return (
                        <span key={d} style={{ fontSize: 12, background: '#fff', border: '1px solid #c8e8f5', borderRadius: 6, padding: '3px 8px', color: dow === 0 || dow === 6 ? '#e53935' : '#333' }}>
                          {String(date.getMonth() + 1).padStart(2, '0')}/{String(date.getDate()).padStart(2, '0')}（{DOW_LABELS[dow]}）
                        </span>
                      )
                    })}
                    {previewDates.length > 40 && <span style={{ fontSize: 12, color: '#aaa' }}>...他{previewDates.length - 40}件</span>}
                  </div>
                </div>
              )}
              {range.from && range.to && range.from <= range.to && previewDates.length === 0 && (
                <p style={{ fontSize: 12, color: '#e53935' }}>選択した曜日に該当する日がありません</p>
              )}
            </div>
          )}

          {/* 共通設定 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>撮影種別</label>
              <select style={inp} value={common.event_type} onChange={e => setCommon('event_type', e.target.value)}>
                <option value="both">両方（ストリート・スタジオ）</option>
                <option value="street">ストリートのみ</option>
                <option value="studio">スタジオのみ</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>シフト提出締め切り日</label>
              <input type="date" style={inp} value={common.deadline} onChange={e => setCommon('deadline', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>メモ（モデルへの連絡事項など）</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={common.notes}
              onChange={e => setCommon('notes', e.target.value)}
              placeholder="衣装の指定や注意事項があれば" />
          </div>

          <button type="submit" disabled={saving}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', cursor: 'pointer', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : mode === 'range' ? `${previewDates.length}日分を追加する` : '追加する'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(r => {
            const isPast = r.request_date < new Date().toISOString().split('T')[0]
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: isPast ? 0.55 : 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{formatDate(r.request_date)}</span>
                    <span style={{ fontSize: 11, background: '#e8f0fb', color: '#1a3560', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                      {EVENT_TYPE_LABELS[r.event_type] || r.event_type}
                    </span>
                    {isPast && <span style={{ fontSize: 11, color: '#ccc' }}>過去</span>}
                  </div>
                  {r.deadline && <div style={{ fontSize: 11, color: '#aaa' }}>締め切り：{formatDate(r.deadline)}</div>}
                  {r.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{r.notes}</div>}
                </div>
                <button onClick={() => deleteRequest(r.id)}
                  style={{ background: 'none', border: '1px solid #eee', color: '#e53935', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
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
