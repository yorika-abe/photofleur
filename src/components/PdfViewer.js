'use client'
import { useState, useEffect } from 'react'

export default function PdfViewer({ url, title }) {
  const [mode, setMode] = useState('direct')

  useEffect(() => {
    // iOS Safari はiframe内PDFを正常表示できないためGDVをデフォルトに
    if (window.innerWidth < 768) setMode('gdocs')
  }, [])

  const src = mode === 'direct' ? url : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #d6ecf5' }}>
      <iframe key={mode} src={src} style={{ width: '100%', height: 560, border: 'none', display: 'block' }} title={title} />
      <div style={{ padding: '8px 12px', background: '#f5f9ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setMode(m => m === 'direct' ? 'gdocs' : 'direct')}
          style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
        >
          {mode === 'direct' ? '表示されない場合はこちら' : '← 別の表示方法を試す'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1a3560', textDecoration: 'none', fontWeight: 600 }}>↗ 別タブで開く</a>
      </div>
    </div>
  )
}
