'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const MAX_CHARS = 500

const TABS = [
  { id: 'all', label: 'モデル全体', mobileLines: ['モデル', '全体'], icon: '👥', from: 'モデフル', desc: 'モデル全体グループLINEに送信' },
  { id: 'individual', label: 'モデル個人', mobileLines: ['モデル', '個人'], icon: '👤', from: 'モデフル', desc: '1人のモデルを選んで個別グループLINEに送信' },
  { id: 'zatsudan', label: '雑談', mobileLines: ['雑談'], icon: '💬', from: 'モデフル', desc: '雑談グループLINEに送信' },
  { id: 'staff', label: '受付スタッフ', mobileLines: ['受付', 'スタッフ'], icon: '🐈‍⬛', from: 'モデフル', desc: 'スタッフグループ・個人LINEに送信' },
  { id: 'camera', label: '公式LINE', mobileLines: ['公式LINE'], icon: '📣', from: 'photofleur公式', desc: '公式LINEの全フォロワーに一斉ブロードキャスト' },
  { id: 'photographer', label: 'カメラマン個人', mobileLines: ['カメラマン', '個人'], icon: '📸', from: 'photofleur公式（個人push）', desc: 'LINE連携済みカメラマンへ予約・購入時に個別通知' },
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
          <span style={{ fontSize: 13, color: '#1565c0', fontWeight: 600 }}>{recipientLabel}に送信します</span>
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

const AUTO_TEMPLATES = [
  {
    key: 'monthly_events_model',
    label: '今月のイベントお知らせ（モデル全体）',
    trigger: '毎月1日 朝7時（自動cron）',
    vars: [
      { key: '{{month}}', desc: '月（例: 5）' },
      { key: '{{events_list}}', desc: '当月のイベント一覧（年間イベント管理から自動生成）' },
    ],
  },
  {
    key: 'shift_open',
    label: 'シフト提出開放',
    trigger: 'シフト指定日を登録した時（手動で「はい」を押した場合）',
    vars: [{ key: '{{deadline}}', desc: '締め切り日（例: 5月31日）' }],
  },
  {
    key: 'shift_deadline_reminder',
    label: 'シフト締め切り前日',
    trigger: '締め切り前日の朝9時（自動cron）',
    vars: [],
  },
  {
    key: 'event_publish',
    label: 'イベント公開',
    trigger: 'イベントをdraft→公開に切り替えた時（自動）',
    vars: [
      { key: '{{event_date}}', desc: '開催日（例: 5/31（日））' },
      { key: '{{title}}', desc: 'イベントタイトル' },
      { key: '{{booking_open_at}}', desc: '予約受付開始日時（例: 5/20 20:00）' },
      { key: '{{event_url}}', desc: 'イベント詳細URL' },
    ],
  },
]

const CAMERA_TEMPLATES = [
  {
    key: 'monthly_events_camera',
    label: '今月のイベントお知らせ（公式LINE）',
    trigger: '毎月1日 朝7時（自動cron）',
    vars: [
      { key: '{{month}}', desc: '月（例: 5）' },
      { key: '{{events_list}}', desc: '当月のイベント一覧（年間イベント管理から自動生成）' },
    ],
  },
  {
    key: 'camera_event_publish',
    label: 'イベント公開告知',
    trigger: 'イベントを公開した時（スケジュール管理画面で手動確認）',
    vars: [
      { key: '{{event_date}}', desc: '開催日（〜開催終了日）' },
      { key: '{{title}}', desc: 'タイトル' },
      { key: '{{subtitle}}', desc: '小見出し' },
      { key: '{{description}}', desc: '魅惑文' },
      { key: '{{booking_open_at}}', desc: '予約受付開始日時' },
      { key: '{{event_url}}', desc: 'イベント詳細URL' },
    ],
  },
  {
    key: 'camera_booking_open',
    label: '予約受付開始',
    trigger: '予約受付開始日の昼12時（自動cron・毎日）',
    vars: [
      { key: '{{event_date}}', desc: '開催日' },
      { key: '{{title}}', desc: 'タイトル' },
      { key: '{{subtitle}}', desc: '小見出し' },
      { key: '{{booking_open_time}}', desc: '予約開始時刻（例: 20:00）' },
    ],
  },
  {
    key: 'camera_friday_lineup',
    label: '金曜日週間告知',
    trigger: '毎週金曜日 朝8時（自動cron）',
    vars: [
      { key: '{{events_list}}', desc: '今週末〜翌金曜日のイベント一覧（自動生成）' },
    ],
  },
]

const INDIVIDUAL_TEMPLATES = [
  {
    key: 'private_booking_notify',
    label: '非公開予約通知',
    trigger: '非公開リンクから予約が入った時（自動）',
    vars: [
      { key: '{{event_date}}', desc: '撮影日（顧客入力）' },
      { key: '{{meeting_place}}', desc: '集合・解散場所（顧客入力）' },
      { key: '{{shooting_time}}', desc: '撮影時間（顧客入力）' },
      { key: '{{nickname}}', desc: 'ニックネーム' },
      { key: '{{sns_url}}', desc: 'SNS URL' },
    ],
  },
  {
    key: 'private_day_before',
    label: '非公開予約前日案内',
    trigger: '撮影前日の夜23時（自動cron）',
    vars: [
      { key: '{{event_date}}', desc: '撮影日' },
      { key: '{{meeting_place}}', desc: '集合・解散場所' },
      { key: '{{shooting_time}}', desc: '撮影時間' },
      { key: '{{nickname}}', desc: 'ニックネーム' },
      { key: '{{sns_url}}', desc: 'SNS URL' },
    ],
  },
  {
    key: 'model_booking_notify',
    label: '予約通知（スロット予約）',
    trigger: '撮影枠に予約が入った時（自動）',
    vars: [
      { key: '{{event_date}}', desc: '撮影日' },
      { key: '{{event_title}}', desc: 'イベントタイトル' },
      { key: '{{slot_label}}', desc: '時間枠' },
      { key: '{{nickname}}', desc: 'ニックネーム' },
      { key: '{{sns_url}}', desc: 'SNS URL' },
    ],
  },
  {
    key: 'event_product_booking_notify',
    label: '予約通知（特別予約商品）',
    trigger: '特別予約商品（モデル選択あり）に予約が入った時（自動）',
    vars: [
      { key: '{{event_date}}', desc: '開催日' },
      { key: '{{product_name}}', desc: '商品名' },
      { key: '{{details}}', desc: '時間帯・選択内容など（自動生成）' },
      { key: '{{nickname}}', desc: 'ニックネーム' },
      { key: '{{sns_url}}', desc: 'SNS URL' },
    ],
  },
  {
    key: 'event_product_day_before_section',
    label: '特別予約商品セクション（前日案内に挿入）',
    trigger: '撮影前日の夜23時（自動cron）の前日案内メッセージに商品ごとに追記',
    vars: [
      { key: '{{product_name}}', desc: '商品名' },
      { key: '{{bookings_list}}', desc: '予約一覧（時間帯・SNS URL等）' },
    ],
  },
  {
    key: 'staff_model_notice',
    label: 'スタッフ決定通知（モデル個人）',
    trigger: 'スタッフ応募を確定した時（モデルにも自動送信）',
    vars: [
      { key: '{{details}}', desc: '募集日・場所・時間・撮影種別（自動生成）' },
      { key: '{{staff_name}}', desc: '確定したスタッフ名' },
    ],
  },
  {
    key: 'staff_model_cancel_notice',
    label: 'スタッフキャンセル通知（モデル個人）',
    trigger: 'スタッフ確定をキャンセルした時（モデルにも自動送信）',
    vars: [
      { key: '{{details}}', desc: '募集日・場所・時間・撮影種別（自動生成）' },
      { key: '{{staff_name}}', desc: 'キャンセルしたスタッフ名' },
    ],
  },
  {
    key: 'model_day_before',
    label: '撮影前日案内（モデル個人）',
    trigger: '撮影前日の夜23時（自動cron）',
    vars: [
      { key: '{{event_date}}', desc: '撮影日（例: 2026/5/31（土））' },
      { key: '{{assembly_time}}', desc: '集合時間（スロット開始時間 − オフセット分）' },
      { key: '{{location_info}}', desc: '集合場所・住所・Google Maps URLの複数行' },
      { key: '{{photographer_slots}}', desc: 'スロットごとのカメラマンSNS URL（空き→🈳）' },
      { key: '{{event_page_url}}', desc: 'イベントページURL' },
      { key: '{{model_lunch_note}}', desc: 'ランチ情報（イベント通知設定より）' },
      { key: '{{extra_sections}}', desc: '追加セクション（伝達事項の【タイトル】形式）' },
    ],
  },
]

const ZATSUDAN_TEMPLATES = [
  {
    key: 'birthday_msg',
    label: '🎂 誕生日お祝いメッセージ',
    trigger: '誕生日一覧の「手動送信」ボタンを押した時に自動挿入',
    vars: [{ key: '○○ または {{name}}', desc: 'モデル名に自動置換されます' }],
  },
]

function AutoTemplateSection({ templateDefs }) {
  const [templates, setTemplates] = useState(null)
  const [editing, setEditing] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/line-templates')
      .then(r => r.json())
      .then(d => {
        setTemplates(d.templates || {})
        setEditing(d.templates || {})
      })
  }, [])

  async function saveTemplate(key) {
    setSaving(s => ({ ...s, [key]: true }))
    await fetch('/api/admin/line-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, body: editing[key] }),
    })
    setTemplates(t => ({ ...t, [key]: editing[key] }))
    setSaving(s => ({ ...s, [key]: false }))
    setSaved(s => ({ ...s, [key]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>🤖 自動送信メッセージ設定</div>
        <span style={{ fontSize: 12, color: '#aaa' }}>{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {templateDefs.map(tmpl => (
            <div key={tmpl.key} style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3560', marginBottom: 2 }}>{tmpl.label}</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>送信タイミング：{tmpl.trigger}</div>
              {tmpl.vars.length > 0 && (
                <div style={{ fontSize: 11, color: '#555', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tmpl.vars.map(v => (
                    <span key={v.key} style={{ background: '#f0f4ff', borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>
                      {v.key} <span style={{ fontFamily: 'inherit', color: '#888' }}>= {v.desc}</span>
                    </span>
                  ))}
                </div>
              )}
              <textarea
                value={editing[tmpl.key] ?? ''}
                onChange={e => setEditing(ed => ({ ...ed, [tmpl.key]: e.target.value }))}
                rows={5}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, justifyContent: 'flex-end' }}>
                {saved[tmpl.key] && <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>✅ 保存しました</span>}
                <button
                  onClick={() => saveTemplate(tmpl.key)}
                  disabled={saving[tmpl.key] || editing[tmpl.key] === templates?.[tmpl.key]}
                  style={{ padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: (saving[tmpl.key] || editing[tmpl.key] === templates?.[tmpl.key]) ? '#e0e0e0' : '#1a3560',
                    color: (saving[tmpl.key] || editing[tmpl.key] === templates?.[tmpl.key]) ? '#999' : '#fff' }}>
                  {saving[tmpl.key] ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- タブ1: モデル全体 ----
function TabAll() {
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
      body: JSON.stringify({ message, channel: 'group' }),
    })
    const json = await res.json()
    setSending(false); setConfirmed(false)
    setResult(res.ok && json.ok ? { ok: true } : { error: json.error || '送信に失敗しました' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="line-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#e3f2fd', borderRadius: 12, border: '1px solid #90caf9', padding: '14px 18px', fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: '#1565c0', marginBottom: 4 }}>👥 モデル全体グループLINE</div>
            <div style={{ color: '#1976d2', lineHeight: 1.7 }}>
              全モデル・運営が参加しているグループLINEに送信します。<br />
              イベント公開・シフト提出案内などに使用してください。
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
              <span style={{ fontSize: 12, color: message.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{message.length} / {MAX_CHARS}</span>
            </div>
            <textarea value={message} onChange={e => { setMessage(e.target.value); setConfirmed(false); setResult(null) }}
              rows={12} placeholder={'例：\n【PhotoFleur】お知らせ🌸\n\n来月のシフト提出期限は〇月〇日です。\nよろしくお願いいたします。'}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
          </div>
          {result && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
              {result.error ? <span style={{ color: '#c62828' }}>エラー: {result.error}</span>
                : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ モデル全体グループへの送信が完了しました</span>}
            </div>
          )}
          <SendButtons canSend={canSend} recipientLabel="モデル全体グループ" sending={sending} confirmed={confirmed}
            onConfirm={() => setConfirmed(true)} onSend={handleSend} onBack={() => setConfirmed(false)} />
        </div>
        <div className="line-preview-col">
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
            <LinePreview message={message} accountName="モデフル" />
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
          </div>
        </div>
      </div>
      <AutoTemplateSection templateDefs={AUTO_TEMPLATES} />
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
    <div className="line-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fce4ec', borderRadius: 12, border: '1px solid #f48fb1', padding: '14px 18px', fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: '#c2185b', marginBottom: 4 }}>👤 モデル個別グループLINE</div>
          <div style={{ color: '#ad1457', lineHeight: 1.7 }}>
            選択したモデルと運営が参加している個別グループLINEに送信します。
          </div>
        </div>
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
      <div className="line-preview-col">
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
          <LinePreview message={message} accountName="モデフル" />
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <AutoTemplateSection templateDefs={INDIVIDUAL_TEMPLATES} />
      </div>
    </div>
  )
}

// ---- 送信先設定パネル ----
function LineSettingsPanel({ activeTab }) {
  const [open, setOpen] = useState(false)
  const [groupAll, setGroupAll] = useState('')
  const [groupZatsudan, setGroupZatsudan] = useState('')
  const [groupStaff, setGroupStaff] = useState('')
  const [lastModeful, setLastModeful] = useState('')
  const [lastOfficial, setLastOfficial] = useState('')
  const [models, setModels] = useState([])
  const [modelLineIds, setModelLineIds] = useState({})
  const [staff, setStaff] = useState([])
  const [staffLineIds, setStaffLineIds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')

  function copyText(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  useEffect(() => {
    fetch('/api/admin/line-settings')
      .then(r => r.json())
      .then(d => {
        setGroupAll(d.group_all || '')
        setGroupZatsudan(d.group_zatsudan || '')
        setGroupStaff(d.group_staff || '')
        setLastModeful(d.last_joined_modeful || '')
        setLastOfficial(d.last_joined_official || '')
        setModels(d.models || [])
        const ids = {}
        for (const m of d.models || []) ids[m.id] = m.line_id || ''
        setModelLineIds(ids)
        setStaff(d.staff || [])
        const sids = {}
        for (const s of d.staff || []) sids[s.id] = s.line_id || ''
        setStaffLineIds(sids)
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/admin/line-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_all: groupAll, group_zatsudan: groupZatsudan, group_staff: groupStaff, model_line_ids: modelLineIds, staff_line_ids: staffLineIds }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '14px 18px', marginBottom: 20 }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>⚙️ 送信先グループID設定</div>
        <span style={{ fontSize: 12, color: '#aaa' }}>{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>
      {open && (
        loading ? <p style={{ color: '#aaa', fontSize: 13, marginTop: 12 }}>読み込み中...</p> : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#555', lineHeight: 1.8 }}>
              グループIDはLINEのグループに「モデフル」または「photofleur公式」を招待すると自動取得されます。<br />
              取得したIDを下の欄にコピーして貼り付けてください。<br />
              モデル個人欄には、そのモデルが入っているトークグループのIDを入力してください。
            </div>

            {/* 自動取得グループID */}
            {(lastModeful || lastOfficial) && (
              <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '14px 16px', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#2e7d32', marginBottom: 10 }}>📥 Webhookで取得したグループID</div>
                {lastModeful && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#555', minWidth: 100 }}>モデフル最終参加:</span>
                    <code style={{ flex: 1, background: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 11, wordBreak: 'break-all' }}>{lastModeful}</code>
                    <button onClick={() => copyText(lastModeful, 'modeful')}
                      style={{ flexShrink: 0, padding: '4px 10px', border: '1px solid #a5d6a7', borderRadius: 6, background: copied === 'modeful' ? '#388e3c' : '#fff', color: copied === 'modeful' ? '#fff' : '#2e7d32', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {copied === 'modeful' ? 'コピー済' : 'コピー'}
                    </button>
                  </div>
                )}
                {lastOfficial && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#555', minWidth: 100 }}>公式最終参加:</span>
                    <code style={{ flex: 1, background: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 11, wordBreak: 'break-all' }}>{lastOfficial}</code>
                    <button onClick={() => copyText(lastOfficial, 'official')}
                      style={{ flexShrink: 0, padding: '4px 10px', border: '1px solid #a5d6a7', borderRadius: 6, background: copied === 'official' ? '#388e3c' : '#fff', color: copied === 'official' ? '#fff' : '#2e7d32', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {copied === 'official' ? 'コピー済' : 'コピー'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'all' && (
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#1a3560', marginBottom: 6 }}>👥 モデル全体グループID</label>
                <input style={inp} value={groupAll} onChange={e => setGroupAll(e.target.value)} placeholder="C..." />
              </div>
            )}

            {activeTab === 'zatsudan' && (
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#1a3560', marginBottom: 6 }}>💬 雑談グループID</label>
                <input style={inp} value={groupZatsudan} onChange={e => setGroupZatsudan(e.target.value)} placeholder="C..." />
              </div>
            )}

            {activeTab === 'staff' && (
              <>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 6 }}>🐈‍⬛ スタッフグループID</label>
                  <input style={inp} value={groupStaff} onChange={e => setGroupStaff(e.target.value)} placeholder="C..." />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 10 }}>🐈‍⬛ スタッフ個人 — 各スタッフのLINEグループID</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {staff.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                        <span style={{ width: 100, fontSize: 13, fontWeight: 600, color: '#333', flexShrink: 0 }}>{s.name || s.email}</span>
                        <input
                          style={{ ...inp, flex: 1 }}
                          value={staffLineIds[s.id] || ''}
                          onChange={e => setStaffLineIds(ids => ({ ...ids, [s.id]: e.target.value }))}
                          placeholder="C... または U..."
                        />
                      </div>
                    ))}
                    {staff.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>スタッフ権限のユーザーがいません</p>}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'individual' && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3560', marginBottom: 10 }}>👤 モデル個人 — 各モデルのLINEグループID</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {models.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#e0d8f0' }}>
                        {m.image ? <Image src={m.image} alt="" width={32} height={32} style={{ objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>}
                      </div>
                      <span style={{ width: 100, fontSize: 13, fontWeight: 600, color: '#333', flexShrink: 0 }}>{m.name}</span>
                      <input
                        style={{ ...inp, flex: 1 }}
                        value={modelLineIds[m.id] || ''}
                        onChange={e => setModelLineIds(ids => ({ ...ids, [m.id]: e.target.value }))}
                        placeholder="C... または U..."
                      />
                    </div>
                  ))}
                  {models.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>公開中のモデルがいません</p>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
              {saved && <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>✅ 保存しました</span>}
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: saving ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ---- タブ3: 雑談（手動送信 + 誕生日お祝い） ----
function TabZatsudan() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const [bdModels, setBdModels] = useState([])
  const [bdLoading, setBdLoading] = useState(true)
  const [bdSending, setBdSending] = useState(null)
  const [bdResults, setBdResults] = useState({})

  useEffect(() => {
    fetch('/api/admin/line-broadcast?type=birthdays')
      .then(r => r.json())
      .then(d => { setBdModels(d.models || []); setBdLoading(false) })
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

  const sorted = [...bdModels]
    .map(m => ({ ...m, bdInfo: getBirthdayInfo(m.birthday) }))
    .filter(m => m.bdInfo)
    .sort((a, b) => a.bdInfo.diff - b.bdInfo.diff)

  async function handleSend() {
    setSending(true); setResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: 'zatsudan' }),
    })
    const json = await res.json()
    setSending(false); setConfirmed(false)
    setResult(res.ok && json.ok ? { ok: true } : { error: json.error || '送信に失敗しました' })
  }

  async function sendBirthday(model) {
    setBdSending(model.id)
    const tmplData = await fetch('/api/admin/line-templates').then(r => r.json())
    const template = tmplData.templates?.birthday_msg || `今日は○○ちゃんの誕生日！\nお誕生日おめでとうございます💖\n素敵な1日になりますように❣️\n\nPhotoFleur運営`
    const msg = template.replace(/○○/g, model.name).replace(/{{name}}/g, model.name)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, channel: 'zatsudan' }),
    })
    const json = await res.json()
    setBdSending(null)
    setBdResults(prev => ({ ...prev, [model.id]: res.ok && json.ok ? 'ok' : 'fail' }))
  }

  const canSend = message.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 手動送信 */}
      <div className="line-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#e8f5e9', borderRadius: 12, border: '1px solid #a5d6a7', padding: '14px 18px', fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: '#2e7d32', marginBottom: 4 }}>💬 雑談グループへ手動送信</div>
            <div style={{ color: '#388e3c', lineHeight: 1.7 }}>モデフルアカウントから雑談グループに送信します。</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
              <span style={{ fontSize: 12, color: message.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{message.length} / {MAX_CHARS}</span>
            </div>
            <textarea value={message} onChange={e => { setMessage(e.target.value); setConfirmed(false); setResult(null) }}
              rows={8} placeholder="メッセージを入力してください"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
          </div>
          {result && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
              {result.error ? <span style={{ color: '#c62828' }}>エラー: {result.error}</span>
                : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ 雑談グループへの送信が完了しました</span>}
            </div>
          )}
          <SendButtons canSend={canSend} recipientLabel="雑談グループ" sending={sending} confirmed={confirmed}
            onConfirm={() => setConfirmed(true)} onSend={handleSend} onBack={() => setConfirmed(false)} />
        </div>
        <div className="line-preview-col">
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
            <LinePreview message={message} accountName="モデフル" />
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
          </div>
        </div>
      </div>

      {/* 自動送信メッセージ（誕生日テンプレート含む） */}
      <AutoTemplateSection templateDefs={ZATSUDAN_TEMPLATES} />

      {/* 誕生日一覧 */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>🎂 モデル誕生日一覧（近い順）</div>
        {bdLoading ? <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
          : sorted.length === 0 ? <p style={{ color: '#aaa', fontSize: 13 }}>誕生日登録済みモデルがいません</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map(m => {
                const { month, day, diff } = m.bdInfo
                const isToday = diff === 0
                const isSoon = diff <= 7
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: isToday ? '#ffebee' : isSoon ? '#fce4ec' : '#f8fbff', border: `1px solid ${isToday ? '#ef9a9a' : isSoon ? '#f48fb1' : '#e5e5e5'}` }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                      <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>{month}/{day}</span>
                      {isToday && <span style={{ marginLeft: 8, fontSize: 12, color: '#c62828', fontWeight: 700 }}>🎂 今日！</span>}
                      {!isToday && isSoon && <span style={{ marginLeft: 8, fontSize: 12, color: '#c2185b' }}>あと{diff}日</span>}
                    </div>
                    {bdResults[m.id] === 'ok' ? <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 700 }}>✅ 送信済</span>
                      : bdResults[m.id] === 'fail' ? <span style={{ fontSize: 12, color: '#c62828', fontWeight: 700 }}>❌ 失敗</span>
                      : (
                        <button onClick={() => sendBirthday(m)} disabled={bdSending === m.id}
                          style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#06c755', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: bdSending === m.id ? 0.6 : 1 }}>
                          {bdSending === m.id ? '送信中...' : '手動送信'}
                        </button>
                      )}
                  </div>
                )
              })}
            </div>
          )}
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
    <div className="line-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#e3f2fd', borderRadius: 12, border: '1px solid #90caf9', padding: '14px 18px', fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: '#1a3560', marginBottom: 6 }}>📣 全フォロワーへのブロードキャスト</div>
          <div style={{ color: '#1565c0', lineHeight: 1.7 }}>
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
      <div className="line-preview-col">
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
          <LinePreview message={message} accountName="PhotoFleur公式（カメラマン向け）" />
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <AutoTemplateSection templateDefs={CAMERA_TEMPLATES} />
      </div>
    </div>
  )
}

const PHOTOGRAPHER_TEMPLATES = [
  {
    key: 'photographer_booking',
    label: '予約完了LINE（イベント予約）',
    trigger: 'イベント枠に予約が入った時（自動）',
    vars: [
      { key: '{{customer_name}}', desc: 'お客様名' },
      { key: '{{event_date}}', desc: '撮影日' },
      { key: '{{slot_label}}', desc: '時間枠' },
      { key: '{{model_name}}', desc: 'モデル名' },
    ],
  },
  {
    key: 'photographer_special',
    label: '予約完了LINE（特別予約商品）',
    trigger: '特別予約商品に予約が入った時（自動）',
    vars: [
      { key: '{{customer_name}}', desc: 'お客様名' },
      { key: '{{product_name}}', desc: '商品名' },
      { key: '{{event_date}}', desc: '撮影日' },
      { key: '{{selections}}', desc: '選択内容' },
    ],
  },
  {
    key: 'photographer_private',
    label: '予約完了LINE（非公開商品）',
    trigger: '非公開リンクから予約が入った時（自動）',
    vars: [
      { key: '{{customer_name}}', desc: 'お客様名' },
      { key: '{{product_title}}', desc: '商品名' },
      { key: '{{model_name}}', desc: 'モデル名' },
    ],
  },
  {
    key: 'photographer_goods',
    label: '購入完了LINE（グッズ）',
    trigger: 'グッズを購入した時（自動）',
    vars: [
      { key: '{{customer_name}}', desc: 'お客様名' },
      { key: '{{goods_title}}', desc: '商品名' },
      { key: '{{quantity}}', desc: '数量' },
    ],
  },
  {
    key: 'photographer_day_before',
    label: '前日確認LINE（イベント・特別予約）',
    trigger: '撮影前日の夜（自動cron）',
    vars: [
      { key: '{{customer_name}}', desc: 'お客様名' },
      { key: '{{event_date}}', desc: '撮影日' },
      { key: '{{slot_label}}', desc: '時間枠' },
      { key: '{{model_name}}', desc: 'モデル名' },
      { key: '{{location}}', desc: '場所' },
    ],
  },
  {
    key: 'photographer_private_day_before',
    label: '前日確認LINE（非公開予約）',
    trigger: '撮影前日の夜（自動cron）',
    vars: [
      { key: '{{customer_name}}', desc: 'お客様名' },
      { key: '{{product_title}}', desc: '商品名' },
      { key: '{{meeting_place}}', desc: '集合場所' },
      { key: '{{shooting_time}}', desc: '撮影時間' },
    ],
  },
  {
    key: 'photo_featured',
    label: 'ホームページ掲載通知（カメラマン個人）',
    trigger: 'ご提供写真に⭐をつけた時（管理画面→ご提供写真から手動送信）',
    vars: [
      { key: '{{site_url}}', desc: 'ホームページURL（自動挿入）' },
    ],
  },
]

const STAFF_GROUP_TEMPLATES = [
  {
    key: 'staff_recruit_notice',
    label: 'スタッフ募集お知らせ（グループ）',
    trigger: 'スタッフ募集を作成した時（自動）',
    vars: [
      { key: '{{details}}', desc: '募集日・場所・時間・撮影種別（自動生成）' },
    ],
  },
  {
    key: 'staff_re_recruit_notice',
    label: 'スタッフ再募集お知らせ（グループ）',
    trigger: 'スタッフキャンセル後に再募集を選択した時（自動）',
    vars: [
      { key: '{{details}}', desc: '募集日・場所・時間・撮影種別（自動生成）' },
    ],
  },
]

const STAFF_INDIVIDUAL_TEMPLATES = [
  {
    key: 'staff_confirmed_notice',
    label: 'スタッフ確定通知（個人）',
    trigger: 'スタッフ応募を確定した時（自動）',
    vars: [
      { key: '{{details}}', desc: '募集日・場所・時間・撮影種別（自動生成）' },
    ],
  },
  {
    key: 'staff_cancel_notice',
    label: 'スタッフキャンセル通知（個人）',
    trigger: 'スタッフ確定をキャンセルした時（自動）',
    vars: [
      { key: '{{details}}', desc: '募集日・場所・時間・撮影種別（自動生成）' },
    ],
  },
  {
    key: 'staff_day_before',
    label: 'スタッフ前日リマインド（個人）',
    trigger: '撮影前日 21:00（自動cron）',
    vars: [
      { key: '{{details}}', desc: '場所・時間・撮影種別（自動生成）' },
    ],
  },
]

function TabStaff({ staff }) {
  // グループ送信
  const [groupMsg, setGroupMsg] = useState('')
  const [groupSending, setGroupSending] = useState(false)
  const [groupConfirmed, setGroupConfirmed] = useState(false)
  const [groupResult, setGroupResult] = useState(null)
  // 個人送信
  const [selectedId, setSelectedId] = useState('')
  const [indivMsg, setIndivMsg] = useState('')
  const [indivSending, setIndivSending] = useState(false)
  const [indivConfirmed, setIndivConfirmed] = useState(false)
  const [indivResult, setIndivResult] = useState(null)

  const selectedStaff = staff.find(s => s.id === selectedId)

  async function handleGroupSend() {
    setGroupSending(true); setGroupResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: groupMsg, channel: 'staff_group' }),
    })
    const json = await res.json()
    setGroupSending(false); setGroupConfirmed(false)
    setGroupResult(res.ok && json.ok ? { ok: true } : { error: json.error || '送信に失敗しました' })
  }

  async function handleIndivSend() {
    setIndivSending(true); setIndivResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: indivMsg, channel: 'staff_individual', staff_user_id: selectedId }),
    })
    const json = await res.json()
    setIndivSending(false); setIndivConfirmed(false)
    setIndivResult(res.ok && json.ok ? { ok: true } : { error: json.error || '送信に失敗しました' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* ── グループ送信 ── */}
      <div className="line-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f3f3f3', borderRadius: 12, border: '1px solid #ddd', padding: '14px 18px', fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>🐈‍⬛ スタッフグループLINE</div>
            <div style={{ color: '#555', lineHeight: 1.7 }}>
              全スタッフが参加しているグループLINEに送信します。<br />
              受付募集案内などに使用してください。
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
              <span style={{ fontSize: 12, color: groupMsg.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{groupMsg.length} / {MAX_CHARS}</span>
            </div>
            <textarea value={groupMsg} onChange={e => { setGroupMsg(e.target.value); setGroupConfirmed(false); setGroupResult(null) }}
              rows={10} placeholder="メッセージを入力してください"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
          </div>
          {groupResult && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: groupResult.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${groupResult.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
              {groupResult.error ? <span style={{ color: '#c62828' }}>エラー: {groupResult.error}</span>
                : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ スタッフグループへの送信が完了しました</span>}
            </div>
          )}
          <SendButtons canSend={groupMsg.trim().length > 0} recipientLabel="スタッフグループ" sending={groupSending} confirmed={groupConfirmed}
            onConfirm={() => setGroupConfirmed(true)} onSend={handleGroupSend} onBack={() => setGroupConfirmed(false)} />
        </div>
        <div className="line-preview-col">
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
            <LinePreview message={groupMsg} accountName="モデフル" />
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
          </div>
        </div>
      </div>
      <AutoTemplateSection templateDefs={STAFF_GROUP_TEMPLATES} />

      <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 8 }} />

      {/* ── 個人送信 ── */}
      <div className="line-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f3f3f3', borderRadius: 12, border: '1px solid #ddd', padding: '14px 18px', fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>🐈‍⬛ スタッフ個別グループLINE</div>
            <div style={{ color: '#555', lineHeight: 1.7 }}>
              選択したスタッフと運営が参加している個別グループLINEに送信します。
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>送信先スタッフを選択</div>
            {staff.length === 0
              ? <p style={{ color: '#aaa', fontSize: 13 }}>スタッフ権限のユーザーがいません</p>
              : (
                <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setIndivConfirmed(false); setIndivResult(null) }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
                  <option value="">-- スタッフを選択 --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                </select>
              )
            }
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
              <span style={{ fontSize: 12, color: indivMsg.length > MAX_CHARS ? '#e53935' : '#aaa' }}>{indivMsg.length} / {MAX_CHARS}</span>
            </div>
            <textarea value={indivMsg} onChange={e => { setIndivMsg(e.target.value); setIndivConfirmed(false); setIndivResult(null) }}
              rows={10} placeholder="メッセージを入力してください"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
          </div>
          {indivResult && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: indivResult.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${indivResult.error ? '#ef9a9a' : '#a5d6a7'}`, fontSize: 13 }}>
              {indivResult.error ? <span style={{ color: '#c62828' }}>エラー: {indivResult.error}</span>
                : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ {selectedStaff?.name || selectedStaff?.email}さんに送信しました</span>}
            </div>
          )}
          <SendButtons canSend={indivMsg.trim().length > 0 && !!selectedId} recipientLabel={selectedStaff?.name || selectedStaff?.email || '選択中のスタッフ'} sending={indivSending} confirmed={indivConfirmed}
            onConfirm={() => setIndivConfirmed(true)} onSend={handleIndivSend} onBack={() => setIndivConfirmed(false)} />
        </div>
        <div className="line-preview-col">
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
            <LinePreview message={indivMsg} accountName="モデフル" />
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
          </div>
        </div>
      </div>
      <AutoTemplateSection templateDefs={STAFF_INDIVIDUAL_TEMPLATES} />
    </div>
  )
}

function TabPhotographer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#e8f5e9', borderRadius: 12, border: '1px solid #a5d6a7', padding: '14px 18px', fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: '#2e7d32', marginBottom: 6 }}>📸 カメラマン個人通知について</div>
        <div style={{ color: '#388e3c', lineHeight: 1.8 }}>
          予約・購入時に<strong>メールは全員に自動送信</strong>されます。<br />
          マイページでLINE連携済みのカメラマンには、メールに加えて<strong>公式LINEからも個別通知</strong>が送られます。<br />
          ※ 公式LINEをフォローしていない場合はLINE通知は届きません。
        </div>
      </div>

      <div style={{ background: '#e3f2fd', borderRadius: 12, border: '1px solid #90caf9', padding: '14px 18px', fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>📧 メール自動送信タイミング</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', color: '#1565c0', lineHeight: 2 }}>
          <li>予約完了メール — イベント予約・特別予約・非公開予約完了時</li>
          <li>グッズ購入完了メール — グッズ購入完了時</li>
          <li>前日確認メール — 撮影前日の夜（自動cron）</li>
        </ul>
        <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>メールのHTMLテンプレートはメルマガ配信ページから編集できます。</div>
      </div>

      <AutoTemplateSection templateDefs={PHOTOGRAPHER_TEMPLATES} />
    </div>
  )
}

// ---- 公式LINE自動送信トグル ----
function CameraAutoToggle() {
  const [paused, setPaused] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/line-templates')
      .then(r => r.json())
      .then(d => setPaused(d.templates?._camera_broadcast_paused === 'true'))
  }, [])

  async function toggle() {
    setSaving(true)
    const newPaused = !paused
    await fetch('/api/admin/line-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '_camera_broadcast_paused', body: newPaused ? 'true' : 'false' }),
    })
    setPaused(newPaused)
    setSaving(false)
  }

  if (paused === null) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px', borderRadius: 12, marginBottom: 20,
      background: paused ? '#ffebee' : '#e8f5e9',
      border: `2px solid ${paused ? '#ef9a9a' : '#81c784'}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>公式LINE 自動一斉送信</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: paused ? '#c62828' : '#2e7d32' }}>
          {paused ? '📴 配信停止中' : '📣 稼働中'}
        </div>
      </div>
      <button onClick={toggle} disabled={saving} style={{
        padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14,
        cursor: saving ? 'not-allowed' : 'pointer',
        background: paused ? '#2e7d32' : '#c62828', color: '#fff',
        opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap',
      }}>
        {saving ? '...' : paused ? '稼働中にする' : '配信停止にする'}
      </button>
    </div>
  )
}

// ---- メインページ ----
export default function LineBroadcastPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [models, setModels] = useState([])
  const [staff, setStaff] = useState([])

  useEffect(() => {
    fetch('/api/admin/line-broadcast')
      .then(r => r.json())
      .then(d => setModels(d.models || []))
    fetch('/api/admin/line-settings')
      .then(r => r.json())
      .then(d => setStaff(d.staff || []))
  }, [])

  const tab = TABS.find(t => t.id === activeTab)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`
        .line-preview-col { }
        .tab-full { }
        .tab-compact { display: none; }
        @media (max-width: 640px) {
          .line-grid { grid-template-columns: 1fr !important; }
          .line-preview-col { display: none !important; }
          .line-tabs-bar { overflow-x: auto !important; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; }
          .line-tab-btn { flex-shrink: 0 !important; padding: 6px 10px !important; }
          .tab-full { display: none !important; }
          .tab-compact { display: block !important; text-align: center; }
        }
      `}</style>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>💬 LINE送信管理</h1>
      </div>

      {/* タブ */}
      <div className="line-tabs-bar" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e0e8f0', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className="line-tab-btn"
            style={{ padding: '8px 16px', border: 'none', borderBottom: activeTab === t.id ? '3px solid #06c755' : '3px solid transparent', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#1a3560' : '#888', borderRadius: '4px 4px 0 0' }}>
            <span className="tab-full">{t.icon} {t.label}</span>
            <span className="tab-compact">
              <span style={{ fontSize: 18, display: 'block' }}>{t.icon}</span>
              {t.mobileLines.map((line, i) => <span key={i} style={{ display: 'block', fontSize: 10, lineHeight: 1.3 }}>{line}</span>)}
            </span>
          </button>
        ))}
      </div>

      {/* 送信元・説明 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 16px', background: tab?.id === 'camera' ? '#e3f2fd' : '#f0f8ff', borderRadius: 10, border: `1px solid ${tab?.id === 'camera' ? '#90caf9' : '#b3d9f5'}` }}>
        <div style={{ fontSize: 20 }}>📲</div>
        <div>
          <div style={{ fontSize: 12, color: '#888' }}>送信元アカウント</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3560' }}>{tab?.from}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{tab?.desc}</div>
        </div>
      </div>

      {/* 公式LINE自動送信トグル（公式LINEタブのみ） */}
      {activeTab === 'camera' && <CameraAutoToggle />}

      {/* 送信先設定パネル（モデル関連タブのみ） */}
      {['all', 'individual', 'zatsudan', 'staff'].includes(activeTab) && <LineSettingsPanel activeTab={activeTab} />}

      {/* タブコンテンツ */}
      {activeTab === 'all' && <TabAll />}
      {activeTab === 'individual' && <TabIndividual models={models} />}
      {activeTab === 'zatsudan' && <TabZatsudan />}
      {activeTab === 'staff' && <TabStaff staff={staff} />}
      {activeTab === 'camera' && <TabCamera />}
      {activeTab === 'photographer' && <TabPhotographer />}
    </div>
  )
}
