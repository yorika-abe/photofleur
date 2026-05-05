'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const MAX_CHARS = 500

const TABS = [
  { id: 'all', label: 'モデル全体', icon: '👥', from: 'モデル向けLINEアカウント', desc: 'LINE登録済みモデル全員または選択したモデルに送信' },
  { id: 'individual', label: 'モデル個人', icon: '👤', from: 'モデル向けLINEアカウント', desc: '特定のモデル1人に送信' },
  { id: 'birthday', label: '誕生日', icon: '🎂', from: 'モデル向けLINEアカウント', desc: 'モデルの誕生日にお祝いLINEを送信' },
  { id: 'camera', label: '公式LINE', icon: '📣', from: 'カメラマン向け公式LINEアカウント', desc: '公式LINEの全フォロワーに一斉ブロードキャスト' },
]

function LinePreview({ message, accountName }) {
  return (
    <div style={{ background: '#95c3db', borderRadius: 12, padding: '20px 12px', minHeight: 200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a3560', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16 }}>🌸</span>
        </div>
        <div style={{ maxWidth: '80%' }}>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 3 }}>{accountName || 'PhotoFleur'}</div>
          {message.trim() ? (
            <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '10px 14px', fontSize: 13, lineHeight: 1.7, color: '#222', whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
              {message}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '10px 14px', fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>
              メッセージを入力するとここに表示されます
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SendButtons({ canSend, recipientLabel, sending, confirmed, onConfirm, onSend, onBack }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
      {!confirmed ? (
        <button onClick={onConfirm} disabled={!canSend}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: canSend ? '#06c755' : '#ccc', color: '#fff', fontWeight: 700, fontSize: 14, cursor: canSend ? 'pointer' : 'not-allowed' }}>
          送信確認
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#795548', fontWeight: 600 }}>{recipientLabel}に送信します</span>
          <button onClick={onSend} disabled={sending}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: sending ? '#ccc' : '#e53935', color: '#fff', fontWeight: 700, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer' }}>
            {sending ? '送信中...' : '送信する'}
          </button>
          <button onClick={onBack}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            戻る
          </button>
        </div>
      )}
    </div>
  )
}

// ---- タブ1: モデル全体 ----
function TabAll({ models }) {
  const [message, setMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)

  const recipientCount = selectAll ? models.length : selectedIds.length
  const canSend = message.trim().length > 0 && recipientCount > 0

  function toggleModel(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSend() {
    setSending(true); setResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, model_ids: selectAll ? [] : selectedIds }),
    })
    const json = await res.json()
    setSending(false); setConfirmed(false)
    setResult(res.ok ? { ok: true, sent: json.sent, failed: json.failed } : { error: json.error })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>送信先</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={selectAll} onChange={() => { setSelectAll(v => !v); setSelectedIds([]) }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>全員（{models.length}名）</span>
          </label>
          {!selectAll && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8, maxHeight: 200, overflowY: 'auto' }}>
              {models.length === 0
                ? <p style={{ color: '#aaa', fontSize: 13 }}>LINE登録済みモデルがいません</p>
                : models.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleModel(m.id)} />
                    <span style={{ fontSize: 14 }}>{m.name}</span>
                  </label>
                ))
              }
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: '#1a3560', fontWeight: 600 }}>→ {recipientCount}名に送信</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
            <span style={{ fontSize: 12, color: message.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{message.length} / {MAX_CHARS}</span>
          </div>
          <textarea value={message} onChange={e => { setMessage(e.target.value); setConfirmed(false); setResult(null) }}
            rows={10} placeholder={'例：\n【PhotoFleur】お知らせ🌸\n\n来月のシフト提出期限は〇月〇日です。\nよろしくお願いいたします。'}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
        </div>
        {result && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
            {result.error ? <span style={{ color: '#c62828' }}>エラー: {result.error}</span>
              : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ 送信完了：{result.sent}件成功{result.failed > 0 ? ` / ${result.failed}件失敗` : ''}</span>}
          </div>
        )}
        <SendButtons canSend={canSend} recipientLabel={`${recipientCount}名`} sending={sending} confirmed={confirmed}
          onConfirm={() => setConfirmed(true)} onSend={handleSend} onBack={() => setConfirmed(false)} />
      </div>
      <div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
          <LinePreview message={message} accountName="PhotoFleur（モデル向け）" />
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
        </div>
      </div>
    </div>
  )
}

// ---- タブ2: モデル個人 ----
function TabIndividual({ models }) {
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)

  const selectedModel = models.find(m => m.id === selectedId)
  const canSend = message.trim().length > 0 && !!selectedId

  async function handleSend() {
    setSending(true); setResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, model_ids: [selectedId] }),
    })
    const json = await res.json()
    setSending(false); setConfirmed(false)
    setResult(res.ok ? { ok: true, sent: json.sent, failed: json.failed } : { error: json.error })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>送信先モデルを選択</div>
          {models.length === 0
            ? <p style={{ color: '#aaa', fontSize: 13 }}>LINE登録済みモデルがいません</p>
            : (
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setConfirmed(false); setResult(null) }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
                <option value="">-- モデルを選択 --</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )
          }
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
            <span style={{ fontSize: 12, color: message.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{message.length} / {MAX_CHARS}</span>
          </div>
          <textarea value={message} onChange={e => { setMessage(e.target.value); setConfirmed(false); setResult(null) }}
            rows={10} placeholder="メッセージを入力してください"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
        </div>
        {result && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
            {result.error ? <span style={{ color: '#c62828' }}>エラー: {result.error}</span>
              : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ {selectedModel?.name}さんに送信しました</span>}
          </div>
        )}
        <SendButtons canSend={canSend} recipientLabel={selectedModel?.name || '選択中のモデル'} sending={sending} confirmed={confirmed}
          onConfirm={() => setConfirmed(true)} onSend={handleSend} onBack={() => setConfirmed(false)} />
      </div>
      <div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
          <LinePreview message={message} accountName="PhotoFleur（モデル向け）" />
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_BIRTHDAY_MSG = `【PhotoFleur】
お誕生日おめでとうございます🎂🌸

いつも一緒に活動してくれてありがとうございます。
素敵な一日になりますように！

PhotoFleur運営`

// ---- タブ3: 誕生日 ----
function TabBirthday() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)
  const [results, setResults] = useState({})

  useEffect(() => {
    fetch('/api/admin/line-broadcast?type=birthdays')
      .then(r => r.json())
      .then(d => { setModels(d.models || []); setLoading(false) })
  }, [])

  function getBirthdayInfo(birthday) {
    if (!birthday) return null
    const [, month, day] = birthday.split('-').map(Number)
    const today = new Date()
    const thisYear = today.getFullYear()
    const bday = new Date(thisYear, month - 1, day)
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (bday < todayMidnight) bday.setFullYear(thisYear + 1)
    const diff = Math.round((bday - todayMidnight) / (1000 * 60 * 60 * 24))
    return { month, day, diff }
  }

  const sorted = [...models]
    .map(m => ({ ...m, bdInfo: getBirthdayInfo(m.birthday) }))
    .filter(m => m.bdInfo)
    .sort((a, b) => a.bdInfo.diff - b.bdInfo.diff)

  async function sendBirthday(model) {
    setSending(model.id)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: DEFAULT_BIRTHDAY_MSG, model_ids: [model.id] }),
    })
    const json = await res.json()
    setSending(null)
    setResults(prev => ({ ...prev, [model.id]: res.ok && json.sent > 0 ? 'ok' : 'fail' }))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#e8f5e9', borderRadius: 12, border: '1px solid #a5d6a7', padding: '14px 18px', fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: '#2e7d32', marginBottom: 4 }}>🤖 自動送信が有効です</div>
          <div style={{ color: '#388e3c', lineHeight: 1.7 }}>
            モデルプロフィールに誕生日が登録されていれば、毎日0:00（JST）に当日誕生日のモデルへ自動でLINEを送信します。<br />
            手動で送りたい場合は下の一覧から「LINE送信」を押してください。
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 4 }}>自動送信メッセージ</div>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>※ メッセージを変更したい場合はコード（cron-send-birthday-line/route.js）を編集してください</div>
          <pre style={{ margin: 0, padding: '10px 14px', background: '#f8fbff', borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #e0e8f0' }}>
            {DEFAULT_BIRTHDAY_MSG}
          </pre>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>モデル誕生日一覧（近い順）</div>
          {loading ? (
            <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
          ) : sorted.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 13 }}>誕生日登録済みモデルがいません</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map(m => {
                const { month, day, diff } = m.bdInfo
                const isToday = diff === 0
                const isSoon = diff <= 7
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: isToday ? '#fff3e0' : isSoon ? '#f3e5f5' : '#f8fbff', border: `1px solid ${isToday ? '#ffb74d' : isSoon ? '#ce93d8' : '#e5e5e5'}` }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                      <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>{month}/{day}</span>
                      {isToday && <span style={{ marginLeft: 8, fontSize: 12, color: '#e65100', fontWeight: 700 }}>🎂 今日！自動送信済みのはず</span>}
                      {!isToday && isSoon && <span style={{ marginLeft: 8, fontSize: 12, color: '#7b1fa2' }}>あと{diff}日</span>}
                      {!m.line_id && <span style={{ marginLeft: 8, fontSize: 11, color: '#aaa' }}>（LINE未登録・自動送信対象外）</span>}
                    </div>
                    {m.line_id && (
                      results[m.id] === 'ok' ? (
                        <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 700 }}>✅ 送信済</span>
                      ) : results[m.id] === 'fail' ? (
                        <span style={{ fontSize: 12, color: '#c62828', fontWeight: 700 }}>❌ 失敗</span>
                      ) : (
                        <button onClick={() => sendBirthday(m)} disabled={sending === m.id}
                          style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#06c755', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: sending === m.id ? 0.6 : 1 }}>
                          {sending === m.id ? '送信中...' : '手動送信'}
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー（自動送信メッセージ）</div>
          <LinePreview message={DEFAULT_BIRTHDAY_MSG} accountName="PhotoFleur（モデル向け）" />
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
        </div>
      </div>
    </div>
  )
}

// ---- タブ4: 公式LINE（カメラマン向け）----
function TabCamera() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)

  const canSend = message.trim().length > 0

  async function handleSend() {
    setSending(true); setResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: 'camera' }),
    })
    const json = await res.json()
    setSending(false); setConfirmed(false)
    setResult(res.ok && json.ok ? { ok: true } : { error: json.error || '送信に失敗しました' })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff3e0', borderRadius: 12, border: '1px solid #ffb74d', padding: '14px 18px', fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: '#e65100', marginBottom: 6 }}>📣 全フォロワーへのブロードキャスト</div>
          <div style={{ color: '#795548', lineHeight: 1.7 }}>
            カメラマン向け公式LINEアカウントのフォロワー全員に送信されます。<br />
            イベント公開告知・数日前の宣伝・前日宣伝などに使用してください。
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
            <span style={{ fontSize: 12, color: message.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{message.length} / {MAX_CHARS}</span>
          </div>
          <textarea value={message} onChange={e => { setMessage(e.target.value); setConfirmed(false); setResult(null) }}
            rows={12}
            placeholder={'例：\n【PhotoFleur】イベント公開のお知らせ📸\n\n〇月〇日に撮影会を開催します！\n詳細はプロフィールリンクをご確認ください。\nhttps://photofleur.vercel.app/schedule'}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
        </div>
        {result && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
            {result.error ? <span style={{ color: '#c62828' }}>エラー: {result.error}</span>
              : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ 全フォロワーへの送信が完了しました</span>}
          </div>
        )}
        <SendButtons canSend={canSend} recipientLabel="全フォロワー" sending={sending} confirmed={confirmed}
          onConfirm={() => setConfirmed(true)} onSend={handleSend} onBack={() => setConfirmed(false)} />
      </div>
      <div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
          <LinePreview message={message} accountName="PhotoFleur公式（カメラマン向け）" />
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
        </div>
      </div>
    </div>
  )
}

// ---- メインページ ----
export default function LineBroadcastPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [models, setModels] = useState([])

  useEffect(() => {
    fetch('/api/admin/line-broadcast')
      .then(r => r.json())
      .then(d => setModels(d.models || []))
  }, [])

  const tab = TABS.find(t => t.id === activeTab)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>💬 LINE送信管理</h1>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e0e8f0', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 16px', border: 'none', borderBottom: activeTab === t.id ? '3px solid #06c755' : '3px solid transparent', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#1a3560' : '#888', borderRadius: '4px 4px 0 0', gap: 6 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 送信元・説明 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 16px', background: tab?.id === 'camera' ? '#fff8e1' : '#f0f8ff', borderRadius: 10, border: `1px solid ${tab?.id === 'camera' ? '#ffe082' : '#b3d9f5'}` }}>
        <div style={{ fontSize: 20 }}>📲</div>
        <div>
          <div style={{ fontSize: 12, color: '#888' }}>送信元アカウント</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3560' }}>{tab?.from}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{tab?.desc}</div>
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'all' && <TabAll models={models} />}
      {activeTab === 'individual' && <TabIndividual models={models} />}
      {activeTab === 'birthday' && <TabBirthday />}
      {activeTab === 'camera' && <TabCamera />}
    </div>
  )
}
