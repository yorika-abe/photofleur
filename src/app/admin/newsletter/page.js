'use client'

import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false })

export default function NewsletterPage() {
  const editorRef = useRef(null)
  const [subject, setSubject] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  useEffect(() => {
    fetch('/api/admin/newsletter').then(r => r.json()).then(d => {
      if (d.count !== undefined) setSubscriberCount(d.count)
    })
  }, [])

  function handleImageUpload(file, done) {
    const fd = new FormData()
    fd.append('file', file.attachments[0])
    fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(({ url, error }) => {
        if (error) { alert('画像アップロード失敗: ' + error); return }
        done({ progress: 100, url })
      })
  }

  function handleConfirm() {
    if (!subject.trim()) { alert('件名を入力してください'); return }
    setConfirmed(true)
  }

  function handleSend() {
    if (!editorRef.current?.editor) return
    setSending(true)
    setResult(null)
    editorRef.current.editor.exportHtml(async ({ html }) => {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html }),
      })
      const json = await res.json()
      setSending(false)
      setConfirmed(false)
      if (!res.ok) setResult({ error: json.error })
      else setResult({ ok: true, sent: json.sent, failed: json.failed })
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      {/* Header bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e8f0', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none', flexShrink: 0 }}>← 管理画面</Link>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1a3560' }}>📧 メルマガ配信</span>
        <span style={{ fontSize: 12, color: '#888' }}>
          同意済み：<strong style={{ color: '#1a3560' }}>{subscriberCount === null ? '...' : `${subscriberCount}名`}</strong>
        </span>
        <div style={{ flex: 1 }} />

        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="件名を入力"
          style={{ width: 280, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14 }}
        />

        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={!editorReady || !subject.trim()}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: (!editorReady || !subject.trim()) ? 'not-allowed' : 'pointer', opacity: (!editorReady || !subject.trim()) ? 0.5 : 1 }}>
            送信確認
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#795548', fontWeight: 600 }}>{subscriberCount}名に送信</span>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
              {sending ? '送信中...' : '送信する'}
            </button>
            <button
              onClick={() => setConfirmed(false)}
              style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
              戻る
            </button>
          </div>
        )}
      </div>

      {result && (
        <div style={{ padding: '10px 24px', background: result.error ? '#ffebee' : '#e8f5e9', borderBottom: `1px solid ${result.error ? '#ffcdd2' : '#c8e6c9'}`, fontSize: 14 }}>
          {result.error
            ? <span style={{ color: '#e53935' }}>エラー: {result.error}</span>
            : <span style={{ color: '#388e3c', fontWeight: 600 }}>✅ 送信完了：{result.sent}件成功{result.failed > 0 ? ` / ${result.failed}件失敗` : ''}</span>
          }
        </div>
      )}

      {/* Unlayer editor */}
      <EmailEditor
        ref={editorRef}
        minHeight="calc(100vh - 57px)"
        onReady={() => {
          setEditorReady(true)
          editorRef.current.editor.registerCallback('image', handleImageUpload)
        }}
        options={{
          locale: 'ja-JP',
          translations: {
            'ja-JP': {
              'Columns': 'カラム',
              'Button': 'ボタン',
              'Divider': '区切り線',
              'Heading': '見出し',
              'Paragraph': 'テキスト',
              'Image': '画像',
              'Social': 'SNS',
              'Menu': 'メニュー',
              'HTML': 'HTML',
              'Body': '全体設定',
              'Blocks': 'ブロック',
              'Content': 'コンテンツ',
              'Add': '追加',
              'Edit': '編集',
              'Delete': '削除',
              'Save': '保存',
              'Cancel': 'キャンセル',
              'Undo': '元に戻す',
              'Redo': 'やり直し',
              'Preview': 'プレビュー',
              'Desktop': 'PC',
              'Mobile': 'スマホ',
              'Text': 'テキスト',
              'Link': 'リンク',
              'Bold': '太字',
              'Italic': '斜体',
              'Underline': '下線',
              'Align Left': '左揃え',
              'Align Center': '中央揃え',
              'Align Right': '右揃え',
              'Color': '色',
              'Background Color': '背景色',
              'Font Family': 'フォント',
              'Font Size': 'フォントサイズ',
              'Line Height': '行間',
              'Padding': '余白',
              'Border': '枠線',
              'Border Radius': '角丸',
              'Width': '幅',
              'Height': '高さ',
              'Auto': '自動',
              'Full Width': '全幅',
              'Upload': 'アップロード',
              'URL': 'URL',
              'Alt Text': '代替テキスト',
              'Icon': 'アイコン',
              'Label': 'ラベル',
            }
          },
          features: { stockImages: { enabled: false } },
          tools: {
            image: { enabled: true },
            video: { enabled: true },
            social: { enabled: true },
            divider: { enabled: true },
            button: { enabled: true },
            text: { enabled: true },
          },
          appearance: {
            theme: 'light',
            panels: { tools: { dock: 'left' } },
          },
        }}
      />
    </div>
  )
}
