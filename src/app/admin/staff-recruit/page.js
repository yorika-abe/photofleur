'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}（${DOW[dt.getDay()]}）`
}

function RecruitLabel({ r }) {
  if (r.type === 'custom') {
    const typeLabel = r.shoot_type === 'request' ? 'リクエスト撮影' : '通常撮影会'
    const models = (r.models_info || []).map(m => m.name).join('、')
    return (
      <div>
        <span style={{ fontWeight: 700 }}>{fmtDate(r.recruit_date)}</span>
        <span style={{ marginLeft: 6 }}>📍{r.location || '未定'}</span>
        <span style={{ marginLeft: 6, color: '#555' }}>{r.shoot_time || '未定'}</span>
        <span style={{ marginLeft: 6, fontSize: 12, background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '2px 7px' }}>{typeLabel}</span>
        {models && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>撮影モデル：{models}</div>}
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
        {b.event_date_input && <span style={{ fontWeight: 700 }}>({b.event_date_input})</span>}
        <span style={{ marginLeft: 6 }}>📍{b.meeting_place || '未定'}</span>
        <span style={{ marginLeft: 6, color: '#555' }}>{b.shooting_time || ''}</span>
        <span style={{ marginLeft: 6, fontSize: 12, background: '#fce4ec', color: '#c2185b', borderRadius: 4, padding: '2px 7px' }}>リクエスト撮影</span>
        {modelName && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>モデル：{modelName}</div>}
      </div>
    )
  }
  return null
}

function StatusBadge({ status }) {
  const m = { open: ['募集中', '#e8f5e9', '#388e3c'], closed: ['募集締切', '#fff8e1', '#f57f17'], cancelled: ['中止', '#ffebee', '#c62828'] }
  const [label, bg, color] = m[status] || ['?', '#eee', '#888']
  return <span style={{ background: bg, color, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{label}</span>
}

export default function StaffRecruitPage() {
  const [tab, setTab] = useState('confirm')
  const [recruitments, setRecruitments] = useState([])
  const [openEvents, setOpenEvents] = useState([])
  const [privateBookings, setPrivateBookings] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null) // null | 'custom' | 'event' | 'request'
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [pendingEntries, setPendingEntries] = useState([])

  // custom form
  const [customForm, setCustomForm] = useState({ recruit_date: '', shoot_type: 'normal', location: '', shoot_time: '', model_ids: [], capacity: 1 })
  // event/request: multiple selection
  const [selectedEventIds, setSelectedEventIds] = useState([])
  const [selectedBookingIds, setSelectedBookingIds] = useState([])
  const [eventCapacity, setEventCapacity] = useState(1)
  const [requestCapacity, setRequestCapacity] = useState(1)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/staff-recruit')
    const data = await res.json()
    setRecruitments(data.recruitments || [])
    setOpenEvents(data.openEvents || [])
    setPrivateBookings(data.privateBookings || [])
    setModels(data.models || [])
    setLoading(false)
  }

  function openModal() {
    setModalType(null)
    setCustomForm({ recruit_date: '', shoot_type: 'normal', location: '', shoot_time: '', model_ids: [], capacity: 1 })
    setSelectedEventIds([])
    setSelectedBookingIds([])
    setEventCapacity(1)
    setRequestCapacity(1)
    setShowModal(true)
  }

  function addToQueue() {
    let newEntries = []
    if (modalType === 'custom') {
      if (!customForm.recruit_date) return alert('募集日を入力してください')
      const typeLabel = customForm.shoot_type === 'request' ? 'リクエスト撮影' : '通常撮影会'
      const modelNames = (customForm.model_ids || []).map(id => models.find(m => m.id === id)?.name).filter(Boolean).join('、')
      const label = `${fmtDate(customForm.recruit_date)} 📍${customForm.location || '未定'}　${customForm.shoot_time || '未定'}（${typeLabel}）${modelNames ? `　${modelNames}` : ''}`
      newEntries = [{ type: 'custom', ...customForm, _label: label }]
    } else if (modalType === 'event') {
      if (!selectedEventIds.length) return alert('イベントを選択してください')
      newEntries = selectedEventIds.map(id => {
        const ev = openEvents.find(e => e.id === id)
        return { type: 'event', event_id: id, capacity: eventCapacity, _label: ev ? `${fmtDate(ev.event_date)} 📍${ev.title}` : id }
      })
    } else if (modalType === 'request') {
      if (!selectedBookingIds.length) return alert('予約を選択してください')
      newEntries = selectedBookingIds.map(id => {
        const b = privateBookings.find(b => b.id === id)
        const modelName = b?.private_products?.models?.name || ''
        return { type: 'request', private_booking_id: id, capacity: requestCapacity, _label: `${fmtDate(b?.event_date_input) || '未定'} 📍${b?.meeting_place || '未定'}${modelName ? `　${modelName}` : ''}` }
      })
    }
    setPendingEntries(prev => [...prev, ...newEntries])
    setShowModal(false)
  }

  async function handleSubmitAll() {
    if (!pendingEntries.length) return
    setSubmitting(true)
    const entries = pendingEntries.map(({ _label, ...e }) => e)
    const res = await fetch('/api/admin/staff-recruit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    setSubmitting(false)
    if (res.ok) { setPendingEntries([]); load() }
    else alert('エラーが発生しました')
  }

  async function handleAction(action, recruitment_id, application_id = null) {
    const key = application_id || recruitment_id
    setActionLoading(key)
    await fetch('/api/admin/staff-recruit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, recruitment_id, application_id }),
    })
    setActionLoading(null)
    load()
  }

  const tabStyle = active => ({
    padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
    background: active ? '#1a3560' : '#f0f0f0', color: active ? '#fff' : '#555',
  })

  const recruitList = recruitments.filter(r => r.status !== 'cancelled')
  const confirmList = recruitments

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a3560', margin: '8px 0 24px' }}>🐈‍⬛ スタッフ募集</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle(tab === 'confirm')} onClick={() => setTab('confirm')}>スタッフ確定状況</button>
        <button style={tabStyle(tab === 'recruit')} onClick={() => setTab('recruit')}>スタッフ募集日</button>
      </div>

      {loading ? <p style={{ color: '#999' }}>読み込み中...</p> : tab === 'recruit' ? (
        <div>
          <button onClick={openModal} style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
            ＋ 日付を追加
          </button>

          {pendingEntries.length > 0 && (
            <div style={{ marginBottom: 20, background: '#e8f5e9', border: '2px solid #81c784', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2e7d32', marginBottom: 10 }}>追加済み（{pendingEntries.length}件）— まだ募集開始していません</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {pendingEntries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 8, padding: '8px 14px', border: '1px solid #c8e6c9' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{e._label}</span>
                    <button onClick={() => setPendingEntries(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitAll} disabled={submitting}
                style={{ width: '100%', background: submitting ? '#ccc' : '#06c755', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? '送信中...' : `${pendingEntries.length}件まとめて募集開始してLINEで告知する`}
              </button>
            </div>
          )}

          {recruitList.length === 0 ? (
            <p style={{ color: '#999' }}>募集はありません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recruitList.map(r => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <StatusBadge status={r.status} />
                      <span style={{ fontSize: 12, color: '#aaa' }}>募集{r.capacity}名</span>
                      <span style={{ fontSize: 12, color: '#aaa' }}>応募{(r.applications || []).filter(a => a.status !== 'cancelled').length}名</span>
                    </div>
                    <RecruitLabel r={r} />
                  </div>
                  <button
                    onClick={() => { if (confirm('この募集を削除しますか？')) handleAction('delete', r.id) }}
                    disabled={actionLoading === r.id}
                    style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {confirmList.length === 0 ? (
            <p style={{ color: '#999' }}>募集はありません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {confirmList.map(r => {
                const apps = r.applications || []
                const activeApps = apps.filter(a => a.status !== 'cancelled')
                return (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                      <StatusBadge status={r.status} />
                      <div style={{ flex: 1 }}><RecruitLabel r={r} /></div>
                      <span style={{ fontSize: 12, color: '#aaa' }}>募集{r.capacity}名</span>
                    </div>
                    {activeApps.length === 0 ? (
                      <p style={{ color: '#bbb', fontSize: 13, margin: 0 }}>応募なし</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeApps.map(app => (
                          <div key={app.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, flexWrap: 'wrap',
                            background: app.status === 'confirmed' ? '#e8f5e9' : '#f8fbff',
                            border: `1px solid ${app.status === 'confirmed' ? '#a5d6a7' : '#ddd'}`,
                          }}>
                            <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{app.user_name || '（名前なし）'}</span>
                            {app.status === 'confirmed' && (
                              <span style={{ fontSize: 12, background: '#388e3c', color: '#fff', borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>確定済み</span>
                            )}
                            {app.status === 'applied' && (
                              <button
                                onClick={() => handleAction('confirm_application', r.id, app.id)}
                                disabled={actionLoading === app.id}
                                style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: actionLoading === app.id ? 0.6 : 1 }}>
                                {actionLoading === app.id ? '処理中...' : '確定'}
                              </button>
                            )}
                            <button
                              onClick={() => { if (confirm('この応募をキャンセルしますか？')) handleAction('cancel_application', r.id, app.id) }}
                              disabled={actionLoading === app.id}
                              style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              キャンセル
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px', maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>募集タイプを選択</h2>

            {!modalType ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'custom', label: '開催未定の募集', desc: '日付・場所・時間を手入力' },
                  { key: 'event', label: '公開済みのイベントから募集', desc: '公開中のイベントから選択' },
                  { key: 'request', label: 'リクエスト撮影募集', desc: '非公開予約の注文履歴から選択' },
                ].map(t => (
                  <button key={t.key} onClick={() => setModalType(t.key)}
                    style={{ background: '#f8fbff', border: '2px solid #1a3560', borderRadius: 10, padding: '14px 18px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t.desc}</div>
                  </button>
                ))}
                <button onClick={() => setShowModal(false)} style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer', marginTop: 4 }}>キャンセル</button>
              </div>
            ) : modalType === 'custom' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>募集日 <span style={{ color: '#e53935' }}>*</span></label>
                  <input type="date" value={customForm.recruit_date} onChange={e => setCustomForm(f => ({ ...f, recruit_date: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>撮影種別 <span style={{ color: '#e53935' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ v: 'normal', l: '通常撮影会' }, { v: 'request', l: 'リクエスト撮影' }].map(({ v, l }) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                        <input type="radio" value={v} checked={customForm.shoot_type === v} onChange={() => setCustomForm(f => ({ ...f, shoot_type: v }))} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>開催場所（未定の場合「未定」）</label>
                  <input type="text" value={customForm.location} onChange={e => setCustomForm(f => ({ ...f, location: e.target.value }))} placeholder="例：代々木公園"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>開催時間（未定の場合「未定」）</label>
                  <input type="text" value={customForm.shoot_time} onChange={e => setCustomForm(f => ({ ...f, shoot_time: e.target.value }))} placeholder="例：10:00〜15:00"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>撮影モデル（複数選択可）</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {models.map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, background: customForm.model_ids.includes(m.id) ? '#e3f2fd' : '#f5f5f5', borderRadius: 6, padding: '5px 10px' }}>
                        <input type="checkbox" checked={customForm.model_ids.includes(m.id)}
                          onChange={() => setCustomForm(f => ({ ...f, model_ids: f.model_ids.includes(m.id) ? f.model_ids.filter(id => id !== m.id) : [...f.model_ids, m.id] }))} />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>募集人数</label>
                  <input type="number" min={1} value={customForm.capacity} onChange={e => setCustomForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                    style={{ width: 80, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>名</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setModalType(null)} style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>戻る</button>
                  <button onClick={addToQueue}
                    style={{ flex: 2, background: '#06c755', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    募集する
                  </button>
                </div>
              </div>
            ) : modalType === 'event' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#555' }}>公開中のイベントを選択（複数可）</div>
                {openEvents.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: 13 }}>公開中のイベントがありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {openEvents.map(e => (
                      <label key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: selectedEventIds.includes(e.id) ? '#e3f2fd' : '#f8fbff', border: `1px solid ${selectedEventIds.includes(e.id) ? '#90caf9' : '#eee'}` }}>
                        <input type="checkbox" checked={selectedEventIds.includes(e.id)}
                          onChange={() => setSelectedEventIds(ids => ids.includes(e.id) ? ids.filter(i => i !== e.id) : [...ids, e.id])}
                          style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtDate(e.event_date)} 📍{e.title}</div>
                          {e.subtitle && <div style={{ fontSize: 12, color: '#666' }}>{e.subtitle}</div>}
                          {e.location && <div style={{ fontSize: 12, color: '#888' }}>{e.location}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>募集人数（各イベント共通）</label>
                  <input type="number" min={1} value={eventCapacity} onChange={e => setEventCapacity(parseInt(e.target.value) || 1)}
                    style={{ width: 80, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>名</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setModalType(null)} style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>戻る</button>
                  <button onClick={addToQueue} disabled={!selectedEventIds.length}
                    style={{ flex: 2, background: !selectedEventIds.length ? '#ccc' : '#06c755', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: !selectedEventIds.length ? 'not-allowed' : 'pointer' }}>
                    {selectedEventIds.length > 0 ? `募集する（${selectedEventIds.length}件追加）` : '募集する'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#555' }}>非公開予約から選択（複数可）</div>
                {privateBookings.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: 13 }}>非公開予約がありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {privateBookings.map(b => {
                      const modelName = b.private_products?.models?.name || ''
                      return (
                        <label key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: selectedBookingIds.includes(b.id) ? '#fce4ec' : '#f8fbff', border: `1px solid ${selectedBookingIds.includes(b.id) ? '#f48fb1' : '#eee'}` }}>
                          <input type="checkbox" checked={selectedBookingIds.includes(b.id)}
                            onChange={() => setSelectedBookingIds(ids => ids.includes(b.id) ? ids.filter(i => i !== b.id) : [...ids, b.id])}
                            style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            {b.event_date_input && <span style={{ fontWeight: 700, fontSize: 14 }}>({b.event_date_input})</span>}
                            <span style={{ marginLeft: 4, fontSize: 14 }}>📍{b.meeting_place || '未定'}</span>
                            <span style={{ marginLeft: 6, fontSize: 13, color: '#555' }}>{b.shooting_time || ''}</span>
                            {modelName && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>モデル：{modelName}</div>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>募集人数（各予約共通）</label>
                  <input type="number" min={1} value={requestCapacity} onChange={e => setRequestCapacity(parseInt(e.target.value) || 1)}
                    style={{ width: 80, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>名</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setModalType(null)} style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>戻る</button>
                  <button onClick={addToQueue} disabled={!selectedBookingIds.length}
                    style={{ flex: 2, background: !selectedBookingIds.length ? '#ccc' : '#06c755', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: !selectedBookingIds.length ? 'not-allowed' : 'pointer' }}>
                    {selectedBookingIds.length > 0 ? `募集する（${selectedBookingIds.length}件追加）` : '募集する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
