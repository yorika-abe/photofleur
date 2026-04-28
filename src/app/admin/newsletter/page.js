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

const FONTS = [
  { label: 'Arial（標準）', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Georgia（明朝）', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Courier New（等幅）', value: "'Courier New', monospace" },
  { label: 'メイリオ', value: 'Meiryo, sans-serif' },
  { label: 'ヒラギノ角ゴ', value: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif" },
  { label: '游ゴシック', value: "'Yu Gothic', YuGothic, sans-serif" },
]

const DEFAULTS = {
  heading: { text: '見出しテキスト', size: 26, align: 'center', color: '#1a3560', font: 'Arial, sans-serif', bold: true, italic: false, shadow: false, letterSpacing: 0 },
  text: { text: '本文テキストを入力してください。', size: 14, align: 'left', color: '#333333', font: 'Arial, sans-serif', bold: false, italic: false, shadow: false, letterSpacing: 0, lineHeight: 1.8 },
  image: { url: '', alt: '', link: '', width: '100%', height: 'auto', borderRadius: 0, opacity: 100, shadow: false, grayscale: false },
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
  if (type === 'heading' || type === 'text') {
    const tag = type === 'heading' ? 'h2' : 'p'
    const shadow = data.shadow ? 'text-shadow:1px 1px 4px rgba(0,0,0,0.3);' : ''
    const style = [
      `font-size:${data.size}px`,
      `color:${data.color}`,
      `text-align:${data.align}`,
      `font-family:${data.font || 'Arial, sans-serif'}`,
      `font-weight:${data.bold ? '700' : '400'}`,
      `font-style:${data.italic ? 'italic' : 'normal'}`,
      `letter-spacing:${data.letterSpacing || 0}px`,
      `line-height:${data.lineHeight || (type === 'heading' ? 1.4 : 1.8)}`,
      `margin:0 0 16px`,
      `white-space:pre-wrap`,
      shadow,
    ].filter(Boolean).join(';')
    return `<${tag} style="${style}">${data.text}</${tag}>`
  }
  if (type === 'image') {
    if (!data.url) return '<div style="background:#f0f4fb;height:120px;display:flex;align-items:center;justify-content:center;margin:0 0 16px;border-radius:4px;color:#aaa;font-size:13px;">画像未選択</div>'
    const wStyle = data.width && data.width !== '100%' ? `width:${data.width};` : 'max-width:100%;'
    const hStyle = data.height && data.height !== 'auto' ? `height:${data.height};object-fit:cover;` : ''
    const effects = [
      `border-radius:${data.borderRadius || 0}px`,
      `opacity:${(data.opacity ?? 100) / 100}`,
      data.shadow ? 'box-shadow:0 4px 16px rgba(0,0,0,0.2)' : '',
      data.grayscale ? 'filter:grayscale(100%)' : '',
    ].filter(Boolean).join(';')
    const img = `<img src="${data.url}" alt="${data.alt || ''}" style="${wStyle}${hStyle}display:block;margin:0 auto;${effects}" />`
    return `<div style="margin:0 0 16px;text-align:center;">${data.link ? `<a href="${data.link}" style="display:inline-block;">${img}</a>` : img}</div>`
  }
  if (type === 'button') return `<div style="text-align:${data.align};margin:0 0 16px;"><a href="${data.url || '#'}" style="display:inline-block;background:${data.bgColor};color:${data.textColor};text-decoration:none;border-radius:8px;padding:12px 32px;font-size:15px;font-weight:700;">${data.label}</a></div>`
  if (type === 'divider') return `<hr style="border:none;border-top:${data.thickness}px solid ${data.color};margin:8px 0 16px;" />`
  if (type === 'spacer') return `<div style="height:${data.height}px;"></div>`
  return ''
}

function generateHtml(blocks, header, footer) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
<div style="background:${header.bgColor};padding:24px 32px;text-align:center;">
<span style="color:${header.textColor};font-size:${header.fontSize}px;font-weight:700;letter-spacing:0.05em;">${header.text}</span>
</div>
<div style="padding:32px;">
${blocks.map(blockToHtml).join('\n')}
</div>
<div style="background:#f5f5f5;padding:16px 32px;font-size:11px;color:#999;text-align:center;">
${footer}
</div>
</div>
</body></html>`
}

function BlockPreview({ block, selected, onClick, onUp, onDown, onDelete, isFirst, isLast }) {
  return (
    <div onClick={onClick} style={{ position: 'relative', cursor: 'pointer', outline: selected ? '2px solid #1a3560' : '2px solid transparent', borderRadius: 4, marginBottom: 2 }}>
      <div style={{ padding: '8px', background: selected ? '#f0f5ff' : 'transparent' }}>
        <div dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} style={{ pointerEvents: 'none' }} />
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
const section = { borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }
const checkRow = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }

function RightPanel({ selectedId, block, onBlockChange, header, onHeaderChange, footer, onFooterChange }) {
  if (selectedId === 'header') {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>ヘッダーの設定</div>
        <div>
          <label style={lbl}>ロゴ・タイトル文字</label>
          <input value={header.text} onChange={e => onHeaderChange({ ...header, text: e.target.value })} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>背景色</label>
            <input type="color" value={header.bgColor} onChange={e => onHeaderChange({ ...header, bgColor: e.target.value })} style={{ ...inp, padding: 2, height: 36 }} />
          </div>
          <div>
            <label style={lbl}>文字色</label>
            <input type="color" value={header.textColor} onChange={e => onHeaderChange({ ...header, textColor: e.target.value })} style={{ ...inp, padding: 2, height: 36 }} />
          </div>
        </div>
        <div>
          <label style={lbl}>文字サイズ(px)</label>
          <input type="number" value={header.fontSize} onChange={e => onHeaderChange({ ...header, fontSize: Number(e.target.value) })} style={inp} />
        </div>
      </div>
    )
  }
  if (selectedId === 'footer') {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>フッターの設定</div>
        <div>
          <label style={lbl}>フッターテキスト</label>
          <textarea value={footer} onChange={e => onFooterChange(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} />
        </div>
      </div>
    )
  }
  if (!block) return <div style={{ padding: 20, color: '#aaa', fontSize: 13 }}>ブロックを選択してください<br /><span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>ヘッダーやフッターをクリックすると設定できます</span></div>

  const { type, data } = block
  const set = (key, val) => onBlockChange({ ...data, [key]: val })

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>
        {BLOCK_TYPES.find(b => b.type === type)?.label} の設定
      </div>

      {(type === 'heading' || type === 'text') && <>
        <div>
          <label style={lbl}>{type === 'heading' ? '見出しテキスト' : '本文'}</label>
          <textarea value={data.text} onChange={e => set('text', e.target.value)} rows={type === 'text' ? 6 : 2}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div>
          <label style={lbl}>フォント</label>
          <select value={data.font || 'Arial, sans-serif'} onChange={e => set('font', e.target.value)} style={inp}>
            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>字間(px)</label>
            <input type="number" value={data.letterSpacing || 0} onChange={e => set('letterSpacing', Number(e.target.value))} min={-2} max={20} style={inp} />
          </div>
          {type === 'text' && (
            <div>
              <label style={lbl}>行間</label>
              <input type="number" value={data.lineHeight || 1.8} step={0.1} onChange={e => set('lineHeight', Number(e.target.value))} min={1} max={4} style={inp} />
            </div>
          )}
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
        <div style={section}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>エフェクト</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={checkRow}><input type="checkbox" checked={!!data.bold} onChange={e => set('bold', e.target.checked)} /> 太字</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.italic} onChange={e => set('italic', e.target.checked)} /> 斜体</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.shadow} onChange={e => set('shadow', e.target.checked)} /> 文字に影をつける</label>
          </div>
        </div>
      </>}

      {type === 'image' && <>
        <div>
          <label style={lbl}>画像をアップロード</label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#e0f2fe', color: '#0369a1', border: '2px dashed #0369a1', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
            📁 ファイルを選択
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files[0]
              if (!file) return
              const fd = new FormData()
              fd.append('file', file)
              const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
              const json = await res.json()
              if (json.url) set('url', json.url)
              else alert('アップロード失敗: ' + json.error)
            }} />
          </label>
          {data.url && <p style={{ fontSize: 11, color: '#388e3c', marginTop: 6 }}>✅ アップロード済み</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>横幅</label>
            <input value={data.width} onChange={e => set('width', e.target.value)} placeholder="100% or 300px" style={inp} />
          </div>
          <div>
            <label style={lbl}>縦幅</label>
            <input value={data.height} onChange={e => set('height', e.target.value)} placeholder="auto or 200px" style={inp} />
          </div>
        </div>
        <div>
          <label style={lbl}>リンク先URL（任意）</label>
          <input value={data.link} onChange={e => set('link', e.target.value)} placeholder="https://..." style={inp} />
        </div>
        <div style={section}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>エフェクト</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={lbl}>角丸(px)</label>
              <input type="number" value={data.borderRadius || 0} onChange={e => set('borderRadius', Number(e.target.value))} min={0} max={100} style={inp} />
            </div>
            <div>
              <label style={lbl}>透明度 {data.opacity ?? 100}%</label>
              <input type="range" value={data.opacity ?? 100} onChange={e => set('opacity', Number(e.target.value))} min={0} max={100} style={{ width: '100%' }} />
            </div>
            <label style={checkRow}><input type="checkbox" checked={!!data.shadow} onChange={e => set('shadow', e.target.checked)} /> ドロップシャドウ</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.grayscale} onChange={e => set('grayscale', e.target.checked)} /> グレースケール</label>
          </div>
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

      {type === 'divider' && (
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
      )}

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
  const [header, setHeader] = useState({ bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 })
  const [footer, setFooter] = useState('PhotoFleur｜このメールはメルマガを希望されたカメラマン様にお送りしています。')
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
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
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
    const html = generateHtml(blocks, header, footer)
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
      {/* Top bar */}
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: palette */}
        <div style={{ width: 120, background: '#fff', borderRight: '1px solid #e0e8f0', padding: '16px 8px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 10, letterSpacing: '0.05em' }}>ブロック追加</div>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '10px 6px', marginBottom: 6, border: '1px solid #e0e8f0', borderRadius: 10, background: '#f8fbff', cursor: 'pointer', fontSize: 10, color: '#1a3560', fontWeight: 600, gap: 4 }}>
              <span style={{ fontSize: 18 }}>{bt.icon}</span>
              {bt.label}
            </button>
          ))}
        </div>

        {/* Center: preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: '#f0f4fb' }} onClick={() => setSelectedId(null)}>
          <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            <div onClick={e => { e.stopPropagation(); setSelectedId('header') }}
              style={{ background: header.bgColor, padding: '20px 32px', textAlign: 'center', cursor: 'pointer', outline: selectedId === 'header' ? '2px solid #5bbfd6' : 'none' }}>
              <span style={{ color: header.textColor, fontSize: header.fontSize, fontWeight: 700, letterSpacing: '0.05em' }}>{header.text}</span>
              {selectedId === 'header' && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>クリックして編集</div>}
            </div>
            <div style={{ padding: '24px 32px' }} onClick={e => e.stopPropagation()}>
              {blocks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>左のパネルからブロックを追加してください</div>
              ) : blocks.map((block, idx) => (
                <BlockPreview key={block.id} block={block} selected={block.id === selectedId}
                  onClick={() => setSelectedId(block.id)}
                  onUp={() => moveBlock(block.id, -1)}
                  onDown={() => moveBlock(block.id, 1)}
                  onDelete={() => deleteBlock(block.id)}
                  isFirst={idx === 0} isLast={idx === blocks.length - 1} />
              ))}
            </div>
            <div onClick={e => { e.stopPropagation(); setSelectedId('footer') }}
              style={{ background: '#f5f5f5', padding: '14px 32px', fontSize: 11, color: '#999', textAlign: 'center', cursor: 'pointer', outline: selectedId === 'footer' ? '2px solid #5bbfd6' : 'none' }}>
              {footer}
              {selectedId === 'footer' && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>クリックして編集</div>}
            </div>
          </div>
        </div>

        {/* Right: editor panel */}
        <div style={{ width: 270, background: '#fff', borderLeft: '1px solid #e0e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <RightPanel
            selectedId={selectedId}
            block={selectedBlock}
            onBlockChange={data => selectedBlock && updateBlock(selectedBlock.id, data)}
            header={header}
            onHeaderChange={setHeader}
            footer={footer}
            onFooterChange={setFooter}
          />
        </div>
      </div>
    </div>
  )
}
