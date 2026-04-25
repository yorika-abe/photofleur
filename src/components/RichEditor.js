'use client'
import { useRef, useEffect, useCallback, useState } from 'react'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px']
const COLORS = ['#000000', '#333333', '#555555', '#888888', '#ffffff', '#e53935', '#f4511e', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#d81b60', '#00acc1', '#1a3560', '#5bbfd6', '#f4a0be']

function ToolBtn({ onClick, active, title, children, style }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      style={{
        padding: '4px 8px',
        border: active ? '2px solid #0097a7' : '1px solid #ddd',
        borderRadius: 5,
        background: active ? '#e0f7fa' : '#fff',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: active ? '#00838f' : '#333',
        minWidth: 30,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function ColorPicker({ onSelect, title, current, icon }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }}
        title={title}
        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 3 }}
      >
        <span style={{ fontWeight: 700 }}>{icon}</span>
        <span style={{ display: 'inline-block', width: 14, height: 4, background: current || '#000', borderRadius: 2 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false) }}
              style={{ width: 22, height: 22, background: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none', borderRadius: 3, cursor: 'pointer', padding: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RichEditor({ value, onChange, uploadPath = 'blog', uploadEndpoint = '/api/model-portal/upload' }) {
  const editorRef = useRef(null)
  const imgInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [hlColor, setHlColor] = useState('#fdd835')
  const [fontSize, setFontSize] = useState('16px')
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strikeThrough: false, justifyLeft: false, justifyCenter: false, justifyRight: false, insertUnorderedList: false, insertOrderedList: false })

  const updateFmt = useCallback(() => {
    try {
      setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      })
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
  }, [])

  function sync() {
    onChange?.(editorRef.current?.innerHTML || '')
  }

  function applyFontSize(size) {
    setFontSize(size)
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('fontSize', false, '7')
      // execCommand fontSize uses 1-7, so wrap selected spans
      const spans = editorRef.current?.querySelectorAll('font[size="7"]')
      spans?.forEach(span => {
        span.removeAttribute('size')
        span.style.fontSize = size
      })
    } else {
      // Apply to future typing via a span
      document.execCommand('insertHTML', false, `<span style="font-size:${size}">&#8203;</span>`)
    }
    sync()
  }

  function insertLink() {
    const url = prompt('リンクURLを入力してください')
    if (url) exec('createLink', url)
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

  const btnRow = {
    display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
    padding: '8px 10px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0',
    borderRadius: '10px 10px 0 0',
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'visible' }}>
      {/* ツールバー */}
      <div style={btnRow}>
        {/* フォントサイズ */}
        <select
          value={fontSize}
          onChange={e => applyFontSize(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13, cursor: 'pointer' }}
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

        {/* テキスト装飾 */}
        <ToolBtn onClick={() => exec('bold')} active={fmt.bold} title="太文字 (Ctrl+B)"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} active={fmt.italic} title="イタリック (Ctrl+I)"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} active={fmt.underline} title="下線 (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => exec('strikeThrough')} active={fmt.strikeThrough} title="取り消し線" style={{ textDecoration: 'line-through' }}>S</ToolBtn>

        <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

        {/* 文字色・ハイライト */}
        <ColorPicker
          title="文字色"
          icon="A"
          current={textColor}
          onSelect={c => { setTextColor(c); exec('foreColor', c) }}
        />
        <ColorPicker
          title="ハイライト色"
          icon="✎"
          current={hlColor}
          onSelect={c => { setHlColor(c); exec('hiliteColor', c) }}
        />

        <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

        {/* リンク */}
        <ToolBtn onClick={insertLink} title="リンク挿入">🔗</ToolBtn>
        <ToolBtn onClick={() => exec('unlink')} title="リンク解除">🚫</ToolBtn>

        <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

        {/* 配置 */}
        <ToolBtn onClick={() => exec('justifyLeft')} active={fmt.justifyLeft} title="左揃え">≡L</ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} active={fmt.justifyCenter} title="中央揃え">≡C</ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} active={fmt.justifyRight} title="右揃え">≡R</ToolBtn>

        <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

        {/* リスト */}
        <ToolBtn onClick={() => exec('insertUnorderedList')} active={fmt.insertUnorderedList} title="箇条書き">・</ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} active={fmt.insertOrderedList} title="番号リスト">1.</ToolBtn>

        <div style={{ width: 1, height: 22, background: '#ddd', margin: '0 2px' }} />

        {/* メディア挿入 */}
        <ToolBtn
          onClick={() => imgInputRef.current?.click()}
          title="画像を挿入"
          style={{ background: uploading ? '#f0f0f0' : undefined }}
        >
          {uploading ? '⏳' : '🖼'}
        </ToolBtn>
        <ToolBtn
          onClick={() => videoInputRef.current?.click()}
          title="動画を挿入"
        >
          🎬
        </ToolBtn>

        <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'image')} />
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'video')} />
      </div>

      {/* エディター本体 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        style={{
          minHeight: 320,
          padding: '16px',
          outline: 'none',
          fontSize: 15,
          lineHeight: 1.9,
          color: '#333',
          overflowY: 'auto',
          borderRadius: '0 0 10px 10px',
          background: '#fff',
        }}
        data-placeholder="ここに記事の内容を書いてください..."
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
        }
        [contenteditable] img { max-width: 100%; }
        [contenteditable] video { max-width: 100%; }
        [contenteditable] a { color: #1a3560; }
      `}</style>
    </div>
  )
}
