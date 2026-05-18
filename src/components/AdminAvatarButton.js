'use client'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'

function getSuffix(fullName) {
  if (!fullName) return ''
  if (fullName.startsWith('運営 ')) return fullName.slice(3)
  if (fullName === '運営') return ''
  return fullName
}

export default function AdminAvatarButton({ initialUrl, initialName, isOwner }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || null)
  const [suffix, setSuffix] = useState(getSuffix(initialName || ''))
  const [savedName, setSavedName] = useState(initialName || '運営')
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function cropAndCompress(file) {
    return new Promise((resolve) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 600
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 600, 600)
        URL.revokeObjectURL(url)
        canvas.toBlob(resolve, 'image/jpeg', 0.82)
      }
      img.src = url
    })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const blob = await cropAndCompress(file)
      const fd = new FormData()
      fd.append('file', blob, 'avatar.jpg')
      const res = await fetch('/api/admin/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setAvatarUrl(data.url)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSaveName() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suffix }),
      })
      const data = await res.json()
      if (data.name) setSavedName(data.name)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={panelRef} style={{ position: 'relative', zIndex: 100, display: 'inline-block' }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          border: '2.5px solid rgba(26,53,96,0.25)',
          overflow: 'hidden', cursor: 'pointer',
          background: '#e8eef8', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 12px rgba(0,0,0,0.16)',
        }}
      >
        {avatarUrl
          ? <Image src={avatarUrl} alt="" width={64} height={64} style={{ objectFit: 'cover' }} />
          : <span style={{ fontSize: 28 }}>👤</span>
        }
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {savedName}
      </div>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: 20, minWidth: 220, border: '1px solid #e8eef8',
        }}>
          {/* Avatar display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              overflow: 'hidden', background: '#e8eef8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 8, border: '2px solid #d0dae8',
            }}>
              {avatarUrl
                ? <Image src={avatarUrl} alt="" width={72} height={72} style={{ objectFit: 'cover' }} />
                : <span style={{ fontSize: 32 }}>👤</span>
              }
            </div>
            {isOwner && (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                style={{
                  fontSize: 12, color: '#1a3560', background: '#f0f4fb',
                  border: '1px solid #c8d8f0', borderRadius: 6,
                  padding: '4px 12px', cursor: uploading ? 'wait' : 'pointer', fontWeight: 600,
                }}
              >
                {uploading ? '処理中...' : 'アイコン変更'}
              </button>
            )}
          </div>

          {/* Name edit */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>表示名</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #dde4f0', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{
                padding: '8px 10px', background: '#f0f4fb',
                fontSize: 13, color: '#666', fontWeight: 700, whiteSpace: 'nowrap',
                borderRight: '1px solid #dde4f0',
              }}>運営</span>
              <input
                value={suffix}
                onChange={e => setSuffix(e.target.value)}
                placeholder="阿部"
                style={{
                  flex: 1, padding: '8px 10px', border: 'none',
                  fontSize: 13, outline: 'none', minWidth: 0,
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
              表示: 運営{suffix ? ` ${suffix}` : ''}
            </div>
          </div>

          <button
            onClick={handleSaveName}
            disabled={saving}
            style={{
              width: '100%', padding: '8px', background: '#1a3560', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
