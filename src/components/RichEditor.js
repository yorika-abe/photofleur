'use client'
import { useRef, useEffect, useCallback, useState } from 'react'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px']
const COLORS = ['#000000', '#333333', '#555555', '#888888', '#ffffff', '#e53935', '#f4511e', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#d81b60', '#00acc1', '#1a3560', '#5bbfd6', '#f4a0be']
const BLOCK_FORMATS = [
  { value: 'p',  label: '本文' },
  { value: 'h1', label: '見出し1' },
  { value: 'h2', label: '見出し2' },
  { value: 'h3', label: '見出し3' },
]

function ToolBtn({ onClick, active, title, children, style }) {
  return (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick() }} title={title}
      style={{ padding: '4px 8px', border: active ? '2px solid #0097a7' : '1px solid #ddd', borderRadius: 5, background: active ? '#e0f7fa' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: active ? '#00838f' : '#333', minWidth: 30, lineHeight: 1.4, ...style }}>
      {children}
    </button>
  )
}

function ColorPicker({ onSelect, title, current, icon }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }} title={title}
        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontWeight: 700 }}>{icon}</span>
        <span style={{ display: 'inline-block', width: 14, height: 4, background: current || '#000', borderRadius: 2 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {COLORS.map(c => (
            <button key={c} type="button" onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false) }}
              style={{ width: 22, height: 22, background: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none', borderRadius: 3, cursor: 'pointer', padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  )
}

const sep = <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

export default function RichEditor({ value, onChange, uploadPath = 'blog', uploadEndpoint = '/api/model-portal/upload' }) {
  const editorRef = useRef(null)
  const imgInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [hlColor, setHlColor] = useState('#fdd835')
  const [fontSize, setFontSize] = useState('16px')
  const [blockFormat, setBlockFormat] = useState('p')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strikeThrough: false, justifyLeft: false, justifyCenter: false, justifyRight: false, insertUnorderedList: false, insertOrderedList: false })

  const updateFmt = useCallback(() => {
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        // ブロック形式検出
        let node = sel.getRangeAt(0).startContainer
        while (node && node !== editorRef.current) {
          const tag = node.nodeName?.toLowerCase()
          if (['h1', 'h2', 'h3'].includes(tag)) { setBlockFormat(tag); break }
          if (['p', 'div'].includes(tag)) { setBlockFormat('p'); break }
          node = node.parentNode
        }
        // 配置検出（style.textAlign から直接読む）
        let alignNode = sel.getRangeAt(0).startContainer
        let align = ''
        while (alignNode && alignNode !== editorRef.current) {
          if (alignNode.nodeType === 1 && alignNode.style?.textAlign) {
            align = alignNode.style.textAlign; break
          }
          alignNode = alignNode.parentNode
        }
        setFmt(f => ({
          ...f,
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          insertUnorderedList: document.queryCommandState('insertUnorderedList'),
          insertOrderedList: document.queryCommandState('insertOrderedList'),
          justifyLeft: align === 'left',
          justifyCenter: align === 'center',
          justifyRight: align === 'right',
        }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (editorRef.current && !editorRef.current.dataset.initialized) {
      editorRef.current.innerHTML = value || ''
      editorRef.current.dataset.initialized = '1'
    }
    document.addEventListener('selectionchange', updateFmt)
    return () => document.removeEventListener('selectionchange', updateFmt)
  }, [updateFmt])

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    sync()
    updateFmt()
  }, [updateFmt])

  function sync() { onChange?.(editorRef.current?.innerHTML || '') }

  function applyBlockFormat(format) {
    setBlockFormat(format)
    editorRef.current?.focus()
    document.execCommand('formatBlock', false, format)
    sync()
  }

  function applyFontSize(size) {
    setFontSize(size)
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('fontSize', false, '7')
      editorRef.current?.querySelectorAll('font[size="7"]').forEach(span => {
        span.removeAttribute('size')
        span.style.fontSize = size
      })
    } else {
      document.execCommand('insertHTML', false, `<span style="font-size:${size}">&#8203;</span>`)
    }
    sync()
  }

  function applyAlign(dir) {
    editorRef.current?.focus()
    document.execCommand('justify' + dir, false, null)
    setFmt(f => ({ ...f, justifyLeft: dir === 'Left', justifyCenter: dir === 'Center', justifyRight: dir === 'Right' }))
    sync()
  }

  function openLinkInput() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    setLinkUrl('')
    setShowLinkInput(true)
  }

  function applyLink() {
    if (!linkUrl.trim()) { setShowLinkInput(false); return }
    editorRef.current?.focus()
    if (savedRangeRef.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
    document.execCommand('createLink', false, linkUrl)
    editorRef.current?.querySelectorAll('a').forEach(a => {
      a.style.color = '#1a3560'
      a.style.fontWeight = '700'
      a.style.textDecoration = 'underline'
    })
    sync()
    setShowLinkInput(false)
    setLinkUrl('')
  }

  function autoLinkLastWord() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== 3) return
    const text = node.textContent.substring(0, range.startOffset)
    const match = text.match(/(https?:\/\/[^\s]+)$/)
    if (!match) return
    const url = match[1]
    const urlStart = range.startOffset - url.length
    const newRange = document.createRange()
    newRange.setStart(node, urlStart)
    newRange.setEnd(node, range.startOffset)
    sel.removeAllRanges()
    sel.addRange(newRange)
    document.execCommand('createLink', false, url)
    const anchor = editorRef.current?.querySelector(`a[href="${url}"]`)
    if (anchor) { anchor.style.color = '#1a3560'; anchor.style.textDecoration = 'underline' }
    sel.collapseToEnd()
    sync()
  }

  function insertHR() {
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, '<hr style="border:none;border-top:2px solid #e0e0e0;margin:20px 0;" />')
    sync()
  }

  async function uploadMedia(file, type) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${uploadPath}/${Date.now()}.${ext}`
    const fd = new FormData()
    fd.append('file', file)
    fd.append('path', path)
    const res = await fetch(uploadEndpoint, { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.error) { alert('アップロードエラー: ' + data.error); return }
    editorRef.current?.focus()
    if (type === 'image') {
      document.execCommand('insertHTML', false, `<img src="${data.url}" style="max-width:100%;border-radius:6px;margin:8px 0;" />`)
    } else {
      document.execCommand('insertHTML', false, `<video src="${data.url}" controls style="max-width:100%;border-radius:6px;margin:8px 0;"></video>`)
    }
    sync()
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
      {/* ツールバー */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', padding: '8px 10px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0', borderRadius: '10px 10px 0 0', position: 'sticky', top: 0, zIndex: 50 }}>

        {/* 見出し/本文 */}
        <select value={blockFormat} onChange={e => applyBlockFormat(e.target.value)} onMouseDown={e => e.stopPropagation()}
          style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13, cursor: 'pointer' }}>
          {BLOCK_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* フォントサイズ */}
        <select value={fontSize} onChange={e => applyFontSize(e.target.value)} onMouseDown={e => e.stopPropagation()}
          style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13, cursor: 'pointer' }}>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {sep}

        <ToolBtn onClick={() => exec('bold')} active={fmt.bold} title="太文字"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} active={fmt.italic} title="イタリック"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} active={fmt.underline} title="下線"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => exec('strikeThrough')} active={fmt.strikeThrough} title="取り消し線" style={{ textDecoration: 'line-through' }}>S</ToolBtn>

        {sep}

        <ColorPicker title="文字色" icon="A" current={textColor} onSelect={c => { setTextColor(c); exec('foreColor', c) }} />
        <ColorPicker title="ハイライト色" icon="✎" current={hlColor} onSelect={c => { setHlColor(c); exec('hiliteColor', c) }} />

        {sep}

        <ToolBtn onClick={openLinkInput} active={showLinkInput} title="選択テキストにリンクを付ける（太字+下線で表示）">🔗 リンク</ToolBtn>
        <ToolBtn onClick={() => exec('unlink')} title="リンク解除">解除</ToolBtn>

        {sep}

        <ToolBtn onClick={() => applyAlign('Left')} active={fmt.justifyLeft} title="左揃え">≡L</ToolBtn>
        <ToolBtn onClick={() => applyAlign('Center')} active={fmt.justifyCenter} title="中央揃え">≡C</ToolBtn>
        <ToolBtn onClick={() => applyAlign('Right')} active={fmt.justifyRight} title="右揃え">≡R</ToolBtn>

        {sep}

        <ToolBtn onClick={() => exec('insertUnorderedList')} active={fmt.insertUnorderedList} title="箇条書き">・リスト</ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} active={fmt.insertOrderedList} title="番号リスト">1. リスト</ToolBtn>

        {sep}

        <ToolBtn onClick={() => imgInputRef.current?.click()} title="画像を挿入" style={{ background: uploading ? '#f0f0f0' : undefined }}>
          {uploading ? '⏳' : '🖼'}
        </ToolBtn>
        <ToolBtn onClick={() => videoInputRef.current?.click()} title="動画を挿入">🎬</ToolBtn>
        <ToolBtn onClick={insertHR} title="横線を挿入">line</ToolBtn>

        <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'image')} />
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'video')} />
      </div>

      {/* リンク入力バー */}
      {showLinkInput && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0f7ff', borderBottom: '1px solid #c5d8f0' }}>
          <span style={{ fontSize: 13, color: '#1a3560', fontWeight: 600, whiteSpace: 'nowrap' }}>リンクURL:</span>
          <input autoFocus type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkInput(false) }}
            placeholder="https://..."
            style={{ flex: 1, padding: '5px 10px', border: '1px solid #c5d8f0', borderRadius: 6, fontSize: 13 }} />
          <button type="button" onClick={applyLink}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            適用
          </button>
          <button type="button" onClick={() => setShowLinkInput(false)}
            style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
            キャンセル
          </button>
        </div>
      )}

      {/* エディター本体 */}
      <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={sync}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') autoLinkLastWord() }}
        style={{ minHeight: 320, maxHeight: 480, padding: '16px', outline: 'none', fontSize: 15, lineHeight: 1.9, color: '#333', overflowY: 'auto', overflowX: 'hidden', wordBreak: 'break-word', borderRadius: '0 0 10px 10px', background: '#fff' }}
        data-placeholder="ここに記事の内容を書いてください..." />

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #aaa; pointer-events: none; }
        [contenteditable] img { max-width: 100%; }
        [contenteditable] video { max-width: 100%; }
        [contenteditable] a { color: #1a3560; font-weight: 700; text-decoration: underline; }
        [contenteditable] h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0; line-height: 1.3; }
        [contenteditable] h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; line-height: 1.3; }
        [contenteditable] h3 { font-size: 1.25em; font-weight: 700; margin: 0.4em 0; line-height: 1.3; }
        [contenteditable] ul { list-style-type: disc; padding-left: 1.8em; margin: 0.5em 0; }
        [contenteditable] ol { list-style-type: decimal; padding-left: 1.8em; margin: 0.5em 0; }
        [contenteditable] li { margin: 0.2em 0; }
      `}</style>
    </div>
  )
}
