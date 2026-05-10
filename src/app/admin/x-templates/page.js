'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const TEMPLATES = [
  {
    key: 'x_event_publish',
    label: 'イベント公開時',
    desc: 'イベントを公開してXに投稿する際のテンプレート',
    vars: ['{{event_date}}', '{{title}}', '{{subtitle}}', '{{description}}', '{{booking_open_at}}', '{{event_url}}'],
  },
  {
    key: 'x_booking_open',
    label: '予約受付開始日（朝8時自動）',
    desc: '予約受付開始日の朝8時に自動投稿されるテンプレート',
    vars: ['{{event_date}}', '{{title}}', '{{subtitle}}', '{{description}}', '{{booking_open_at}}', '{{event_url}}'],
  },
  {
    key: 'x_day_before',
    label: '開催前日（朝8時自動）',
    desc: '開催日の前日朝8時に自動投稿されるテンプレート',
    vars: ['{{event_date}}', '{{title}}', '{{subtitle}}', '{{description}}', '{{event_url}}'],
  },
]

const DEFAULTS = {
  x_event_publish: `📢お知らせ\n【開催イベントが公開されました】\n\n【📍開催日　タイトル】\n{{event_date}} {{title}}\n{{subtitle}}\n\n{{description}}\n\n【⏰予約受付開始日時】\n{{booking_open_at}}~\n\nHPより詳細ご確認ください！\n{{event_url}}`,
  x_booking_open: `📢お知らせ\n【⏰本日予約受付開始されます】\n\n【📍開催日　タイトル】\n{{event_date}} {{title}}\n{{subtitle}}\n\n{{description}}\n\n皆様のご予約心よりお待ち申し上げます。\n{{event_url}}`,
  x_day_before: `おはようございます☀️\n明日の開催イベントをお知らせいたします。\n\n【📍開催日　タイトル】\n{{event_date}} {{title}}\n{{subtitle}}\n\n{{description}}\n\n本日22時までに第一締め切りされます。\n開放分は当日でもご予約可能ですので\nぜひご予約ご検討ください💖\n{{event_url}}`,
}

export default function XTemplatesPage() {
  const [bodies, setBodies] = useState({ ...DEFAULTS })
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/line-templates')
      .then(r => r.json())
      .then(({ templates }) => {
        setBodies(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(templates).filter(([k]) => k.startsWith('x_'))
          ),
        }))
        setLoading(false)
      })
  }, [])

  async function save(key) {
    setSaving(prev => ({ ...prev, [key]: true }))
    await fetch('/api/admin/line-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, body: bodies[key] }),
    })
    setSaving(prev => ({ ...prev, [key]: false }))
    setSaved(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000)
  }

  function reset(key) {
    setBodies(prev => ({ ...prev, [key]: DEFAULTS[key] }))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#555', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#000', margin: '8px 0 4px' }}>𝕏 X投稿テンプレート</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        {'{{event_date}}'}などの変数は送信時に自動で置き換えられます。Xの文字数制限（日本語約140字）に注意してください。
      </p>

      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#856404' }}>
        ⚠️ X投稿を使うには Vercel の環境変数に <strong>X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET</strong> の設定が必要です。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {TEMPLATES.map(tmpl => {
          const charCount = bodies[tmpl.key]?.length || 0
          return (
            <div key={tmpl.key} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '20px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#000', marginBottom: 2 }}>{tmpl.label}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{tmpl.desc}</div>
                </div>
                <span style={{ fontSize: 11, color: charCount > 280 ? '#e53935' : '#aaa' }}>{charCount} 文字</span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {tmpl.vars.map(v => (
                  <span key={v} style={{ fontSize: 11, background: '#f0f4fb', color: '#1a3560', borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>{v}</span>
                ))}
              </div>

              <textarea
                value={bodies[tmpl.key]}
                onChange={e => setBodies(prev => ({ ...prev, [tmpl.key]: e.target.value }))}
                rows={10}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => reset(tmpl.key)}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', color: '#666', fontSize: 13, cursor: 'pointer' }}>
                  デフォルトに戻す
                </button>
                <button onClick={() => save(tmpl.key)} disabled={saving[tmpl.key]}
                  style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: saved[tmpl.key] ? '#2e7d32' : '#000', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {saved[tmpl.key] ? '✅ 保存済み' : saving[tmpl.key] ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
