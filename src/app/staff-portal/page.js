'use client'

import { useEffect, useState } from 'react'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}（${DOW[dt.getDay()]}）`
}

function RecruitCard({ r, onApply, applying }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const myApp = r.my_application
  const isClosed = r.status === 'closed'
  const hasApplied = !!myApp && myApp.status !== 'cancelled'
  const isConfirmed = myApp?.status === 'confirmed'

  function label() {
    if (r.type === 'custom') {
      const typeLabel = r.shoot_type === 'request' ? 'リクエスト撮影' : '通常撮影会'
      return (
        <div>
          <span style={{ fontWeight: 700 }}>{fmtDate(r.recruit_date)}</span>
          <span style={{ marginLeft: 6 }}>📍{r.location || '未定'}</span>
          <span style={{ marginLeft: 6, color: '#555' }}>{r.shoot_time || '未定'}</span>
          <span style={{ marginLeft: 8, fontSize: 12, background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '2px 7px' }}>{typeLabel}</span>
        </div>
      )
    }
    if (r.type === 'event') {
      const e = r.event
      if (!e) return <span style={{ color: '#aaa' }}>イベント情報なし</span>
      return (
        <div>
          <span style={{ fontWeight: 700 }}>{fmtDate(e.event_date)}</span>
          <span style={{ marginLeft: 6 }}>📍{e.title}</span>
          {e.subtitle && <span style={{ marginLeft: 4, fontSize: 12, color: '#666' }}>{e.subtitle}</span>}
        </div>
      )
    }
    if (r.type === 'request') {
      const b = r.booking
      if (!b) return <span style={{ color: '#aaa' }}>予約情報なし</span>
      const modelName = b.private_products?.models?.name || ''
      return (
        <div>
          <span style={{ fontWeight: 700 }}>{fmtDate(b.event_date_input) || '未定'}</span>
          <span style={{ marginLeft: 6 }}>📍{b.meeting_place || '未定'}</span>
          <span style={{ marginLeft: 6, color: '#555' }}>{b.shooting_time || ''}</span>
          <span style={{ marginLeft: 8, fontSize: 12, background: '#fce4ec', color: '#c2185b', borderRadius: 4, padding: '2px 7px' }}>リクエスト撮影</span>
          {modelName && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>モデル：{modelName}</div>}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{
      background: '#fff', border: `1px solid ${isConfirmed ? '#a5d6a7' : hasApplied ? '#90caf9' : '#e5e5e5'}`,
      borderRadius: 12, padding: '16px 18px',
      borderLeft: `4px solid ${isConfirmed ? '#388e3c' : hasApplied ? '#1565c0' : '#ddd'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {label()}
          <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
            応募{r.counts?.total || 0}名 / 定員{r.capacity}名
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {isConfirmed ? (
            <span style={{ background: '#388e3c', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>✅ スタッフ確定</span>
          ) : hasApplied ? (
            <span style={{ background: '#1565c0', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>応募済み</span>
          ) : isClosed ? (
            <span style={{ background: '#ccc', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>募集締切</span>
          ) : (
            <button onClick={() => setExpanded(v => !v)}
              style={{ background: '#06c755', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              スタッフとして応募する
            </button>
          )}
        </div>
      </div>

      {expanded && !hasApplied && !isClosed && (
        <div style={{ marginTop: 14, borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
          {!confirmed ? (
            <div>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>応募を確定しますか？</p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#aaa', lineHeight: 1.8 }}>
                ※応募確定後はキャンセル不可能です。<br />
                ※確定ラインにてスタッフ確定となります。
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setExpanded(false)}
                  style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer' }}>
                  キャンセル
                </button>
                <button onClick={async () => {
                  await onApply(r.id)
                  setExpanded(false)
                  setConfirmed(false)
                }} disabled={applying}
                  style={{ flex: 2, background: applying ? '#ccc' : '#06c755', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {applying ? '応募中...' : '応募する'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default function StaffPortalPage() {
  const [recruitments, setRecruitments] = useState([])
  const [newCount, setNewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/staff-portal/staff-recruit')
    if (res.ok) {
      const data = await res.json()
      setRecruitments(data.recruitments || [])
      setNewCount(data.newCount || 0)
    }
    setLoading(false)
  }

  async function handleApply(recruitmentId) {
    setApplying(true)
    const res = await fetch('/api/staff-portal/staff-recruit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recruitment_id: recruitmentId }),
    })
    setApplying(false)
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'エラーが発生しました')
    }
    load()
  }

  const open = recruitments.filter(r => r.status === 'open')
  const others = recruitments.filter(r => r.status !== 'open')

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>受付スタッフ画面</h1>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 28 }}>スタッフとして参加できる募集に応募してください。</p>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '20px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🐈‍⬛</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>スタッフ募集日</span>
          {newCount > 0 && (
            <span style={{ background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              新着 {newCount}件
            </span>
          )}
        </div>

        {loading ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
        ) : recruitments.length === 0 ? (
          <p style={{ color: '#bbb', fontSize: 13 }}>現在募集はありません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {open.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#388e3c', marginBottom: 2 }}>📢 募集中</div>
                {open.map(r => <RecruitCard key={r.id} r={r} onApply={handleApply} applying={applying} />)}
              </>
            )}
            {others.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', marginTop: 8, marginBottom: 2 }}>過去の募集</div>
                {others.map(r => <RecruitCard key={r.id} r={r} onApply={handleApply} applying={applying} />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
