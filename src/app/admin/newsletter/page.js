'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const BLOCK_TYPES = [
  { type: 'heading', label: '見出し', icon: 'H' },
  { type: 'text', label: 'テキスト', icon: 'T' },
  { type: 'image', label: '画像', icon: '🖼️' },
  { type: 'button', label: 'ボタン', icon: '□' },
  { type: 'divider', label: '区切り線', icon: '—' },
  { type: 'spacer', label: '余白', icon: '↕' },
]

const DEFAULTS = {
  heading: { text: '見出しテキスト', size: 26, align: 'center', color: '#1a3560' },
  text: { text: '本文テキストを入力してください。', size: 14, align: 'left', color: '#333333' },
  image: { url: '', alt: '', link: '' },
  button: { label: 'ボタン', url: '', bgColor: '#1a3560', textColor: '#ffffff', align: 'center' },
  divider: { color: '#e0e0e0', thickness: 1 },
  spacer: { height: 24 },
}

let idCounter = 1
function newBlock(type) {
  return { id: idCounter++, type, data: { ...DEFAULTS[type] } }
}

function blockToHtml(b) {
  const { type, data } = b
  if (type === 'heading') return `<h2 style="font-size:${data.size}px;color:${data.color};text-align:${data.align};margin:0 0 16px;font-weight:700;line-height:1.4;">${data.text}</h2>`
  if (type === 'text') return `<p style="font-size:${data.size}px;color:${data.color};text-align:${data.align};line-height:1.8;margin:0 0 16px;white-space:pre-wrap;">${data.text}</p>`
  if (type === 'image') {
    if (!data.url) return '<div style="background:#f0f4fb;height:120px;display:flex;align-items:center;justify-content:center;margin:0 0 16px;border-radius:4px;color:#aaa;font-size:13px;">画像URL未設定</div>'
    const img = `<img src="${data.url}" alt="${data.alt}" style="max-width:100%;display:block;margin:0 auto;" />`
    return `<div style="margin:0 0 16px;text-align:center;">${data.link ? `<a href="${data.link}" style="display:inline-block;">${img}</a>` : img}</div>`
  }
  if (type === 'button') return `<div style="text-align:${data.align};margin:0 0 16px;"><a href="${data.url || '#'}" style="display:inline-block;background:${data.bgColor};color:${data.textColor};text-decoration:none;border-radius:8px;padding:12px 32px;font-size:15px;font-weight:700;">${data.label}</a></div>`
  if (type === 'divider') return `<hr style="border:none;border-top:${data.thickness}px solid ${data.color};margin:8px 0 16px;" />`
  if (type === 'spacer') return `<div style="height:${data.height}px;"></div>`
  return ''
}

function generateHtml(blocks) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
<div style="background:#1a3560;padding:24px 32px;text-align:center;">
<span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:0.05em;">PhotoFleur</span>
</div>
<div style="padding:32px;">
${blocks.map(blockToHtml).join('\n')}
</div>
<div style="background:#f5f5f5;padding:16px 32px;font-size:11px;color:#999;text-align:center;">
PhotoFleur｜このメールは予約時にメルマガを希望されたお客様にお送りしています。
</div>
</div>
</body></html>`
}

function BlockPreview({ block, selected, onClick, onUp, onDown, onDelete, isFirst, isLast }) {
  const el = (
    <div dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} style={{ pointerEvents: 'none' }} />
  )
  return (
    <div onClick={onClick} style={{ position: 'relative', cursor: 'pointer', outline: selected ? '2px solid #1a3560' : '2px solid transparent', borderRadius: 4, marginBottom: 2 }}>
      <div style={{ padding: '8px 8px', background: selected ? '#f0f5ff' : 'transparent', transition: 'background 0.15s' }}>
        {el}
      </div>
      {selected && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
          <button onClick={onUp} disabled={isFirst} style={ctrlBtn}>▲</button>
          <button onClick={onDown} disabled={isLast} style={ctrlBtn}>▼</button>
          <button onClick={onDelete} style={{ ...ctrlBtn, background: '#e53935' }}>✕</button>
        </div>
      )}
    </div>
  )
}

const ctrlBtn = { padding: '2px 7px', fontSize: 11, border: 'none', borderRadius: 4, background: '#1a3560', color: '#fff', cursor: 'pointer' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

function BlockEditor({ block, onChange }) {
  if (!block) return <div style={{ padding: 20, color: '#aaa', fontSize: 13 }}>ブロックを選択してください</div>
  const { type, data } = block
  const set = (key, val) => onChange({ ...data, [key]: val })

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>
        {BLOCK_TYPES.find(b => b.type === type)?.label} の設定
      </div>

      {(type === 'heading' || type === 'text') && <>
        <div>
          <label style={lbl}>{type === 'heading' ? '見出しテキスト' : '本文'}</label>
          <textarea value={data.text} onChange={e => set('text', e.target.value)} rows={type === 'text' ? 6 : 2}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>文字サイズ(px)</label>
            <input type="number" value={data.size} onChange={e => set('size', Number(e.target.value))} style={inp} />
          </div>
          <div>
            <label style={lbl}>文字色</label>
            <input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} />
          </div>
        </div>
        <div>
          <label style={lbl}>揃え</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => set('align', a)}
                style={{ flex: 1, padding: '6px 0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, background: data.align === a ? '#1a3560' : '#fff', color: data.align === a ? '#fff' : '#555', cursor: 'pointer' }}>
                {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
              </button>
            ))}
          </div>
        </div>
      </>}

      {type === 'image' && <>
        <div>
          <label style={lbl}>画像をアップロード</label>
          <input type="file" accept="image/*" onChange={async e => {
            const file = e.target.files[0]
            if (!file) return
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
            const json = await res.json()
            if (json.url) set('url', json.url)
            else alert('アップロード失敗: ' + json.error)
          }} style={{ fontSize: 13 }} />
        </div>
        <div>
          <label style={lbl}>または画像URL</label>
          <input value={data.url} onChange={e => set('url', e.target.value)} placeholder="https://..." style={inp} />
        </div>
        <div>
          <label style={lbl}>リンク先URL（任意）</label>
          <input value={data.link} onChange={e => set('link', e.target.value)} placeholder="https://..." style={inp} />
        </div>
        <div>
          <label style={lbl}>代替テキスト</label>
          <input value={data.alt} onChange={e => set('alt', e.target.value)} style={inp} />
        </div>
      </>}

      {type === 'button' && <>
        <div>
          <label style={lbl}>ボタンテキスト</label>
          <input value={data.label} onChange={e => set('label', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>リンク先URL</label>
          <input value={data.url} onChange={e => set('url', e.target.value)} placeholder="https://..." style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>背景色</label>
            <input type="color" value={data.bgColor} onChange={e => set('bgColor', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} />
          </div>
          <div>
            <label style={lbl}>文字色</label>
            <input type="color" value={data.textColor} onChange={e => set('textColor', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} />
          </div>
        </div>
        <div>
          <label style={lbl}>揃え</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => set('align', a)}
                style={{ flex: 1, padding: '6px 0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, background: data.align === a ? '#1a3560' : '#fff', color: data.align === a ? '#fff' : '#555', cursor: 'pointer' }}>
                {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
              </button>
            ))}
          </div>
        </div>
      </>}

      {type === 'divider' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>線の色</label>
            <input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} />
          </div>
          <div>
            <label style={lbl}>太さ(px)</label>
            <input type="number" value={data.thickness} onChange={e => set('thickness', Number(e.target.value))} min={1} max={8} style={inp} />
          </div>
        </div>
      </>}

      {type === 'spacer' && (
        <div>
          <label style={lbl}>高さ(px)</label>
          <input type="number" value={data.height} onChange={e => set('height', Number(e.target.value))} min={8} max={120} style={inp} />
        </div>
      )}
    </div>
  )
}

export default function NewsletterPage() {
  const [blocks, setBlocks] = useState([newBlock('heading'), newBlock('text')])
  const [selectedId, setSelectedId] = useState(null)
  const [subject, setSubject] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(null)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch('/api/admin/newsletter').then(r => r.json()).then(d => {
      if (d.count !== undefined) setSubscriberCount(d.count)
    })
  }, [])

  const selectedBlock = blocks.find(b => b.id === selectedId) || null

  function addBlock(type) {
    const b = newBlock(type)
    setBlocks(prev => [...prev, b])
    setSelectedId(b.id)
  }

  function updateBlock(id, data) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b))
  }

  function moveBlock(id, dir) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev
      const next = [...prev]
      ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
      return next
    })
  }

  function deleteBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setSelectedId(null)
  }

  async function handleSend() {
    setSending(true)
    setResult(null)
    const html = generateHtml(blocks)
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
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fb' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e8f0', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
        <span style={{ fontWeight: 700, color: '#1a3560', fontSize: 15 }}>📧 メルマガ配信</span>
        <span style={{ fontSize: 12, color: '#888' }}>同意済み：<strong>{subscriberCount ?? '...'}</strong>名</span>
        <div style={{ flex: 1 }} />
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="件名を入力"
          style={{ width: 260, padding: '7px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13 }} />
        {!confirmed ? (
          <button onClick={() => { if (!subject.trim()) { alert('件名を入力してください'); return } setConfirmed(true) }}
            disabled={!subject.trim() || blocks.length === 0}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!subject.trim() || blocks.length === 0) ? 0.5 : 1 }}>
            送信確認
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#795548', fontWeight: 600 }}>{subscriberCount}名に送信します</span>
            <button onClick={handleSend} disabled={sending}
              style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
              {sending ? '送信中...' : '送信する'}
            </button>
            <button onClick={() => setConfirmed(false)}
              style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
              戻る
            </button>
          </div>
        )}
      </div>

      {result && (
        <div style={{ padding: '8px 20px', background: result.error ? '#ffebee' : '#e8f5e9', fontSize: 13, borderBottom: '1px solid #ddd' }}>
          {result.error
            ? <span style={{ color: '#e53935' }}>エラー: {result.error}</span>
            : <span style={{ color: '#388e3c', fontWeight: 600 }}>✅ 送信完了：{result.sent}件成功{result.failed > 0 ? ` / ${result.failed}件失敗` : ''}</span>}
        </div>
      )}

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Block palette */}
        <div style={{ width: 130, background: '#fff', borderRight: '1px solid #e0e8f0', padding: '16px 10px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10, letterSpacing: '0.05em' }}>ブロック追加</div>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px 8px', marginBottom: 8, border: '1px solid #e0e8f0', borderRadius: 10, background: '#f8fbff', cursor: 'pointer', fontSize: 11, color: '#1a3560', fontWeight: 600, gap: 4 }}>
              <span style={{ fontSize: 20 }}>{bt.icon}</span>
              {bt.label}
            </button>
          ))}
        </div>

        {/* Center: Preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: '#f0f4fb' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Email header preview */}
            <div style={{ background: '#1a3560', padding: '20px 32px', textAlign: 'center' }}>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.05em' }}>PhotoFleur</span>
            </div>
            <div style={{ padding: '24px 32px' }}>
              {blocks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>
                  左のパネルからブロックを追加してください
                </div>
              ) : blocks.map((block, idx) => (
                <BlockPreview
                  key={block.id}
                  block={block}
                  selected={block.id === selectedId}
                  onClick={() => setSelectedId(block.id)}
                  onUp={() => moveBlock(block.id, -1)}
                  onDown={() => moveBlock(block.id, 1)}
                  onDelete={() => deleteBlock(block.id)}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                />
              ))}
            </div>
            <div style={{ background: '#f5f5f5', padding: '14px 32px', fontSize: 11, color: '#999', textAlign: 'center' }}>
              PhotoFleur｜このメールは予約時にメルマガを希望されたお客様にお送りしています。
            </div>
          </div>
        </div>

        {/* Right: Block editor */}
        <div style={{ width: 260, background: '#fff', borderLeft: '1px solid #e0e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <BlockEditor
            block={selectedBlock}
            onChange={data => selectedBlock && updateBlock(selectedBlock.id, data)}
          />
        </div>
      </div>
    </div>
  )
}
