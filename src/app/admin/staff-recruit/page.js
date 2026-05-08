'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ModelStaffTabs from '@/components/ModelStaffTabs'

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
        <span style={{ fontWeight: 700 }}>{fmtDate(b.event_date_input) || '未定'}</span>
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

function ConfirmItemLabel({ item }) {
  if (item.type === 'event') {
    const e = item.event
    return (
      <div>
        <span style={{ fontWeight: 700 }}>{fmtDate(e.event_date)}</span>
        <span style={{ marginLeft: 6 }}>📍{e.title}</span>
        {e.subtitle && <span style={{ marginLeft: 4, fontSize: 12, color: '#666' }}>{e.subtitle}</span>}
        <span style={{ marginLeft: 8, fontSize: 11, background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, padding: '1px 6px' }}>通常イベント</span>
      </div>
    )
  }
  if (item.type === 'request') {
    const b = item.booking
    const modelName = b.private_products?.models?.name || ''
    return (
      <div>
        <span style={{ fontWeight: 700 }}>{fmtDate(b.event_date_input) || '未定'}</span>
        <span style={{ marginLeft: 6 }}>📍{b.meeting_place || '未定'}</span>
        <span style={{ marginLeft: 6, color: '#555', fontSize: 13 }}>{b.shooting_time || ''}</span>
        <span style={{ marginLeft: 8, fontSize: 11, background: '#fce4ec', color: '#c2185b', borderRadius: 4, padding: '1px 6px' }}>リク撮</span>
        {modelName && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>モデル：{modelName}</div>}
      </div>
    )
  }
  if (item.type === 'custom') {
    const r = item.recruitment
    const typeLabel = r.shoot_type === 'request' ? 'リク撮' : '通常撮影会'
    const models = (r.models_info || []).map(m => m.name).join('、')
    return (
      <div>
        <span style={{ fontWeight: 700 }}>{fmtDate(r.recruit_date)}</span>
        <span style={{ marginLeft: 6 }}>📍{r.location || '未定'}</span>
        <span style={{ marginLeft: 6, color: '#555', fontSize: 13 }}>{r.shoot_time || '未定'}</span>
        <span style={{ marginLeft: 8, fontSize: 11, background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '1px 6px' }}>{typeLabel}</span>
        {models && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>撮影モデル：{models}</div>}
      </div>
    )
  }
  return null
}

function ConfirmCard({ item, staffUsers, selectedStaffMap, setSelectedStaffMap, assigningKey, handleDirectAssign, handleAction, actionLoading, onEdit, onDelete }) {
  const rec = item.recruitment
  const confirmedApps = (rec?.applications || []).filter(a => a.status === 'confirmed')
  const appliedApps = (rec?.applications || []).filter(a => a.status === 'applied')
  const selectedStaff = selectedStaffMap[item.key] || ''
  const hasRecruitment = !!rec

  // 募集あり：左ボーダーで強調、背景を少し色付け
  const recStatusColor = rec?.status === 'closed' ? '#388e3c' : '#1565c0'
  const cardStyle = hasRecruitment
    ? { background: '#f8fbff', border: `1px solid ${recStatusColor}40`, borderLeft: `4px solid ${recStatusColor}`, borderRadius: 8, padding: '8px 12px' }
    : { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, padding: '8px 12px' }

  return (
    <div style={cardStyle}>
      {/* ステータス + ラベル 1行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
        {hasRecruitment && <StatusBadge status={rec.status} />}
        {hasRecruitment && <span style={{ fontSize: 11, color: '#aaa' }}>募集{rec.capacity}名</span>}
        {appliedApps.length > 0 && <span style={{ fontSize: 11, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '0px 6px', fontWeight: 700 }}>応募{appliedApps.length}名</span>}
      </div>
      <ConfirmItemLabel item={item} />

      {rec?.type === 'custom' && (rec.photographer_name || rec.photographer_nickname || rec.photographer_sns || rec.payment_status) && (
        <div style={{ marginTop: 3, fontSize: 11, color: '#666', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {rec.photographer_name && <span>👤 {rec.photographer_name}</span>}
          {rec.photographer_nickname && <span>🏷️ {rec.photographer_nickname}</span>}
          {rec.photographer_sns && <a href={rec.photographer_sns} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0' }}>🔗 SNS</a>}
          {rec.payment_status && <span style={{ background: rec.payment_status === '支払い済み' ? '#e8f5e9' : rec.payment_status === '当日現金' ? '#fff8e1' : '#f5f5f5', color: rec.payment_status === '支払い済み' ? '#2e7d32' : rec.payment_status === '当日現金' ? '#f57f17' : '#888', borderRadius: 4, padding: '0px 6px', fontWeight: 700 }}>
            {rec.payment_status === '支払い済み' ? '✅ 支払い済み' : rec.payment_status === '当日現金' ? '💴 当日現金' : '❓ 未定'}
          </span>}
        </div>
      )}

      {(confirmedApps.length > 0 || appliedApps.length > 0) && (
        <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[...confirmedApps, ...appliedApps].map(app => (
            <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 5, background: app.status === 'confirmed' ? '#e8f5e9' : '#f8fbff', border: `1px solid ${app.status === 'confirmed' ? '#a5d6a7' : '#ddd'}` }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{app.user_name || '（名前なし）'}</span>
              {app.status === 'confirmed' && <span style={{ fontSize: 11, background: '#388e3c', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✅ 確定済み</span>}
              {app.status === 'applied' && (
                <button onClick={() => handleAction('confirm_application', rec.id, app.id)} disabled={actionLoading === app.id}
                  style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {actionLoading === app.id ? '...' : '確定'}
                </button>
              )}
              <button onClick={() => { if (confirm('キャンセルしますか？')) handleAction('cancel_application', rec.id, app.id) }} disabled={actionLoading === app.id}
                style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 5, display: 'flex', gap: 5, alignItems: 'center' }}>
        <select value={selectedStaff} onChange={e => setSelectedStaffMap(m => ({ ...m, [item.key]: e.target.value }))}
          style={{ flex: 1, minWidth: 100, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 11 }}>
          <option value="">スタッフを選択</option>
          {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button onClick={() => handleDirectAssign(item)} disabled={!selectedStaff || assigningKey === item.key}
          style={{ background: !selectedStaff ? '#ccc' : '#06c755', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: !selectedStaff ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {assigningKey === item.key ? '送信中...' : '決定してLINEを送信'}
        </button>
        {hasRecruitment && <>
          <button onClick={() => onEdit(item)}
            style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>編集</button>
          <button onClick={() => onDelete(item, confirmedApps.length > 0)}
            style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>消去</button>
        </>}
      </div>
    </div>
  )
}

function EditModal({ item, openEvents, privateBookings, models, onClose, onSaved }) {
  const rec = item.recruitment
  const isCustom = rec?.type === 'custom'
  const [convertMode, setConvertMode] = useState(null) // null | 'event' | 'request'
  const [form, setForm] = useState({
    recruit_date: rec?.recruit_date || '',
    shoot_type: rec?.shoot_type || 'normal',
    location: rec?.location || '',
    shoot_time: rec?.shoot_time || '',
    model_ids: rec?.model_ids || [],
    capacity: rec?.capacity || 1,
    photographer_name: rec?.photographer_name || '',
    photographer_nickname: rec?.photographer_nickname || '',
    photographer_sns: rec?.photographer_sns || '',
    payment_status: rec?.payment_status || '未定',
  })
  const [convertEventId, setConvertEventId] = useState('')
  const [convertBookingId, setConvertBookingId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    if (convertMode === 'event') {
      if (!convertEventId) return alert('イベントを選択してください')
      await fetch('/api/admin/staff-recruit', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_recruitment', recruitment_id: rec.id, to_type: 'event', to_event_id: convertEventId }) })
    } else if (convertMode === 'request') {
      if (!convertBookingId) return alert('予約を選択してください')
      await fetch('/api/admin/staff-recruit', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_recruitment', recruitment_id: rec.id, to_type: 'request', to_booking_id: convertBookingId }) })
    } else {
      await fetch('/api/admin/staff-recruit', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_recruitment', recruitment_id: rec.id, fields: form }) })
    }
    setSaving(false)
    onSaved()
  }

  const inputStyle = { width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>募集を編集</h2>

        {isCustom && !convertMode && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setConvertMode('event')}
              style={{ flex: 1, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              📅 公開済みのイベントに変更
            </button>
            <button onClick={() => setConvertMode('request')}
              style={{ flex: 1, background: '#fce4ec', color: '#c2185b', border: '1px solid #f48fb1', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              📸 リクエスト撮影に変更
            </button>
          </div>
        )}

        {convertMode === 'event' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button onClick={() => setConvertMode(null)} style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>← 戻る</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>公開済みのイベントを選択</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {openEvents.map(e => (
                <label key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 7, background: convertEventId === e.id ? '#e8f5e9' : '#f8f8f8', border: `1px solid ${convertEventId === e.id ? '#81c784' : '#eee'}`, cursor: 'pointer' }}>
                  <input type="radio" checked={convertEventId === e.id} onChange={() => setConvertEventId(e.id)} />
                  <div style={{ fontSize: 13 }}><span style={{ fontWeight: 700 }}>{fmtDate(e.event_date)}</span> 📍{e.title}{e.subtitle && <span style={{ color: '#888', marginLeft: 4 }}>{e.subtitle}</span>}</div>
                </label>
              ))}
              {openEvents.length === 0 && <p style={{ color: '#aaa', fontSize: 12 }}>公開中のイベントがありません</p>}
            </div>
          </div>
        )}

        {convertMode === 'request' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button onClick={() => setConvertMode(null)} style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>← 戻る</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#c2185b' }}>非公開予約を選択</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {privateBookings.map(b => {
                const modelName = b.private_products?.models?.name || ''
                return (
                  <label key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 7, background: convertBookingId === b.id ? '#fce4ec' : '#f8f8f8', border: `1px solid ${convertBookingId === b.id ? '#f48fb1' : '#eee'}`, cursor: 'pointer' }}>
                    <input type="radio" checked={convertBookingId === b.id} onChange={() => setConvertBookingId(b.id)} />
                    <div style={{ fontSize: 13 }}><span style={{ fontWeight: 700 }}>{fmtDate(b.event_date_input) || '未定'}</span> 📍{b.meeting_place || '未定'} {b.shooting_time || ''}{modelName && <span style={{ color: '#888', marginLeft: 4 }}>{modelName}</span>}</div>
                  </label>
                )
              })}
              {privateBookings.length === 0 && <p style={{ color: '#aaa', fontSize: 12 }}>非公開予約がありません</p>}
            </div>
          </div>
        )}

        {!convertMode && isCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3, color: '#333' }}>募集日</label>
              <input type="date" value={form.recruit_date} onChange={e => setForm(f => ({ ...f, recruit_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>撮影種別</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: 'normal', l: '通常撮影会' }, { v: 'request', l: 'リクエスト撮影' }].map(({ v, l }) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" value={v} checked={form.shoot_type === v} onChange={() => setForm(f => ({ ...f, shoot_type: v }))} />{l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>開催場所</label>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="例：代々木公園" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>開催時間</label>
              <input type="text" value={form.shoot_time} onChange={e => setForm(f => ({ ...f, shoot_time: e.target.value }))} placeholder="例：10:00〜15:00" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>撮影モデル</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {models.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: form.model_ids.includes(m.id) ? '#e3f2fd' : '#f5f5f5', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.model_ids.includes(m.id)} onChange={() => setForm(f => ({ ...f, model_ids: f.model_ids.includes(m.id) ? f.model_ids.filter(id => id !== m.id) : [...f.model_ids, m.id] }))} />{m.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>カメラマン氏名</label>
                <input type="text" value={form.photographer_name} onChange={e => setForm(f => ({ ...f, photographer_name: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>ニックネーム</label>
                <input type="text" value={form.photographer_nickname} onChange={e => setForm(f => ({ ...f, photographer_nickname: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>SNS URL</label>
              <input type="text" value={form.photographer_sns} onChange={e => setForm(f => ({ ...f, photographer_sns: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>支払い</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['支払い済み', '当日現金', '未定'].map(v => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, payment_status: v }))}
                    style={{ padding: '4px 10px', borderRadius: 6, border: `2px solid ${form.payment_status === v ? '#1a3560' : '#ddd'}`, background: form.payment_status === v ? '#1a3560' : '#fff', color: form.payment_status === v ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {v === '支払い済み' ? '✅ 支払い済み' : v === '当日現金' ? '💴 当日現金' : '❓ 未定'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>募集人数</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              <span style={{ marginLeft: 6, fontSize: 12, color: '#888' }}>名</span>
            </div>
          </div>
        )}

        {!convertMode && !isCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>募集人数</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              <span style={{ marginLeft: 6, fontSize: 12, color: '#888' }}>名</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, background: saving ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '保存中...' : convertMode ? '変更して保存（スタッフ引き継ぎ）' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [staffUsers, setStaffUsers] = useState([])
  const [selectedStaffMap, setSelectedStaffMap] = useState({})
  const [assigningKey, setAssigningKey] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // custom form
  const [customForm, setCustomForm] = useState({ recruit_date: '', shoot_type: 'normal', location: '', shoot_time: '', model_ids: [], capacity: 1, photographer_name: '', photographer_nickname: '', photographer_sns: '', payment_status: '未定' })
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
    setStaffUsers(data.staffUsers || [])
    setLoading(false)
  }

  function openModal() {
    setModalType(null)
    setCustomForm({ recruit_date: '', shoot_type: 'normal', location: '', shoot_time: '', model_ids: [], capacity: 1, photographer_name: '', photographer_nickname: '', photographer_sns: '', payment_status: '未定' })
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

  async function handleDirectAssign(item) {
    const staffUserId = selectedStaffMap[item.key]
    if (!staffUserId) return alert('スタッフを選択してください')
    setAssigningKey(item.key)
    await fetch('/api/admin/staff-recruit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'direct_assign',
        event_id: item.type === 'event' ? item.event.id : null,
        private_booking_id: item.type === 'request' ? item.booking.id : null,
        recruitment_id: item.recruitment?.id || null,
        staff_user_id: staffUserId,
      }),
    })
    setAssigningKey(null)
    setSelectedStaffMap(m => ({ ...m, [item.key]: '' }))
    load()
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
    if (action === 'cancel_application') {
      if (confirm('スタッフグループに再募集のLINEを送りますか？')) {
        await fetch('/api/admin/staff-recruit', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'notify_re_recruit', recruitment_id }),
        })
      }
    }
    load()
  }

  const tabStyle = active => ({
    padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
    background: active ? '#1a3560' : '#f0f0f0', color: active ? '#fff' : '#555',
  })

  const recruitedEventIds = new Set(recruitments.map(r => r.event_id).filter(Boolean))
  const recruitedBookingIds = new Set(recruitments.map(r => r.private_booking_id).filter(Boolean))
  const availableEvents = openEvents.filter(e => !recruitedEventIds.has(e.id))
  const availableBookings = privateBookings.filter(b => !recruitedBookingIds.has(b.id))

  const recruitList = recruitments.filter(r => r.status !== 'cancelled')

  const recruitByEventId = Object.fromEntries(recruitments.filter(r => r.event_id).map(r => [r.event_id, r]))
  const recruitByBookingId = Object.fromEntries(recruitments.filter(r => r.private_booking_id).map(r => [r.private_booking_id, r]))
  const allConfirmItems = [
    ...openEvents.map(e => ({ key: `event-${e.id}`, type: 'event', date: e.event_date, event: e, recruitment: recruitByEventId[e.id] || null })),
    ...privateBookings.map(b => ({ key: `booking-${b.id}`, type: 'request', date: b.event_date_input, booking: b, recruitment: recruitByBookingId[b.id] || null })),
    ...recruitments.filter(r => r.type === 'custom').map(r => ({ key: `custom-${r.id}`, type: 'custom', date: r.recruit_date, recruitment: r })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })
  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingItems = allConfirmItems.filter(item => !item.date || item.date >= todayStr)
  const pastItems = allConfirmItems.filter(item => item.date && item.date < todayStr)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 12, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ margin: '8px 0 16px' }}><ModelStaffTabs /></div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: '0 0 12px' }}>🐈‍⬛ スタッフ募集</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recruitList.map(r => {
                const hasConfirmed = (r.applications || []).some(a => a.status === 'confirmed')
                return (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <StatusBadge status={r.status} />
                        <span style={{ fontSize: 12, color: '#aaa' }}>募集{r.capacity}名</span>
                        <span style={{ fontSize: 12, color: '#aaa' }}>応募{(r.applications || []).filter(a => a.status !== 'cancelled').length}名</span>
                      </div>
                      <RecruitLabel r={r} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <button
                        onClick={() => { if (confirm('この募集を削除しますか？')) handleAction('delete', r.id) }}
                        disabled={actionLoading === r.id || hasConfirmed}
                        title={hasConfirmed ? 'スタッフ確定済みのため削除できません' : ''}
                        style={{ background: hasConfirmed ? '#f5f5f5' : '#ffebee', color: hasConfirmed ? '#bbb' : '#c62828', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: hasConfirmed ? 'not-allowed' : 'pointer' }}>
                        削除
                      </button>
                      {hasConfirmed && <span style={{ fontSize: 10, color: '#bbb', whiteSpace: 'nowrap' }}>確定済みのため削除不可</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          {[
            { items: upcomingItems, isPast: false },
            { items: pastItems, isPast: true },
          ].map(({ items, isPast }) => {
            if (items.length === 0) return null
            if (isPast) return (
              <div key="past" style={{ marginTop: 24 }}>
                <button onClick={() => setShowPast(v => !v)}
                  style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#888', cursor: 'pointer', fontWeight: 700 }}>
                  {showPast ? '▲' : '▼'} 過去の開催（{items.length}件）
                </button>
                {showPast && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {items.map(item => <ConfirmCard key={item.key} item={item} staffUsers={staffUsers} selectedStaffMap={selectedStaffMap} setSelectedStaffMap={setSelectedStaffMap} assigningKey={assigningKey} handleDirectAssign={handleDirectAssign} handleAction={handleAction} actionLoading={actionLoading} onEdit={setEditItem} onDelete={(item, hasConfirmed) => { if (confirm('開催予定を消去してスタッフに連絡しますか？')) handleAction(hasConfirmed ? 'delete_with_notify' : 'delete', item.recruitment.id) }} />)}
                  </div>
                )}
              </div>
            )
            return (
              <div key="upcoming" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.length === 0
                  ? <p style={{ color: '#999' }}>予定はありません。</p>
                  : items.map(item => <ConfirmCard key={item.key} item={item} staffUsers={staffUsers} selectedStaffMap={selectedStaffMap} setSelectedStaffMap={setSelectedStaffMap} assigningKey={assigningKey} handleDirectAssign={handleDirectAssign} handleAction={handleAction} actionLoading={actionLoading} onEdit={setEditItem} onDelete={(item, hasConfirmed) => { if (confirm('開催予定を消去してスタッフに連絡しますか？')) handleAction(hasConfirmed ? 'delete_with_notify' : 'delete', item.recruitment.id) }} />)
                }
              </div>
            )
          })}
        </div>
      )}

      {editItem && (
        <EditModal
          item={editItem}
          openEvents={openEvents}
          privateBookings={privateBookings}
          models={models}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load() }}
        />
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
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 10 }}>カメラマン情報</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>カメラマン氏名</label>
                      <input type="text" value={customForm.photographer_name} onChange={e => setCustomForm(f => ({ ...f, photographer_name: e.target.value }))} placeholder="未定"
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>カメラマンニックネーム</label>
                      <input type="text" value={customForm.photographer_nickname} onChange={e => setCustomForm(f => ({ ...f, photographer_nickname: e.target.value }))} placeholder="未定"
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#333' }}>SNS URL</label>
                      <input type="text" value={customForm.photographer_sns} onChange={e => setCustomForm(f => ({ ...f, photographer_sns: e.target.value }))} placeholder="https://..."
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>支払い</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['支払い済み', '当日現金', '未定'].map(v => (
                          <button key={v} onClick={() => setCustomForm(f => ({ ...f, payment_status: v }))}
                            style={{ padding: '6px 14px', borderRadius: 8, border: `2px solid ${customForm.payment_status === v ? '#1a3560' : '#ddd'}`, background: customForm.payment_status === v ? '#1a3560' : '#fff', color: customForm.payment_status === v ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            {v === '支払い済み' ? '✅ 支払い済み' : v === '当日現金' ? '💴 当日現金' : '❓ 未定'}
                          </button>
                        ))}
                      </div>
                    </div>
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
                {availableEvents.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: 13 }}>公開中のイベントがありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {availableEvents.map(e => (
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
                {availableBookings.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: 13 }}>非公開予約がありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {availableBookings.map(b => {
                      const modelName = b.private_products?.models?.name || ''
                      return (
                        <label key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: selectedBookingIds.includes(b.id) ? '#fce4ec' : '#f8fbff', border: `1px solid ${selectedBookingIds.includes(b.id) ? '#f48fb1' : '#eee'}` }}>
                          <input type="checkbox" checked={selectedBookingIds.includes(b.id)}
                            onChange={() => setSelectedBookingIds(ids => ids.includes(b.id) ? ids.filter(i => i !== b.id) : [...ids, b.id])}
                            style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{fmtDate(b.event_date_input) || '未定'}</span>
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
