'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

const BLOCK_TYPES = [
  { type: 'heading', label: '見出し', icon: 'H' },
  { type: 'text', label: 'テキスト', icon: 'T' },
  { type: 'image', label: '画像', icon: '🖼️' },
  { type: 'button', label: 'ボタン', icon: '□' },
  { type: 'divider', label: '区切り線', icon: '—' },
  { type: 'spacer', label: '余白', icon: '↕' },
]

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;600;700&family=Dancing+Script:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Josefin+Sans:wght@300;400;600&family=EB+Garamond:ital,wght@0,400;1,400&family=Noto+Sans+JP:wght@300;400;700&family=Noto+Serif+JP:wght@300;400;700&family=M+PLUS+Rounded+1c:wght@300;400;700&family=Zen+Kaku+Gothic+New:wght@300;400;700&family=Shippori+Mincho:wght@400;700&display=swap'

const FONTS = [
  { group: '── ゴシック系 ──', isGroup: true },
  { label: 'Arial（標準）', value: 'Arial, sans-serif' },
  { label: 'Helvetica Neue', value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Lato（細め・洗練）', value: "'Lato', sans-serif" },
  { label: 'Montserrat（モダン）', value: "'Montserrat', sans-serif" },
  { label: 'Josefin Sans（スリム）', value: "'Josefin Sans', sans-serif" },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { group: '── 明朝・セリフ系 ──', isGroup: true },
  { label: 'Playfair Display（エレガント）', value: "'Playfair Display', Georgia, serif" },
  { label: 'Cormorant Garamond（上品）', value: "'Cormorant Garamond', Georgia, serif" },
  { label: 'EB Garamond（クラシック）', value: "'EB Garamond', Georgia, serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { group: '── 筆記体・装飾 ──', isGroup: true },
  { label: 'Dancing Script（手書き）', value: "'Dancing Script', cursive" },
  { group: '── 日本語 ──', isGroup: true },
  { label: 'Noto Sans JP（ゴシック）', value: "'Noto Sans JP', 'Hiragino Sans', sans-serif" },
  { label: 'Noto Serif JP（明朝）', value: "'Noto Serif JP', 'Hiragino Mincho ProN', serif" },
  { label: 'M PLUS Rounded 1c（丸ゴシック）', value: "'M PLUS Rounded 1c', sans-serif" },
  { label: 'Zen Kaku Gothic New', value: "'Zen Kaku Gothic New', sans-serif" },
  { label: 'Shippori Mincho（明朝）', value: "'Shippori Mincho', serif" },
  { label: 'メイリオ', value: 'Meiryo, sans-serif' },
  { label: '游ゴシック', value: "'Yu Gothic', YuGothic, sans-serif" },
  { label: 'ヒラギノ角ゴ', value: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif" },
  { group: '── その他 ──', isGroup: true },
  { label: 'Courier New（等幅）', value: "'Courier New', monospace" },
]

const DEFAULTS = {
  heading: { text: '見出しテキスト', size: 26, align: 'center', color: '#1a3560', font: 'Arial, sans-serif', bold: true, italic: false, shadow: false, letterSpacing: 0 },
  text: { text: '本文テキストを入力してください。', size: 14, align: 'left', color: '#333333', font: 'Arial, sans-serif', bold: false, italic: false, shadow: false, letterSpacing: 0, lineHeight: 1.8 },
  image: { url: '', alt: '', link: '', width: '100%', height: 'auto', borderRadius: 0, opacity: 100, shadow: false, grayscale: false },
  button: { label: 'ボタン', url: '', bgColor: '#1a3560', textColor: '#ffffff', align: 'center' },
  divider: { color: '#e0e0e0', thickness: 1 },
  spacer: { height: 24 },
}

let _id = 1
const uid = () => _id++
const newBlock = (type) => ({ id: uid(), type, data: { ...DEFAULTS[type] } })
const newCell = (block = null) => ({ id: uid(), block })
const newRow = (type) => ({ id: uid(), cells: [newCell(newBlock(type))] })

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
    if (!data.url) return '<div style="background:#f0f4fb;height:80px;display:flex;align-items:center;justify-content:center;margin:0 0 8px;border-radius:4px;color:#aaa;font-size:12px;">画像未選択</div>'
    const wStyle = data.width && data.width !== '100%' ? `width:${data.width};` : 'max-width:100%;'
    const hStyle = data.height && data.height !== 'auto' ? `height:${data.height};object-fit:cover;` : ''
    const effects = [
      `border-radius:${data.borderRadius || 0}px`,
      `opacity:${(data.opacity ?? 100) / 100}`,
      data.shadow ? 'box-shadow:0 4px 16px rgba(0,0,0,0.2)' : '',
      data.grayscale ? 'filter:grayscale(100%)' : '',
    ].filter(Boolean).join(';')
    const img = `<img src="${data.url}" alt="${data.alt || ''}" style="${wStyle}${hStyle}display:block;margin:0 auto;${effects}" />`
    return `<div style="margin:0 0 8px;text-align:center;">${data.link ? `<a href="${data.link}" style="display:inline-block;">${img}</a>` : img}</div>`
  }
  if (type === 'button') return `<div style="text-align:${data.align};margin:0 0 8px;"><a href="${data.url || '#'}" style="display:inline-block;background:${data.bgColor};color:${data.textColor};text-decoration:none;border-radius:8px;padding:12px 32px;font-size:15px;font-weight:700;">${data.label}</a></div>`
  if (type === 'divider') return `<hr style="border:none;border-top:${data.thickness}px solid ${data.color};margin:8px 0;" />`
  if (type === 'spacer') return `<div style="height:${data.height}px;"></div>`
  return ''
}

function rowToHtml(row) {
  const blocks = row.cells.map(c => c.block ? blockToHtml(c.block) : '')
  if (row.cells.length === 1) return blocks[0]
  const pct = Math.floor(100 / row.cells.length)
  const cols = row.cells.map((c, i) =>
    `<td width="${pct}%" style="vertical-align:top;padding:0 6px;">${blocks[i]}</td>`
  ).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin:0 0 8px;"><tr>${cols}</tr></table>`
}

function generateHtml(rows, header, footer) {
  return `<!DOCTYPE html><html><head><link href="${GOOGLE_FONTS_URL}" rel="stylesheet"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
<div style="background:${header.bgColor};padding:24px 32px;text-align:center;">
<span style="color:${header.textColor};font-size:${header.fontSize}px;font-weight:700;letter-spacing:0.05em;">${header.text}</span>
</div>
<div style="padding:32px;">
${rows.map(rowToHtml).join('\n')}
</div>
<div style="background:#f5f5f5;padding:16px 32px;font-size:11px;color:#999;text-align:center;">
${footer}
</div>
</div>
</body></html>`
}

function ResizableImage({ data, onResize }) {
  const containerRef = useRef(null)
  const startDrag = useCallback((e, dir) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startW = containerRef.current?.offsetWidth || 300
    const startH = containerRef.current?.offsetHeight || 200
    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (dir === 'corner') onResize({ width: `${Math.max(60, startW + dx)}px`, height: `${Math.max(40, startH + dy)}px` })
      else if (dir === 'right') onResize({ width: `${Math.max(60, startW + dx)}px` })
      else if (dir === 'bottom') onResize({ height: `${Math.max(40, startH + dy)}px` })
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [onResize])

  if (!data.url) return <div style={{ background: '#f0f4fb', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12, borderRadius: 4 }}>画像未選択</div>
  const w = data.width && data.width !== '100%' ? data.width : '100%'
  const h = data.height && data.height !== 'auto' ? data.height : 'auto'
  const effects = { borderRadius: `${data.borderRadius || 0}px`, opacity: (data.opacity ?? 100) / 100, boxShadow: data.shadow ? '0 4px 16px rgba(0,0,0,0.2)' : 'none', filter: data.grayscale ? 'grayscale(100%)' : 'none' }
  const handle = { position: 'absolute', background: '#1a3560', borderRadius: 2 }
  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: w, maxWidth: '100%', margin: '0 auto' }}>
      <img src={data.url} alt={data.alt || ''} style={{ width: '100%', height: h, objectFit: h === 'auto' ? 'fill' : 'cover', display: 'block', ...effects }} />
      <div onMouseDown={e => startDrag(e, 'right')} style={{ ...handle, width: 8, height: 36, top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' }} />
      <div onMouseDown={e => startDrag(e, 'bottom')} style={{ ...handle, width: 36, height: 8, bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }} />
      <div onMouseDown={e => startDrag(e, 'corner')} style={{ ...handle, width: 12, height: 12, bottom: -4, right: -4, cursor: 'nwse-resize' }} />
      <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', borderRadius: 3, padding: '1px 5px', pointerEvents: 'none' }}>{w} × {h}</div>
    </div>
  )
}

const ctrlBtn = { padding: '2px 6px', fontSize: 10, border: 'none', borderRadius: 4, background: '#1a3560', color: '#fff', cursor: 'pointer' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }
const section = { borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }
const checkRow = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }

function RightPanel({ selectedId, block, onBlockChange, onDeleteBlock, header, onHeaderChange, footer, onFooterChange }) {
  if (selectedId === 'header') {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>ヘッダーの設定</div>
        <div><label style={lbl}>ロゴ・タイトル文字</label><input value={header.text} onChange={e => onHeaderChange({ ...header, text: e.target.value })} style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>背景色</label><input type="color" value={header.bgColor} onChange={e => onHeaderChange({ ...header, bgColor: e.target.value })} style={{ ...inp, padding: 2, height: 36 }} /></div>
          <div><label style={lbl}>文字色</label><input type="color" value={header.textColor} onChange={e => onHeaderChange({ ...header, textColor: e.target.value })} style={{ ...inp, padding: 2, height: 36 }} /></div>
        </div>
        <div><label style={lbl}>文字サイズ(px)</label><input type="number" value={header.fontSize} onChange={e => onHeaderChange({ ...header, fontSize: Number(e.target.value) })} style={inp} /></div>
      </div>
    )
  }
  if (selectedId === 'footer') {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>フッターの設定</div>
        <div><label style={lbl}>フッターテキスト</label><textarea value={footer} onChange={e => onFooterChange(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} /></div>
      </div>
    )
  }
  if (!block) return (
    <div style={{ padding: 20, color: '#aaa', fontSize: 13 }}>
      ブロックを選択してください
      <br /><span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>ヘッダーやフッターをクリックすると設定できます</span>
      <div style={{ marginTop: 24, padding: 12, background: '#f8fbff', borderRadius: 8, fontSize: 11, color: '#888', lineHeight: 1.7 }}>
        <strong style={{ color: '#1a3560', display: 'block', marginBottom: 4 }}>使い方</strong>
        🖱️ 左パネルをドラッグ → セルへドロップでブロック追加<br />
        ⠿ 行の左端ハンドルをドラッグで行を並び替え<br />
        📦 ブロックをドラッグして他のセルへ移動<br />
        1列/2列/3列ボタンで横並びレイアウト変更
      </div>
    </div>
  )

  const { type, data } = block
  const set = (key, val) => onBlockChange({ ...data, [key]: val })

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>
          {BLOCK_TYPES.find(b => b.type === type)?.label} の設定
        </div>
        <button onClick={onDeleteBlock} style={{ ...ctrlBtn, background: '#e53935', fontSize: 11 }}>削除</button>
      </div>

      {(type === 'heading' || type === 'text') && <>
        <div>
          <label style={lbl}>{type === 'heading' ? '見出しテキスト' : '本文'}</label>
          <textarea value={data.text} onChange={e => set('text', e.target.value)} rows={type === 'text' ? 6 : 2} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div>
          <label style={lbl}>フォント</label>
          <select value={data.font || 'Arial, sans-serif'} onChange={e => set('font', e.target.value)} style={inp}>
            {FONTS.map((f, i) => f.isGroup
              ? <option key={i} disabled style={{ color: '#999', fontWeight: 700 }}>{f.group}</option>
              : <option key={f.value} value={f.value}>{f.label}</option>
            )}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>文字サイズ(px)</label><input type="number" value={data.size} onChange={e => set('size', Number(e.target.value))} style={inp} /></div>
          <div><label style={lbl}>文字色</label><input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>字間(px)</label><input type="number" value={data.letterSpacing || 0} onChange={e => set('letterSpacing', Number(e.target.value))} min={-2} max={20} style={inp} /></div>
          {type === 'text' && <div><label style={lbl}>行間</label><input type="number" value={data.lineHeight || 1.8} step={0.1} onChange={e => set('lineHeight', Number(e.target.value))} min={1} max={4} style={inp} /></div>}
        </div>
        <div>
          <label style={lbl}>揃え</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => set('align', a)} style={{ flex: 1, padding: '6px 0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, background: data.align === a ? '#1a3560' : '#fff', color: data.align === a ? '#fff' : '#555', cursor: 'pointer' }}>
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
          <div><label style={lbl}>横幅</label><input value={data.width} onChange={e => set('width', e.target.value)} placeholder="100% or 300px" style={inp} /></div>
          <div><label style={lbl}>縦幅</label><input value={data.height} onChange={e => set('height', e.target.value)} placeholder="auto or 200px" style={inp} /></div>
        </div>
        <div><label style={lbl}>リンク先URL（任意）</label><input value={data.link} onChange={e => set('link', e.target.value)} placeholder="https://..." style={inp} /></div>
        <div style={section}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>エフェクト</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lbl}>角丸(px)</label><input type="number" value={data.borderRadius || 0} onChange={e => set('borderRadius', Number(e.target.value))} min={0} max={100} style={inp} /></div>
            <div><label style={lbl}>透明度 {data.opacity ?? 100}%</label><input type="range" value={data.opacity ?? 100} onChange={e => set('opacity', Number(e.target.value))} min={0} max={100} style={{ width: '100%' }} /></div>
            <label style={checkRow}><input type="checkbox" checked={!!data.shadow} onChange={e => set('shadow', e.target.checked)} /> ドロップシャドウ</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.grayscale} onChange={e => set('grayscale', e.target.checked)} /> グレースケール</label>
          </div>
        </div>
      </>}

      {type === 'button' && <>
        <div><label style={lbl}>ボタンテキスト</label><input value={data.label} onChange={e => set('label', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>リンク先URL</label><input value={data.url} onChange={e => set('url', e.target.value)} placeholder="https://..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>背景色</label><input type="color" value={data.bgColor} onChange={e => set('bgColor', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
          <div><label style={lbl}>文字色</label><input type="color" value={data.textColor} onChange={e => set('textColor', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
        </div>
        <div>
          <label style={lbl}>揃え</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => set('align', a)} style={{ flex: 1, padding: '6px 0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, background: data.align === a ? '#1a3560' : '#fff', color: data.align === a ? '#fff' : '#555', cursor: 'pointer' }}>
                {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
              </button>
            ))}
          </div>
        </div>
      </>}

      {type === 'divider' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>線の色</label><input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
          <div><label style={lbl}>太さ(px)</label><input type="number" value={data.thickness} onChange={e => set('thickness', Number(e.target.value))} min={1} max={8} style={inp} /></div>
        </div>
      )}

      {type === 'spacer' && (
        <div><label style={lbl}>高さ(px)</label><input type="number" value={data.height} onChange={e => set('height', Number(e.target.value))} min={8} max={120} style={inp} /></div>
      )}
    </div>
  )
}

function RowDropZone({ active, onDragOver, onDrop, onDragLeave }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      style={{ height: active ? 8 : 6, background: active ? '#5bbfd6' : 'transparent', borderRadius: 4, margin: '1px 0', transition: 'all 0.12s', cursor: 'default' }}
    />
  )
}

export default function NewsletterPage() {
  const [rows, setRows] = useState(() => [newRow('heading'), newRow('text')])
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [header, setHeader] = useState({ bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 })
  const [footer, setFooter] = useState('PhotoFleur｜このメールはメルマガを希望されたカメラマン様にお送りしています。')
  const [subject, setSubject] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(null)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const [dropIndicator, setDropIndicator] = useState(null)
  const dragData = useRef(null)

  useEffect(() => {
    fetch('/api/admin/newsletter').then(r => r.json()).then(d => {
      if (d.count !== undefined) setSubscriberCount(d.count)
    })
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = GOOGLE_FONTS_URL
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  // Find the selected block across all rows
  const selectedBlock = (() => {
    if (typeof selectedBlockId !== 'number') return null
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.block?.id === selectedBlockId) return cell.block
      }
    }
    return null
  })()

  function addRow(type) {
    const r = newRow(type)
    setRows(prev => [...prev, r])
    setSelectedBlockId(r.cells[0].block.id)
  }

  function deleteRow(rowId) {
    setRows(prev => prev.filter(r => r.id !== rowId))
    setSelectedBlockId(null)
  }

  function moveRow(rowId, dir) {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === rowId)
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
      return next
    })
  }

  function setRowCols(rowId, n) {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const cells = [...r.cells]
      while (cells.length < n) cells.push(newCell(null))
      while (cells.length > n) cells.pop()
      return { ...r, cells }
    }))
  }

  function updateBlock(blockId, data) {
    setRows(prev => prev.map(r => ({
      ...r,
      cells: r.cells.map(c => c.block?.id === blockId ? { ...c, block: { ...c.block, data } } : c)
    })))
  }

  function deleteSelectedBlock() {
    if (typeof selectedBlockId !== 'number') return
    setRows(prev => prev.map(r => ({
      ...r,
      cells: r.cells.map(c => c.block?.id === selectedBlockId ? { ...c, block: null } : c)
    })))
    setSelectedBlockId(null)
  }

  // DnD: row reorder
  function handleRowHandleDragStart(e, rowId) {
    e.stopPropagation()
    dragData.current = { kind: 'row', rowId }
  }

  function handleRowZoneDragOver(e, insertBeforeRowId) {
    e.preventDefault()
    e.stopPropagation()
    if (dragData.current?.kind !== 'row') return
    setDropIndicator({ kind: 'row', insertBeforeRowId })
  }

  function handleRowZoneDrop(insertBeforeRowId) {
    if (dragData.current?.kind !== 'row') return
    const { rowId } = dragData.current
    setRows(prev => {
      const moving = prev.find(r => r.id === rowId)
      if (!moving) return prev
      const without = prev.filter(r => r.id !== rowId)
      if (insertBeforeRowId === null) return [...without, moving]
      const idx = without.findIndex(r => r.id === insertBeforeRowId)
      if (idx === -1) return [...without, moving]
      without.splice(idx, 0, moving)
      return without
    })
    setDropIndicator(null)
    dragData.current = null
  }

  // DnD: block between cells
  function handleBlockDragStart(e, rowId, cellId) {
    e.stopPropagation()
    dragData.current = { kind: 'block', rowId, cellId }
  }

  // DnD: new block from palette
  function handlePaletteDragStart(e, type) {
    dragData.current = { kind: 'new', type }
  }

  function handleCellDragOver(e, rowId, cellId) {
    e.preventDefault()
    e.stopPropagation()
    const d = dragData.current
    if (!d || d.kind === 'row') return
    setDropIndicator({ kind: 'cell', rowId, cellId })
  }

  function handleCellDrop(e, rowId, cellId) {
    e.stopPropagation()
    const d = dragData.current
    if (!d || d.kind === 'row') return

    if (d.kind === 'new') {
      const block = newBlock(d.type)
      setRows(prev => prev.map(r => r.id !== rowId ? r : {
        ...r,
        cells: r.cells.map(c => c.id !== cellId ? c : { ...c, block })
      }))
      setSelectedBlockId(block.id)
    } else if (d.kind === 'block') {
      setRows(prev => {
        const srcBlock = prev.find(r => r.id === d.rowId)?.cells.find(c => c.id === d.cellId)?.block ?? null
        const dstBlock = prev.find(r => r.id === rowId)?.cells.find(c => c.id === cellId)?.block ?? null
        return prev.map(r => ({
          ...r,
          cells: r.cells.map(c => {
            if (r.id === d.rowId && c.id === d.cellId) return { ...c, block: dstBlock }
            if (r.id === rowId && c.id === cellId) return { ...c, block: srcBlock }
            return c
          })
        }))
      })
    }

    setDropIndicator(null)
    dragData.current = null
  }

  function handleDragEnd() {
    setDropIndicator(null)
    dragData.current = null
  }

  async function handleSend() {
    setSending(true)
    setResult(null)
    const html = generateHtml(rows, header, footer)
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

  const rowZoneActive = (insertBeforeRowId) =>
    dropIndicator?.kind === 'row' && dropIndicator.insertBeforeRowId === insertBeforeRowId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fb' }} onDragEnd={handleDragEnd}>
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
            disabled={!subject.trim() || rows.length === 0}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!subject.trim() || rows.length === 0) ? 0.5 : 1 }}>
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
        {/* Left: block palette */}
        <div style={{ width: 110, background: '#fff', borderRight: '1px solid #e0e8f0', padding: '16px 8px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 10, letterSpacing: '0.05em' }}>ブロック追加</div>
          {BLOCK_TYPES.map(bt => (
            <div key={bt.type}
              draggable
              onDragStart={e => handlePaletteDragStart(e, bt.type)}
              onClick={() => addRow(bt.type)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '10px 6px', marginBottom: 6, border: '1px solid #e0e8f0', borderRadius: 10, background: '#f8fbff', cursor: 'grab', fontSize: 10, color: '#1a3560', fontWeight: 600, gap: 4, userSelect: 'none' }}>
              <span style={{ fontSize: 18 }}>{bt.icon}</span>
              {bt.label}
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '8px 6px', fontSize: 9, color: '#bbb', lineHeight: 1.6 }}>
            ドラッグしてセルへ<br />追加できます
          </div>
        </div>

        {/* Center: canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: '#f0f4fb' }}
          onClick={() => setSelectedBlockId(null)}>
          <div style={{ maxWidth: 620, margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Header */}
            <div onClick={e => { e.stopPropagation(); setSelectedBlockId('header') }}
              style={{ background: header.bgColor, padding: '20px 32px', textAlign: 'center', cursor: 'pointer', outline: selectedBlockId === 'header' ? '2px solid #5bbfd6' : 'none' }}>
              <span style={{ color: header.textColor, fontSize: header.fontSize, fontWeight: 700, letterSpacing: '0.05em' }}>{header.text}</span>
              {selectedBlockId === 'header' && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>クリックして編集</div>}
            </div>

            {/* Rows */}
            <div style={{ padding: '16px 24px' }} onClick={e => e.stopPropagation()}>
              {rows.length === 0 && (
                <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>左のパネルからブロックを追加してください</div>
              )}

              <RowDropZone
                active={rowZoneActive(rows[0]?.id ?? null)}
                onDragOver={e => handleRowZoneDragOver(e, rows[0]?.id ?? null)}
                onDrop={() => handleRowZoneDrop(rows[0]?.id ?? null)}
                onDragLeave={() => setDropIndicator(null)}
              />

              {rows.map((row, rowIdx) => (
                <div key={row.id}>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, marginBottom: 2 }}>
                    {/* Drag handle */}
                    <div
                      draggable
                      onDragStart={e => handleRowHandleDragStart(e, row.id)}
                      title="ドラッグして行を移動"
                      style={{ display: 'flex', alignItems: 'center', padding: '0 4px', cursor: 'grab', color: '#ccc', fontSize: 18, flexShrink: 0, userSelect: 'none' }}>
                      ⠿
                    </div>

                    {/* Cells */}
                    <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 0 }}>
                      {row.cells.map(cell => {
                        const isSelected = cell.block?.id === selectedBlockId
                        const isCellDrop = dropIndicator?.kind === 'cell' && dropIndicator.rowId === row.id && dropIndicator.cellId === cell.id
                        return (
                          <div key={cell.id}
                            style={{ flex: 1, minWidth: 0, borderRadius: 6, border: isCellDrop ? '2px dashed #5bbfd6' : '2px dashed transparent', background: isCellDrop ? '#f0faff' : 'transparent', transition: 'all 0.1s' }}
                            onDragOver={e => handleCellDragOver(e, row.id, cell.id)}
                            onDrop={e => handleCellDrop(e, row.id, cell.id)}
                            onDragLeave={() => setDropIndicator(null)}>
                            {cell.block ? (
                              <div
                                draggable
                                onDragStart={e => handleBlockDragStart(e, row.id, cell.id)}
                                onClick={e => { e.stopPropagation(); setSelectedBlockId(cell.block.id) }}
                                style={{ outline: isSelected ? '2px solid #1a3560' : '2px solid transparent', borderRadius: 4, padding: 8, background: isSelected ? '#f0f5ff' : 'transparent', cursor: 'pointer', userSelect: 'none' }}>
                                {isSelected && cell.block.type === 'image'
                                  ? <ResizableImage data={cell.block.data} onResize={updates => updateBlock(cell.block.id, { ...cell.block.data, ...updates })} />
                                  : <div dangerouslySetInnerHTML={{ __html: blockToHtml(cell.block) }} style={{ pointerEvents: 'none' }} />
                                }
                              </div>
                            ) : (
                              <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCellDrop ? '#5bbfd6' : '#ddd', fontSize: 11, borderRadius: 4, background: isCellDrop ? 'transparent' : '#fafafa', border: '1px dashed #e5e5e5' }}>
                                {isCellDrop ? 'ここにドロップ' : '空のセル'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Row controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 2, flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                        {[1, 2, 3].map(n => (
                          <button key={n} onClick={() => setRowCols(row.id, n)}
                            title={`${n}列レイアウト`}
                            style={{ ...ctrlBtn, background: row.cells.length === n ? '#1a3560' : '#e8eef5', color: row.cells.length === n ? '#fff' : '#666', padding: '2px 5px', fontSize: 9 }}>
                            {n}列
                          </button>
                        ))}
                      </div>
                      <button onClick={() => moveRow(row.id, -1)} disabled={rowIdx === 0} style={{ ...ctrlBtn, opacity: rowIdx === 0 ? 0.3 : 1 }}>▲</button>
                      <button onClick={() => moveRow(row.id, 1)} disabled={rowIdx === rows.length - 1} style={{ ...ctrlBtn, opacity: rowIdx === rows.length - 1 ? 0.3 : 1 }}>▼</button>
                      <button onClick={() => deleteRow(row.id)} style={{ ...ctrlBtn, background: '#e53935' }}>✕</button>
                    </div>
                  </div>

                  <RowDropZone
                    active={rowZoneActive(rowIdx === rows.length - 1 ? null : rows[rowIdx + 1]?.id)}
                    onDragOver={e => handleRowZoneDragOver(e, rowIdx === rows.length - 1 ? null : rows[rowIdx + 1]?.id)}
                    onDrop={() => handleRowZoneDrop(rowIdx === rows.length - 1 ? null : rows[rowIdx + 1]?.id)}
                    onDragLeave={() => setDropIndicator(null)}
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div onClick={e => { e.stopPropagation(); setSelectedBlockId('footer') }}
              style={{ background: '#f5f5f5', padding: '14px 32px', fontSize: 11, color: '#999', textAlign: 'center', cursor: 'pointer', outline: selectedBlockId === 'footer' ? '2px solid #5bbfd6' : 'none' }}>
              {footer}
              {selectedBlockId === 'footer' && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>クリックして編集</div>}
            </div>
          </div>
        </div>

        {/* Right: editor panel */}
        <div style={{ width: 270, background: '#fff', borderLeft: '1px solid #e0e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <RightPanel
            selectedId={selectedBlockId}
            block={selectedBlock}
            onBlockChange={data => selectedBlock && updateBlock(selectedBlock.id, data)}
            onDeleteBlock={deleteSelectedBlock}
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
