'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}（${DOW[dt.getDay()]}）`
}

function getRecruitDate(r) {
  if (r.type === 'custom') return r.recruit_date || ''
  if (r.type === 'event') return r.event?.event_date || ''
  if (r.type === 'request') return r.booking?.event_date_input || ''
  return ''
}

function RecruitLabel({ r }) {
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

function RecruitCard({ r, onApply, applying }) {
  const [expanded, setExpanded] = useState(false)
  const myApp = r.my_application
  const isClosed = r.status === 'closed'
  const hasApplied = !!myApp && myApp.status !== 'cancelled'
  const isConfirmed = myApp?.status === 'confirmed'

  return (
    <div style={{
      background: '#fff', border: `1px solid ${isConfirmed ? '#a5d6a7' : hasApplied ? '#90caf9' : '#e5e5e5'}`,
      borderRadius: 10, padding: '10px 14px',
      borderLeft: `4px solid ${isConfirmed ? '#388e3c' : hasApplied ? '#1565c0' : '#ddd'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <RecruitLabel r={r} />
          <div style={{ marginTop: 2, fontSize: 11, color: '#aaa' }}>
            応募{r.counts?.total || 0}名 / 定員{r.capacity}名
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {isConfirmed ? (
            <span style={{ background: '#388e3c', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>✅ スタッフ確定</span>
          ) : hasApplied ? (
            <span style={{ background: '#1565c0', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>応募済み</span>
          ) : isClosed ? (
            <span style={{ background: '#ccc', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>募集締切</span>
          ) : (
            <button onClick={() => setExpanded(v => !v)}
              style={{ background: '#06c755', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              スタッフとして応募する
            </button>
          )}
        </div>
      </div>

      {expanded && !hasApplied && !isClosed && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13 }}>応募を確定しますか？</p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
            ※応募確定後はキャンセル不可能です。<br />
            ※確定ラインにてスタッフ確定となります。
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setExpanded(false)}
              style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '7px', fontSize: 12, cursor: 'pointer' }}>
              キャンセル
            </button>
            <button onClick={async () => { await onApply(r.id); setExpanded(false) }} disabled={applying}
              style={{ flex: 2, background: applying ? '#ccc' : '#06c755', color: '#fff', border: 'none', borderRadius: 6, padding: '7px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {applying ? '応募中...' : '応募する'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmedCard({ r }) {
  return (
    <div style={{ background: '#f0faf0', border: '1px solid #a5d6a7', borderLeft: '4px solid #388e3c', borderRadius: 10, padding: '10px 14px' }}>
      <RecruitLabel r={r} />
    </div>
  )
}

export default function StaffPortalPage() {
  const [recruitments, setRecruitments] = useState([])
  const [newCount, setNewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [profile, setProfile] = useState({ photo: '', name: '' })
  const [recruitOpen, setRecruitOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    load()
    fetch('/api/staff-portal/private-info')
      .then(r => r.json())
      .then(d => setProfile({ photo: d.profile_photo || '', name: d.display_name || d.real_name || '' }))
      .catch(() => {})
  }, [])

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

  const today = new Date().toISOString().split('T')[0]

  const open = recruitments.filter(r => r.status === 'open')
  const closed = recruitments.filter(r => r.status !== 'open')

  // 確定した担当日
  const confirmed = recruitments.filter(r => r.my_application?.status === 'confirmed')
  const confirmedUpcoming = confirmed
    .filter(r => (getRecruitDate(r) || '9999') >= today)
    .sort((a, b) => (getRecruitDate(a) || '').localeCompare(getRecruitDate(b) || ''))
  const confirmedPast = confirmed
    .filter(r => getRecruitDate(r) < today)
    .sort((a, b) => (getRecruitDate(b) || '').localeCompare(getRecruitDate(a) || ''))

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>受付スタッフ画面</h1>
        <Link href="/staff-portal/guide" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f0f4f8', border: '2px solid #e5e5e5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {profile.photo
              ? <img src={profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 20 }}>🐈‍⬛</span>}
          </div>
          {profile.name && <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3560' }}>{profile.name}</span>}
        </Link>
      </div>
      <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>スタッフとして参加できる募集に応募してください。</p>

      {/* ナビカード */}
      <Link href="/staff-portal/guide" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '12px 16px', marginBottom: 10, textDecoration: 'none' }}>
        <span style={{ fontSize: 20 }}>📖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>スタッフ活動の手引き</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>活動マニュアル・注意事項</div>
        </div>
        <span style={{ color: '#aaa', fontSize: 16 }}>›</span>
      </Link>

      <Link href="/staff-portal/private-info" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '12px 16px', marginBottom: 14, textDecoration: 'none' }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>非公開情報・スタッフ規約</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>本名・連絡先の登録と規約への同意</div>
        </div>
        <span style={{ color: '#aaa', fontSize: 16 }}>›</span>
      </Link>

      {/* スタッフ募集日（折りたたみ） */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', marginBottom: 12, overflow: 'hidden' }}>
        <button onClick={() => setRecruitOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 20 }}>🐈‍⬛</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#1a3560', flex: 1 }}>スタッフ募集日</span>
          {newCount > 0 && !recruitOpen && (
            <span style={{ background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              新着 {newCount}件
            </span>
          )}
          <span style={{ color: '#aaa', fontSize: 16 }}>{recruitOpen ? '▲' : '▼'}</span>
        </button>

        {recruitOpen && (
          <div style={{ padding: '0 16px 14px' }}>
            {loading ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
            ) : recruitments.length === 0 ? (
              <p style={{ color: '#bbb', fontSize: 13 }}>現在募集はありません。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {open.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#388e3c', marginBottom: 2 }}>📢 募集中</div>
                    {open.map(r => <RecruitCard key={r.id} r={r} onApply={handleApply} applying={applying} />)}
                  </>
                )}
                {closed.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', marginTop: 4, marginBottom: 2 }}>過去の募集</div>
                    {closed.map(r => <RecruitCard key={r.id} r={r} onApply={handleApply} applying={applying} />)}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 確定した担当日 */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: confirmedUpcoming.length > 0 || confirmedPast.length > 0 ? '1px solid #f0f0f0' : 'none' }}>
          <span style={{ fontSize: 20 }}>🐈‍⬛</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#1a3560' }}>確定した担当日</span>
          {confirmedUpcoming.length > 0 && (
            <span style={{ background: '#388e3c', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              {confirmedUpcoming.length}件
            </span>
          )}
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>読み込み中...</p>
          ) : confirmedUpcoming.length === 0 && confirmedPast.length === 0 ? (
            <p style={{ color: '#bbb', fontSize: 13, margin: 0 }}>確定した担当日はありません。</p>
          ) : (
            <>
              {confirmedUpcoming.map(r => <ConfirmedCard key={r.id} r={r} />)}

              {confirmedPast.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => setHistoryOpen(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#aaa', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {historyOpen ? '▲' : '▼'} 過去の担当履歴（{confirmedPast.length}件）
                  </button>
                  {historyOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {confirmedPast.map(r => (
                        <div key={r.id} style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderLeft: '4px solid #bbb', borderRadius: 10, padding: '10px 14px', opacity: 0.7 }}>
                          <RecruitLabel r={r} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
