'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const MAX_CHARS = 500

export default function LineBroadcastPage() {
  const [message, setMessage] = useState('')
  const [models, setModels] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch('/api/admin/line-broadcast')
      .then(r => r.json())
      .then(d => setModels(d.models || []))
  }, [])

  function toggleModel(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectAll(false)
      setSelectedIds([])
    } else {
      setSelectAll(true)
      setSelectedIds([])
    }
  }

  const recipientCount = selectAll ? models.length : selectedIds.length
  const canSend = message.trim().length > 0 && recipientCount > 0

  async function handleSend() {
    setSending(true)
    setResult(null)
    const res = await fetch('/api/admin/line-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        model_ids: selectAll ? [] : selectedIds,
      }),
    })
    const json = await res.json()
    setSending(false)
    setConfirmed(false)
    if (!res.ok) setResult({ error: json.error })
    else setResult({ ok: true, sent: json.sent, failed: json.failed })
  }

  // LINE preview rendering (newlines as <br>)
  const previewLines = message.split('\n')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>💬 LINE一斉送信</h1>
        <span style={{ fontSize: 13, color: '#888' }}>LINE登録済みモデルに一斉送信します</span>
      </div>

      {result && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: result.error ? '#ffebee' : '#e8f5e9', border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}` }}>
          {result.error
            ? <span style={{ color: '#c62828', fontWeight: 600 }}>エラー: {result.error}</span>
            : <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ 送信完了：{result.sent}件成功{result.failed > 0 ? ` / ${result.failed}件失敗` : ''}</span>
          }
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 左：送信先 + 本文 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 送信先 */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 12 }}>送信先</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>全員（{models.length}名）</span>
            </label>
            {!selectAll && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
                {models.length === 0 && (
                  <p style={{ color: '#aaa', fontSize: 13 }}>LINE登録済みモデルがいません</p>
                )}
                {models.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleModel(m.id)} />
                    <span style={{ fontSize: 14 }}>{m.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 12, color: '#1a3560', fontWeight: 600 }}>
              → {recipientCount}名に送信
            </div>
          </div>

          {/* 本文 */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>メッセージ本文</div>
              <span style={{ fontSize: 12, color: message.length > MAX_CHARS ? '#e53935' : '#aaa' }}>
                {message.length} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setConfirmed(false); setResult(null) }}
              rows={12}
              placeholder={'例：\n【PhotoFleur】お知らせ🌸\n\n来月のシフト提出期限は〇月〇日です。\nよろしくお願いいたします。'}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            />
          </div>

          {/* 送信ボタン */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {!confirmed ? (
              <button
                onClick={() => setConfirmed(true)}
                disabled={!canSend}
                style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: canSend ? '#06c755' : '#ccc', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canSend ? 'pointer' : 'not-allowed' }}>
                送信確認
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#795548', fontWeight: 600 }}>{recipientCount}名に送信します</span>
                <button onClick={handleSend} disabled={sending}
                  style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: sending ? '#ccc' : '#e53935', color: '#fff', fontWeight: 700, fontSize: 15, cursor: sending ? 'not-allowed' : 'pointer' }}>
                  {sending ? '送信中...' : '送信する'}
                </button>
                <button onClick={() => setConfirmed(false)}
                  style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  戻る
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 右：LINEプレビュー */}
        <div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 14 }}>プレビュー</div>
            {/* LINE風UI */}
            <div style={{ background: '#95c3db', borderRadius: 12, padding: '20px 12px', minHeight: 300 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {/* アイコン */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a3560', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16 }}>🌸</span>
                </div>
                {/* バブル */}
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>PhotoFleur</div>
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
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>※ LINEはプレーンテキストのみ送信されます</p>
          </div>
        </div>
      </div>
    </div>
  )
}
