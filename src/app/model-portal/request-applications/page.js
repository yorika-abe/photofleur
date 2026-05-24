'use client'
import { useState, useEffect } from 'react'

const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d0e4f0', fontSize: 13, boxSizing: 'border-box' }

const STATUS_LABELS = { available: '参加可能', time_specified: '時間指定', unavailable: '不可' }
const STATUS_COLORS = { available: '#2e7d32', time_specified: '#e65100', unavailable: '#c62828' }

function PrefResponse({ pref, response, onChange }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #eef4f8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5bbfd6' }}>第{pref.preference_order}希望</span>
          <p style={{ fontSize: 13, color: '#1a3560', margin: '2px 0 0', fontWeight: 600 }}>
            {pref.preferred_date} {pref.time_range}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['available', 'time_specified', 'unavailable'].map(s => (
            <button key={s} type="button"
              onClick={() => onChange('status', s)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${STATUS_COLORS[s]}`,
                background: response.status === s ? STATUS_COLORS[s] : '#fff',
                color: response.status === s ? '#fff' : STATUS_COLORS[s],
                cursor: 'pointer',
              }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      {response.status === 'time_specified' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 2 }}>参加可能 開始</label>
            <input type="time" value={response.available_from || ''} onChange={e => onChange('available_from', e.target.value)} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 2 }}>参加可能 終了</label>
            <input type="time" value={response.available_until || ''} onChange={e => onChange('available_until', e.target.value)} style={inp} />
          </div>
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app, onResponded }) {
  const [responses, setResponses] = useState(
    app.preferences.map(p => ({ preference_order: p.preference_order, status: 'available', available_from: '', available_until: '' }))
  )
  const [transportFee, setTransportFee] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(app.responded)

  function updateResponse(i, field, value) {
    setResponses(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  async function handleSubmit() {
    setError('')
    const hasUnavailableAll = responses.every(r => r.status === 'unavailable')
    if (!hasUnavailableAll && !transportFee) { setError('往復交通費を入力してください'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/model-portal/request-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_model_id: app.application_model_id, responses, transport_fee: transportFee }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || '送信エラー'); setSubmitting(false); return }
      setDone(true)
      onResponded()
    } catch { setError('通信エラー'); setSubmitting(false) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #d6ecf5', padding: '20px', marginBottom: 16 }}>
      <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eef4f8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a3560' }}>📸 {app.nickname}</span>
          {app.deadline && (
            <span style={{ fontSize: 11, color: '#c62828', fontWeight: 700 }}>⚠️ 回答期日: {app.deadline}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>🔗 {app.sns_url}</p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', margin: '0 0 2px' }}>集合解散場所</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', margin: 0 }}>📍 {app.location}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', margin: '0 0 2px' }}>撮影時間</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', margin: 0 }}>⏰ {app.preferences[0]?.duration_hours}時間</p>
          </div>
        </div>
        {app.notes && <p style={{ fontSize: 12, color: '#556070', margin: '8px 0 0' }}>備考: {app.notes}</p>}
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', margin: '0 0 4px' }}>候補日時</p>

      {done ? (
        <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
          ✅ 回答済みです
        </div>
      ) : (
        <>
          {app.preferences.map((pref, i) => (
            <PrefResponse key={i} pref={pref} response={responses[i]}
              onChange={(field, value) => updateResponse(i, field, value)} />
          ))}

          {!responses.every(r => r.status === 'unavailable') && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: '#556070', display: 'block', marginBottom: 4 }}>往復交通費（円）</label>
              <input type="number" min="0" value={transportFee} onChange={e => setTransportFee(e.target.value)}
                placeholder="例: 1200" style={{ ...inp, maxWidth: 160 }} />
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: '#c62828', margin: '8px 0 0' }}>{error}</p>}

          <button onClick={handleSubmit} disabled={submitting}
            style={{ marginTop: 16, width: '100%', background: submitting ? '#aaa' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '送信中...' : '送信'}
          </button>
        </>
      )}
    </div>
  )
}

export default function RequestApplicationsPage() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    fetch('/api/model-portal/request-applications')
      .then(r => r.json())
      .then(d => { setApps(d.applications || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', padding: 'clamp(24px, 4vw, 48px) 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <a href="/model-portal" style={{ fontSize: 13, color: '#1a3560', textDecoration: 'none', display: 'block', marginBottom: 16 }}>← モデルポータル</a>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', marginBottom: 24 }}>🔗 リクエスト撮影申請</h1>

        {loading ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
        ) : apps.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            現在、依頼はありません
          </div>
        ) : (
          apps.map(app => (
            <ApplicationCard key={app.id} app={app} onResponded={load} />
          ))
        )}
      </div>
    </div>
  )
}
