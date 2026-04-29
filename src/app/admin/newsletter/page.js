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

const TEMPLATE_DEFS = [
  { id: 'newsletter', name: 'メルマガ', icon: '📧', isBroadcast: true, vars: [] },
  { id: 'booking-confirmation', name: '予約完了', icon: '✅',
    defaultSubject: '【PhotoFleur】ご予約確定のお知らせ',
    vars: [
      { key: 'customer_name', desc: 'お客様名' },
      { key: 'model_name', desc: 'モデル名' },
      { key: 'event_date', desc: '開催日' },
      { key: 'slot_label', desc: '予約時間' },
      { key: 'price', desc: '料金' },
    ] },
  { id: 'day-before-reminder', name: '前日リマインド', icon: '⏰',
    defaultSubject: '【PhotoFleur】明日の撮影会のご案内',
    vars: [
      { key: 'customer_name', desc: 'お客様名' },
      { key: 'model_name', desc: 'モデル名' },
      { key: 'event_date', desc: '開催日' },
      { key: 'slot_label', desc: '予約時間' },
    ] },
  { id: 'thanks-mail', name: 'サンクス', icon: '🙏',
    defaultSubject: '【PhotoFleur】ご来場ありがとうございました',
    vars: [
      { key: 'customer_name', desc: 'お客様名' },
      { key: 'feedback_url', desc: 'ご意見箱URL' },
    ] },
  { id: 'cancellation', name: 'キャンセル', icon: '❌',
    defaultSubject: '【PhotoFleur】ご予約のキャンセルについて',
    vars: [{ key: 'customer_name', desc: 'お客様名' }] },
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

const BOX_DEFAULTS = { minHeight: 0, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 }

const DEFAULTS = {
  heading: { text: '見出しテキスト', size: 26, align: 'center', color: '#1a3560', font: 'Arial, sans-serif', bold: true, italic: false, shadow: false, letterSpacing: 0, ...BOX_DEFAULTS },
  text: { text: '本文テキストを入力してください。', size: 14, align: 'left', color: '#333333', font: 'Arial, sans-serif', bold: false, italic: false, shadow: false, letterSpacing: 0, lineHeight: 1.8, ...BOX_DEFAULTS },
  image: { url: '', alt: '', link: '', width: '100%', height: 'auto', borderRadius: 0, opacity: 100, shadow: false, grayscale: false, ...BOX_DEFAULTS },
  button: { label: 'ボタン', url: '', bgColor: '#1a3560', textColor: '#ffffff', align: 'center', ...BOX_DEFAULTS },
  divider: { color: '#e0e0e0', thickness: 1, ...BOX_DEFAULTS },
  spacer: { height: 24, ...BOX_DEFAULTS },
}

let _id = 1
const uid = () => _id++
const newBlock = (type) => ({ id: uid(), type, data: { ...DEFAULTS[type] } })
const newCell = (block = null) => ({ id: uid(), block })
const newRow = (type) => ({
  id: uid(),
  cells: [newCell(newBlock(type))],
  colWidths: [100],
  bg: { color: '', imageUrl: '' },
})

function restoreRowsFromDb(rows) {
  return rows.map(row => ({
    ...row,
    id: uid(),
    cells: row.cells.map(cell => ({
      ...cell,
      id: uid(),
      block: cell.block ? { ...cell.block, id: uid() } : null,
    })),
  }))
}

function boxWrap(data, inner) {
  const pt = data.paddingTop ?? 8, pb = data.paddingBottom ?? 8
  const pl = data.paddingLeft ?? 8, pr = data.paddingRight ?? 8
  const mh = data.minHeight || 0
  const style = `padding:${pt}px ${pr}px ${pb}px ${pl}px;${mh ? `min-height:${mh}px;` : ''}box-sizing:border-box;`
  return `<div style="${style}">${inner}</div>`
}

function blockToHtml(b) {
  const { type, data } = b
  if (type === 'heading' || type === 'text') {
    const tag = type === 'heading' ? 'h2' : 'p'
    const shadow = data.shadow ? 'text-shadow:1px 1px 4px rgba(0,0,0,0.3);' : ''
    const style = [
      `font-size:${data.size}px`, `color:${data.color}`, `text-align:${data.align}`,
      `font-family:${data.font || 'Arial, sans-serif'}`,
      `font-weight:${data.bold ? '700' : '400'}`,
      `font-style:${data.italic ? 'italic' : 'normal'}`,
      `letter-spacing:${data.letterSpacing || 0}px`,
      `line-height:${data.lineHeight || (type === 'heading' ? 1.4 : 1.8)}`,
      `margin:0`, `white-space:pre-wrap`, shadow,
    ].filter(Boolean).join(';')
    return boxWrap(data, `<${tag} style="${style}">${data.text}</${tag}>`)
  }
  if (type === 'image') {
    if (!data.url) return boxWrap(data, '<div style="background:#f0f4fb;height:80px;border-radius:4px;"></div>')
    const wStyle = data.width && data.width !== '100%' ? `width:${data.width};` : 'max-width:100%;'
    const hStyle = data.height && data.height !== 'auto' ? `height:${data.height};object-fit:cover;` : ''
    const effects = [`border-radius:${data.borderRadius || 0}px`, `opacity:${(data.opacity ?? 100) / 100}`, data.shadow ? 'box-shadow:0 4px 16px rgba(0,0,0,0.2)' : '', data.grayscale ? 'filter:grayscale(100%)' : ''].filter(Boolean).join(';')
    const img = `<img src="${data.url}" alt="${data.alt || ''}" style="${wStyle}${hStyle}display:block;margin:0 auto;${effects}" />`
    return boxWrap(data, `<div style="text-align:center;">${data.link ? `<a href="${data.link}" style="display:inline-block;">${img}</a>` : img}</div>`)
  }
  if (type === 'button') return boxWrap(data, `<div style="text-align:${data.align};"><a href="${data.url || '#'}" style="display:inline-block;background:${data.bgColor};color:${data.textColor};text-decoration:none;border-radius:8px;padding:12px 32px;font-size:15px;font-weight:700;">${data.label}</a></div>`)
  if (type === 'divider') return boxWrap(data, `<hr style="border:none;border-top:${data.thickness}px solid ${data.color};margin:0;" />`)
  if (type === 'spacer') return `<div style="height:${data.height}px;"></div>`
  return ''
}

function rowBgStyle(bg) {
  if (!bg) return ''
  if (bg.imageUrl) return `background:url('${bg.imageUrl}') center/cover no-repeat;`
  if (bg.color) return `background:${bg.color};`
  return ''
}

function rowToHtml(row) {
  const bg = rowBgStyle(row.bg)
  const wrapStyle = `padding:8px;${bg}`
  if (row.cells.length === 1) {
    const inner = row.cells[0].block ? blockToHtml(row.cells[0].block) : ''
    return bg ? `<div style="${wrapStyle}">${inner}</div>` : inner
  }
  const cols = row.cells.map((c, i) =>
    `<td width="${Math.round(row.colWidths[i])}%" style="vertical-align:top;padding:6px;">${c.block ? blockToHtml(c.block) : ''}</td>`
  ).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin:0 0 8px;${bg}"><tr>${cols}</tr></table>`
}

function generateHtml(rows, header, footer) {
  return `<!DOCTYPE html><html><head><link href="${GOOGLE_FONTS_URL}" rel="stylesheet"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
<div style="background:${header.bgColor};padding:24px 32px;text-align:center;">
<span style="color:${header.textColor};font-size:${header.fontSize}px;font-weight:700;letter-spacing:0.05em;">${header.text}</span>
</div>
<div style="padding:24px 32px;">
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
    e.stopPropagation(); e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const startW = containerRef.current?.offsetWidth || 300
    const startH = containerRef.current?.offsetHeight || 200
    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY
      if (dir === 'corner') onResize({ width: `${Math.max(60, startW + dx)}px`, height: `${Math.max(40, startH + dy)}px` })
      else if (dir === 'right') onResize({ width: `${Math.max(60, startW + dx)}px` })
      else if (dir === 'bottom') onResize({ height: `${Math.max(40, startH + dy)}px` })
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }, [onResize])

  if (!data.url) return <div style={{ background: '#f0f4fb', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13, borderRadius: 4 }}>画像未選択</div>
  const w = data.width && data.width !== '100%' ? data.width : '100%'
  const h = data.height && data.height !== 'auto' ? data.height : 'auto'
  const effects = { borderRadius: `${data.borderRadius || 0}px`, opacity: (data.opacity ?? 100) / 100, boxShadow: data.shadow ? '0 4px 16px rgba(0,0,0,0.2)' : 'none', filter: data.grayscale ? 'grayscale(100%)' : 'none' }
  const handle = { position: 'absolute', background: '#1a3560', borderRadius: 2 }
  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: w, maxWidth: '100%', margin: '0 auto' }}>
      <img src={data.url} alt={data.alt || ''} style={{ width: '100%', height: h, objectFit: h === 'auto' ? 'fill' : 'cover', display: 'block', ...effects }} />
      <div onMouseDown={e => startDrag(e, 'right')} style={{ ...handle, width: 8, height: 40, top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' }} />
      <div onMouseDown={e => startDrag(e, 'bottom')} style={{ ...handle, width: 40, height: 8, bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }} />
      <div onMouseDown={e => startDrag(e, 'corner')} style={{ ...handle, width: 12, height: 12, bottom: -4, right: -4, cursor: 'nwse-resize' }} />
      <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', borderRadius: 3, padding: '1px 5px', pointerEvents: 'none' }}>{w} × {h}</div>
    </div>
  )
}

function ColDivider({ divIdx, rowWidths, containerRef, onUpdateWidths }) {
  const handleMouseDown = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidths = [...rowWidths]
    const containerWidth = containerRef.current?.offsetWidth || 500
    const onMove = (ev) => {
      const dpct = ((ev.clientX - startX) / containerWidth) * 100
      const nw = [...startWidths]
      nw[divIdx] = Math.max(10, startWidths[divIdx] + dpct)
      nw[divIdx + 1] = Math.max(10, startWidths[divIdx + 1] - dpct)
      const total = nw.reduce((a, b) => a + b, 0)
      onUpdateWidths(nw.map(w => (w / total) * 100))
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }
  return (
    <div onMouseDown={handleMouseDown} title="ドラッグで幅を調整"
      style={{ width: 10, flexShrink: 0, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
      <div style={{ width: 3, height: '70%', minHeight: 20, background: '#c8d4e8', borderRadius: 2 }} />
    </div>
  )
}

function BlockResizeHandle({ block, onUpdateBlock }) {
  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = block.data.minHeight || 0
    const onMove = (ev) => {
      const dy = ev.clientY - startY
      onUpdateBlock(block.id, { ...block.data, minHeight: Math.max(0, startH + dy) })
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }
  return (
    <div onMouseDown={handleMouseDown} title="ドラッグして高さを調整"
      style={{ height: 10, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: '40%', height: 3, background: '#1a3560', borderRadius: 2, opacity: 0.5 }} />
    </div>
  )
}

function EmptyCell({ onAdd }) {
  return (
    <div style={{ padding: 10, minHeight: 80 }}>
      <div style={{ fontSize: 10, color: '#bbb', marginBottom: 6, textAlign: 'center' }}>ブロックを追加</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {BLOCK_TYPES.map(bt => (
          <button key={bt.type} onClick={e => { e.stopPropagation(); onAdd(bt.type) }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 2px', border: '1px solid #e0e8f0', borderRadius: 7, background: '#f8fbff', cursor: 'pointer', fontSize: 9, color: '#1a3560', fontWeight: 600, gap: 2 }}>
            <span style={{ fontSize: 14 }}>{bt.icon}</span>
            {bt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const ctrlBtn = { padding: '2px 7px', fontSize: 11, border: 'none', borderRadius: 4, background: '#1a3560', color: '#fff', cursor: 'pointer' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }
const section = { borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }
const checkRow = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }

function RightPanel({ selection, block, row, onBlockChange, onDeleteBlock, onRowBgChange, header, onHeaderChange, footer, onFooterChange, templateVars = [] }) {
  if (selection === 'header') {
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
  if (selection === 'footer') {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>フッターの設定</div>
        <div><label style={lbl}>フッターテキスト</label><textarea value={footer} onChange={e => onFooterChange(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} /></div>
      </div>
    )
  }
  if (selection?.kind === 'row' && row) {
    const bg = row.bg || { color: '', imageUrl: '' }
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>行の背景設定</div>
        <div>
          <label style={lbl}>背景色</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={bg.color || '#ffffff'} onChange={e => onRowBgChange({ ...bg, color: e.target.value, imageUrl: '' })} style={{ ...inp, padding: 2, height: 36, flex: 1 }} />
            {bg.color && <button onClick={() => onRowBgChange({ ...bg, color: '' })} style={{ ...ctrlBtn, background: '#aaa', whiteSpace: 'nowrap' }}>解除</button>}
          </div>
        </div>
        <div>
          <label style={lbl}>背景画像をアップロード</label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#e0f2fe', color: '#0369a1', border: '2px dashed #0369a1', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
            📁 ファイルを選択
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return
              const fd = new FormData(); fd.append('file', file)
              const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
              const json = await res.json()
              if (json.url) onRowBgChange({ ...bg, imageUrl: json.url, color: '' })
              else alert('アップロード失敗: ' + json.error)
            }} />
          </label>
          {bg.imageUrl && (
            <div style={{ marginTop: 8 }}>
              <img src={bg.imageUrl} alt="" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6 }} />
              <button onClick={() => onRowBgChange({ ...bg, imageUrl: '' })} style={{ ...ctrlBtn, background: '#aaa', marginTop: 6, width: '100%' }}>画像を解除</button>
            </div>
          )}
        </div>
      </div>
    )
  }
  if (!block) return (
    <div style={{ padding: 16, color: '#aaa', fontSize: 13 }}>
      <div>ブロックを選択してください</div>
      <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>ヘッダー・フッター・行の余白部分をクリックすると設定できます</span>
      {templateVars.length > 0 && (
        <div style={{ marginTop: 20, background: '#f0f7ff', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3560', marginBottom: 10 }}>使用できる変数</div>
          {templateVars.map(v => (
            <div key={v.key} style={{ marginBottom: 8 }}>
              <code style={{ background: '#e0eeff', color: '#1a3560', padding: '2px 6px', borderRadius: 4, fontSize: 11, userSelect: 'all', display: 'inline-block' }}>
                {`{{${v.key}}}`}
              </code>
              <span style={{ fontSize: 11, color: '#555', marginLeft: 6 }}>{v.desc}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: '#bbb', marginTop: 8 }}>テキストブロックにそのまま入力すると送信時に自動で置換されます</div>
        </div>
      )}
    </div>
  )

  const { type, data } = block
  const set = (key, val) => onBlockChange({ ...data, [key]: val })

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>{BLOCK_TYPES.find(b => b.type === type)?.label} の設定</div>
        <button onClick={onDeleteBlock} style={{ ...ctrlBtn, background: '#e53935' }}>削除</button>
      </div>

      {(type === 'heading' || type === 'text') && <>
        <div><label style={lbl}>{type === 'heading' ? '見出しテキスト' : '本文'}</label>
          <textarea value={data.text} onChange={e => set('text', e.target.value)} rows={type === 'text' ? 6 : 2} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} /></div>
        <div><label style={lbl}>フォント</label>
          <select value={data.font || 'Arial, sans-serif'} onChange={e => set('font', e.target.value)} style={inp}>
            {FONTS.map((f, i) => f.isGroup
              ? <option key={i} disabled style={{ color: '#999', fontWeight: 700 }}>{f.group}</option>
              : <option key={f.value} value={f.value}>{f.label}</option>)}
          </select></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>文字サイズ(px)</label><input type="number" value={data.size} onChange={e => set('size', Number(e.target.value))} style={inp} /></div>
          <div><label style={lbl}>文字色</label><input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>字間(px)</label><input type="number" value={data.letterSpacing || 0} onChange={e => set('letterSpacing', Number(e.target.value))} min={-2} max={20} style={inp} /></div>
          {type === 'text' && <div><label style={lbl}>行間</label><input type="number" value={data.lineHeight || 1.8} step={0.1} onChange={e => set('lineHeight', Number(e.target.value))} min={1} max={4} style={inp} /></div>}
        </div>
        <div><label style={lbl}>揃え</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => set('align', a)} style={{ flex: 1, padding: '6px 0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, background: data.align === a ? '#1a3560' : '#fff', color: data.align === a ? '#fff' : '#555', cursor: 'pointer' }}>
                {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
              </button>))}
          </div></div>
        <div style={section}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>エフェクト</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={checkRow}><input type="checkbox" checked={!!data.bold} onChange={e => set('bold', e.target.checked)} /> 太字</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.italic} onChange={e => set('italic', e.target.checked)} /> 斜体</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.shadow} onChange={e => set('shadow', e.target.checked)} /> 文字に影をつける</label>
          </div></div>
      </>}

      {type === 'image' && <>
        <div><label style={lbl}>画像をアップロード</label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#e0f2fe', color: '#0369a1', border: '2px dashed #0369a1', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
            📁 ファイルを選択
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return
              const fd = new FormData(); fd.append('file', file)
              const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
              const json = await res.json()
              if (json.url) set('url', json.url); else alert('アップロード失敗: ' + json.error)
            }} /></label>
          {data.url && <p style={{ fontSize: 11, color: '#388e3c', marginTop: 6 }}>✅ アップロード済み</p>}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>横幅</label><input value={data.width} onChange={e => set('width', e.target.value)} placeholder="100%" style={inp} /></div>
          <div><label style={lbl}>縦幅</label><input value={data.height} onChange={e => set('height', e.target.value)} placeholder="auto" style={inp} /></div>
        </div>
        <div><label style={lbl}>リンク先URL（任意）</label><input value={data.link} onChange={e => set('link', e.target.value)} placeholder="https://..." style={inp} /></div>
        <div style={section}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>エフェクト</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lbl}>角丸(px)</label><input type="number" value={data.borderRadius || 0} onChange={e => set('borderRadius', Number(e.target.value))} min={0} max={100} style={inp} /></div>
            <div><label style={lbl}>透明度 {data.opacity ?? 100}%</label><input type="range" value={data.opacity ?? 100} onChange={e => set('opacity', Number(e.target.value))} min={0} max={100} style={{ width: '100%' }} /></div>
            <label style={checkRow}><input type="checkbox" checked={!!data.shadow} onChange={e => set('shadow', e.target.checked)} /> ドロップシャドウ</label>
            <label style={checkRow}><input type="checkbox" checked={!!data.grayscale} onChange={e => set('grayscale', e.target.checked)} /> グレースケール</label>
          </div></div>
      </>}

      {type === 'button' && <>
        <div><label style={lbl}>ボタンテキスト</label><input value={data.label} onChange={e => set('label', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>リンク先URL</label><input value={data.url} onChange={e => set('url', e.target.value)} placeholder="https://..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>背景色</label><input type="color" value={data.bgColor} onChange={e => set('bgColor', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
          <div><label style={lbl}>文字色</label><input type="color" value={data.textColor} onChange={e => set('textColor', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
        </div>
        <div><label style={lbl}>揃え</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => set('align', a)} style={{ flex: 1, padding: '6px 0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, background: data.align === a ? '#1a3560' : '#fff', color: data.align === a ? '#fff' : '#555', cursor: 'pointer' }}>
                {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
              </button>))}
          </div></div>
      </>}

      {type === 'divider' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>線の色</label><input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ ...inp, padding: 2, height: 36 }} /></div>
          <div><label style={lbl}>太さ(px)</label><input type="number" value={data.thickness} onChange={e => set('thickness', Number(e.target.value))} min={1} max={8} style={inp} /></div>
        </div>)}

      {type === 'spacer' && (
        <div><label style={lbl}>高さ(px)</label><input type="number" value={data.height} onChange={e => set('height', Number(e.target.value))} min={8} max={120} style={inp} /></div>)}

      {type !== 'spacer' && (
        <div style={section}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>ボックスサイズ</div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>最小高さ(px) ／ 下端ドラッグでも変更可</label>
            <input type="number" value={data.minHeight || 0} onChange={e => set('minHeight', Number(e.target.value))} min={0} max={800} style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={lbl}>上余白(px)</label><input type="number" value={data.paddingTop ?? 8} onChange={e => set('paddingTop', Number(e.target.value))} min={0} max={120} style={inp} /></div>
            <div><label style={lbl}>下余白(px)</label><input type="number" value={data.paddingBottom ?? 8} onChange={e => set('paddingBottom', Number(e.target.value))} min={0} max={120} style={inp} /></div>
            <div><label style={lbl}>左余白(px)</label><input type="number" value={data.paddingLeft ?? 8} onChange={e => set('paddingLeft', Number(e.target.value))} min={0} max={120} style={inp} /></div>
            <div><label style={lbl}>右余白(px)</label><input type="number" value={data.paddingRight ?? 8} onChange={e => set('paddingRight', Number(e.target.value))} min={0} max={120} style={inp} /></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewsletterPage() {
  const [rows, setRows] = useState(() => [newRow('heading'), newRow('text')])
  const [selection, setSelection] = useState(null)
  const [header, setHeader] = useState({ bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 })
  const [footer, setFooter] = useState('PhotoFleur｜このメールはメルマガを希望されたカメラマン様にお送りしています。')
  const [subject, setSubject] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(null)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTemplateId, setActiveTemplateId] = useState('newsletter')
  const [saving, setSaving] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)

  const activeTemplDef = TEMPLATE_DEFS.find(t => t.id === activeTemplateId)
  const isNewsletter = activeTemplateId === 'newsletter'

  useEffect(() => {
    fetch('/api/admin/newsletter').then(r => r.json()).then(d => {
      if (d.count !== undefined) setSubscriberCount(d.count)
    })
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = GOOGLE_FONTS_URL
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  async function switchTemplate(tmplId) {
    if (tmplId === activeTemplateId) return
    setActiveTemplateId(tmplId)
    setSelection(null)
    setResult(null)
    setConfirmed(false)
    setTemplateLoading(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${tmplId}`)
      const json = await res.json()
      if (json.template) {
        const t = json.template
        setRows(t.rows_json?.length > 0 ? restoreRowsFromDb(t.rows_json) : [])
        setHeader(t.header_json && Object.keys(t.header_json).length > 0
          ? t.header_json
          : { bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 })
        setFooter(t.footer || '')
        setSubject(t.subject || TEMPLATE_DEFS.find(d => d.id === tmplId)?.defaultSubject || '')
      } else {
        const def = TEMPLATE_DEFS.find(d => d.id === tmplId)
        setHeader({ bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 })
        if (tmplId === 'newsletter') {
          setRows([newRow('heading'), newRow('text')])
          setSubject('')
          setFooter('PhotoFleur｜このメールはメルマガを希望されたカメラマン様にお送りしています。')
        } else {
          setRows([])
          setSubject(def?.defaultSubject || '')
          setFooter('PhotoFleur｜撮影会予約サービス')
        }
      }
    } catch {
      alert('テンプレート読み込みに失敗しました')
    } finally {
      setTemplateLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/email-templates/${activeTemplateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeTemplDef?.name || activeTemplateId,
          subject,
          rows_json: rows,
          header_json: header,
          footer,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setResult({ error: j.error || '保存に失敗しました' })
      } else {
        setResult({ saved: true })
      }
    } catch {
      setResult({ error: 'ネットワークエラー' })
    } finally {
      setSaving(false)
    }
  }

  const selectedBlock = (() => {
    if (selection?.kind !== 'block') return null
    for (const row of rows)
      for (const cell of row.cells)
        if (cell.block?.id === selection.blockId) return cell.block
    return null
  })()

  const selectedRow = selection?.kind === 'row' ? rows.find(r => r.id === selection.rowId) ?? null : null

  function addRow(type) {
    const r = newRow(type)
    setRows(prev => [...prev, r])
    setSelection({ kind: 'block', blockId: r.cells[0].block.id })
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

  function deleteRow(rowId) {
    setRows(prev => prev.filter(r => r.id !== rowId))
    setSelection(null)
  }

  function addCol(rowId) {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId || r.cells.length >= 3) return r
      const newCells = [...r.cells, newCell(null)]
      const n = newCells.length
      return { ...r, cells: newCells, colWidths: newCells.map(() => 100 / n) }
    }))
  }

  function removeCol(rowId) {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId || r.cells.length <= 1) return r
      const newCells = r.cells.slice(0, -1)
      const n = newCells.length
      return { ...r, cells: newCells, colWidths: newCells.map(() => 100 / n) }
    }))
  }

  function updateRowWidths(rowId, newWidths) {
    setRows(prev => prev.map(r => r.id !== rowId ? r : { ...r, colWidths: newWidths }))
  }

  function updateRowBg(rowId, bg) {
    setRows(prev => prev.map(r => r.id !== rowId ? r : { ...r, bg }))
  }

  function addBlockToCell(rowId, cellId, type) {
    const block = newBlock(type)
    setRows(prev => prev.map(r => r.id !== rowId ? r : {
      ...r,
      cells: r.cells.map(c => c.id !== cellId ? c : { ...c, block })
    }))
    setSelection({ kind: 'block', blockId: block.id })
  }

  function updateBlock(blockId, data) {
    setRows(prev => prev.map(r => ({
      ...r,
      cells: r.cells.map(c => c.block?.id === blockId ? { ...c, block: { ...c.block, data } } : c)
    })))
  }

  function deleteSelectedBlock() {
    if (selection?.kind !== 'block') return
    const blockId = selection.blockId
    setRows(prev => prev.map(r => ({
      ...r,
      cells: r.cells.map(c => c.block?.id === blockId ? { ...c, block: null } : c)
    })))
    setSelection(null)
  }

  async function handleSend() {
    setSending(true); setResult(null)
    const html = generateHtml(rows, header, footer)
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, html }),
    })
    const json = await res.json()
    setSending(false); setConfirmed(false)
    if (!res.ok) setResult({ error: json.error })
    else setResult({ ok: true, sent: json.sent, failed: json.failed })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fb' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e8f0', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
        <span style={{ fontWeight: 700, color: '#1a3560', fontSize: 15 }}>
          {activeTemplDef?.icon} {activeTemplDef?.name}
        </span>
        {isNewsletter && <span style={{ fontSize: 12, color: '#888' }}>同意済み：<strong>{subscriberCount ?? '...'}</strong>名</span>}
        <div style={{ flex: 1 }} />
        <input value={subject} onChange={e => setSubject(e.target.value)}
          placeholder={isNewsletter ? '件名を入力' : '件名'}
          style={{ width: 280, padding: '7px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 13 }} />
        {isNewsletter ? (
          !confirmed ? (
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
              <button onClick={() => setConfirmed(false)} style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>戻る</button>
            </div>
          )
        ) : (
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '保存中...' : '💾 保存'}
          </button>
        )}
      </div>

      {result && (
        <div style={{ padding: '8px 20px', background: result.error ? '#ffebee' : '#e8f5e9', fontSize: 13, borderBottom: '1px solid #ddd' }}>
          {result.error
            ? <span style={{ color: '#e53935' }}>エラー: {result.error}</span>
            : result.saved
            ? <span style={{ color: '#388e3c', fontWeight: 600 }}>✅ テンプレートを保存しました</span>
            : <span style={{ color: '#388e3c', fontWeight: 600 }}>✅ 送信完了：{result.sent}件成功{result.failed > 0 ? ` / ${result.failed}件失敗` : ''}</span>}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: template selector + block palette */}
        <div style={{ width: 130, background: '#fff', borderRight: '1px solid #e0e8f0', padding: '12px 8px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 8, letterSpacing: '0.05em' }}>テンプレート</div>
          {TEMPLATE_DEFS.map(tmpl => (
            <button key={tmpl.id} onClick={() => switchTemplate(tmpl.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 4px', marginBottom: 4, border: `1px solid ${activeTemplateId === tmpl.id ? '#1a3560' : '#e0e8f0'}`, borderRadius: 8, background: activeTemplateId === tmpl.id ? '#e8f0ff' : '#f8fbff', cursor: 'pointer', fontSize: 9, color: activeTemplateId === tmpl.id ? '#1a3560' : '#666', fontWeight: activeTemplateId === tmpl.id ? 700 : 500, gap: 3, textAlign: 'center', lineHeight: 1.3 }}>
              <span style={{ fontSize: 16 }}>{tmpl.icon}</span>
              {tmpl.name}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 8, letterSpacing: '0.05em' }}>ブロック追加</div>
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} onClick={() => addRow(bt.type)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 6px', marginBottom: 5, border: '1px solid #e0e8f0', borderRadius: 10, background: '#f8fbff', cursor: 'pointer', fontSize: 10, color: '#1a3560', fontWeight: 600, gap: 3 }}>
                <span style={{ fontSize: 16 }}>{bt.icon}</span>
                {bt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: '#f0f4fb' }} onClick={() => setSelection(null)}>
          {templateLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 15 }}>読み込み中...</div>
          ) : (
            <div style={{ maxWidth: 620, margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div onClick={e => { e.stopPropagation(); setSelection('header') }}
                style={{ background: header.bgColor, padding: '20px 32px', textAlign: 'center', cursor: 'pointer', outline: selection === 'header' ? '2px solid #5bbfd6' : 'none' }}>
                <span style={{ color: header.textColor, fontSize: header.fontSize, fontWeight: 700, letterSpacing: '0.05em' }}>{header.text}</span>
                {selection === 'header' && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>クリックして編集</div>}
              </div>

              {/* Rows */}
              <div style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                {rows.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>左のパネルからブロックを追加してください</div>
                )}
                {rows.map((row, rowIdx) => (
                  <RowView
                    key={row.id}
                    row={row}
                    isFirst={rowIdx === 0}
                    isLast={rowIdx === rows.length - 1}
                    selection={selection}
                    onSelectBlock={blockId => setSelection({ kind: 'block', blockId })}
                    onSelectRow={() => setSelection({ kind: 'row', rowId: row.id })}
                    onUpdateBlock={updateBlock}
                    onAddBlockToCell={addBlockToCell}
                    onMoveRow={moveRow}
                    onDeleteRow={deleteRow}
                    onAddCol={addCol}
                    onRemoveCol={removeCol}
                    onUpdateWidths={updateRowWidths}
                  />
                ))}
              </div>

              {/* Footer */}
              <div onClick={e => { e.stopPropagation(); setSelection('footer') }}
                style={{ background: '#f5f5f5', padding: '14px 32px', fontSize: 11, color: '#999', textAlign: 'center', cursor: 'pointer', outline: selection === 'footer' ? '2px solid #5bbfd6' : 'none' }}>
                {footer}
                {selection === 'footer' && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>クリックして編集</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right: editor panel */}
        <div style={{ width: 270, background: '#fff', borderLeft: '1px solid #e0e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <RightPanel
            selection={selection}
            block={selectedBlock}
            row={selectedRow}
            onBlockChange={data => selectedBlock && updateBlock(selectedBlock.id, data)}
            onDeleteBlock={deleteSelectedBlock}
            onRowBgChange={bg => selectedRow && updateRowBg(selectedRow.id, bg)}
            header={header}
            onHeaderChange={setHeader}
            footer={footer}
            onFooterChange={setFooter}
            templateVars={activeTemplDef?.vars || []}
          />
        </div>
      </div>
    </div>
  )
}

function RowView({ row, isFirst, isLast, selection, onSelectBlock, onSelectRow, onUpdateBlock, onAddBlockToCell, onMoveRow, onDeleteRow, onAddCol, onRemoveCol, onUpdateWidths }) {
  const containerRef = useRef(null)
  const isRowSelected = selection?.kind === 'row' && selection.rowId === row.id

  const bgStyle = (() => {
    const bg = row.bg
    if (!bg) return {}
    if (bg.imageUrl) return { backgroundImage: `url('${bg.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    if (bg.color) return { background: bg.color }
    return {}
  })()

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Row toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        {row.cells.length > 1 && (
          <button onClick={() => onRemoveCol(row.id)}
            style={{ padding: '1px 8px', fontSize: 10, border: '1px solid #e0d0d0', borderRadius: 4, background: '#fff5f5', color: '#c62828', cursor: 'pointer' }}>
            − 列削除
          </button>
        )}
        {row.cells.length < 3 && (
          <button onClick={() => onAddCol(row.id)}
            style={{ padding: '1px 8px', fontSize: 10, border: '1px solid #d0e0d0', borderRadius: 4, background: '#f5fff5', color: '#2e7d32', cursor: 'pointer', fontWeight: 600 }}>
            ＋ 列追加
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onSelectRow() }}
          title="背景を設定"
          style={{ padding: '1px 8px', fontSize: 10, border: `1px solid ${isRowSelected ? '#1a3560' : '#ddd'}`, borderRadius: 4, background: isRowSelected ? '#e8f0ff' : '#f8f8f8', color: isRowSelected ? '#1a3560' : '#888', cursor: 'pointer' }}>
          🎨 背景
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => onMoveRow(row.id, -1)} disabled={isFirst} style={{ ...ctrlBtn, opacity: isFirst ? 0.3 : 1 }}>▲</button>
        <button onClick={() => onMoveRow(row.id, 1)} disabled={isLast} style={{ ...ctrlBtn, opacity: isLast ? 0.3 : 1 }}>▼</button>
        <button onClick={() => onDeleteRow(row.id)} style={{ ...ctrlBtn, background: '#e53935' }}>✕</button>
      </div>

      {/* Cells */}
      <div ref={containerRef}
        style={{ display: 'flex', alignItems: 'stretch', border: `2px solid ${isRowSelected ? '#5bbfd6' : '#e8eef5'}`, borderRadius: 8, overflow: 'hidden', minHeight: 70, ...bgStyle }}>
        {row.cells.map((cell, ci) => {
          const isBlockSelected = cell.block?.id === selection?.blockId
          return (
            <div key={cell.id} style={{ display: 'flex', alignItems: 'stretch', width: `${row.colWidths[ci]}%`, minWidth: 0, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {cell.block ? (
                  <>
                    <div
                      onClick={e => { e.stopPropagation(); onSelectBlock(cell.block.id) }}
                      style={{ outline: isBlockSelected ? '2px solid #1a3560' : 'none', outlineOffset: -2, borderRadius: 4, background: isBlockSelected ? 'rgba(240,245,255,0.9)' : 'transparent', cursor: 'pointer', flex: 1 }}>
                      {isBlockSelected && cell.block.type === 'image'
                        ? <div style={{ padding: 8 }}><ResizableImage data={cell.block.data} onResize={updates => onUpdateBlock(cell.block.id, { ...cell.block.data, ...updates })} /></div>
                        : <div dangerouslySetInnerHTML={{ __html: blockToHtml(cell.block) }} style={{ pointerEvents: 'none' }} />
                      }
                    </div>
                    {isBlockSelected && (
                      <BlockResizeHandle block={cell.block} onUpdateBlock={onUpdateBlock} />
                    )}
                  </>
                ) : (
                  <EmptyCell onAdd={(type) => onAddBlockToCell(row.id, cell.id, type)} />
                )}
              </div>
              {ci < row.cells.length - 1 && (
                <ColDivider divIdx={ci} rowWidths={row.colWidths} containerRef={containerRef} onUpdateWidths={w => onUpdateWidths(row.id, w)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
