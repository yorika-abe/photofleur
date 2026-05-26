'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

function compressImage(file, maxW = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ChatPage() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null) // { file, dataUrl }
  const [error, setError] = useState(null)
  const [adminProfiles, setAdminProfiles] = useState({}) // sender_id → { name, avatar_url }
  const bottomRef = useRef(null)
  const scrollAreaRef = useRef(null)
  const fileRef = useRef(null)
  const fetchedIdsRef = useRef(new Set())

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    loadMessages()

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const channel = supabase
      .channel(`chat:${user.email}`)
      .on('broadcast', { event: 'new_message' }, () => loadMessages())
      .subscribe()

    return () => supabase.removeChannel(channel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    const el = scrollAreaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function loadMessages() {
    const res = await fetch('/api/chat/messages')
    if (!res.ok) return
    const { messages } = await res.json()
    setMessages(messages || [])
    localStorage.setItem('chat_last_read', new Date().toISOString())

    // Fetch profiles for admin senders we haven't loaded yet
    const newIds = (messages || [])
      .filter(m => m.sender_type === 'admin' && m.sender_id && !fetchedIdsRef.current.has(m.sender_id))
      .map(m => m.sender_id)
      .filter((id, i, arr) => arr.indexOf(id) === i)
    if (newIds.length) {
      newIds.forEach(id => fetchedIdsRef.current.add(id))
      try {
        const pr = await fetch(`/api/chat/admin-profiles?ids=${newIds.join(',')}`)
        if (pr.ok) {
          const { profiles } = await pr.json()
          setAdminProfiles(prev => ({ ...prev, ...profiles }))
        }
      } catch {}
    }
  }

  async function handleSend() {
    if (sending || uploading) return
    if (!text.trim() && !imagePreview) return
    setSending(true)
    setError(null)
    try {
      let image_url = null
      if (imagePreview) {
        setUploading(true)
        const compressed = await compressImage(imagePreview.file)
        const form = new FormData()
        form.append('file', compressed, 'image.jpg')
        const up = await fetch('/api/chat/upload', { method: 'POST', body: form })
        if (!up.ok) throw new Error('画像のアップロードに失敗しました')
        const { url } = await up.json()
        image_url = url
        setUploading(false)
      }
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() || null, image_url }),
      })
      if (!res.ok) throw new Error('送信に失敗しました')
      const { message: msg } = await res.json()
      setMessages(prev => [...prev, msg])
      setText('')
      setImagePreview(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview({ file, dataUrl: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Group messages by date
  const grouped = []
  let lastDate = null
  for (const msg of messages) {
    const d = formatDate(msg.created_at)
    if (d !== lastDate) { grouped.push({ type: 'date', label: d }); lastDate = d }
    grouped.push({ type: 'msg', msg })
  }

  const isLoggedIn = user !== undefined && user !== null
  const isLoading = user === undefined

  // Use the most recent admin sender's profile for the header
  const lastAdminMsg = [...messages].reverse().find(m => m.sender_type === 'admin' && m.sender_id)
  const headerProfile = lastAdminMsg ? adminProfiles[lastAdminMsg.sender_id] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', background: '#f0f2f5', position: 'relative' }}>
      {/* Header */}
      <div style={{ background: '#1a3560', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</Link>
        {headerProfile?.avatar_url ? (
          <img src={headerProfile.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌸</div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{headerProfile?.name || 'PhotoFleur 運営'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>お問い合わせ・チャット</div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollAreaRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 40, fontSize: 14 }}>読み込み中...</div>
        )}

        {isLoggedIn && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 40, fontSize: 13, lineHeight: 1.8 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <div>メッセージはまだありません</div>
            <div>お気軽にご質問・ご連絡ください</div>
          </div>
        )}

        {isLoggedIn && grouped.map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${i}`} style={{ textAlign: 'center', margin: '12px 0', fontSize: 11, color: '#999' }}>
                <span style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '2px 10px' }}>{item.label}</span>
              </div>
            )
          }
          const { msg } = item
          const isUser = msg.sender_type === 'user'
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
              {!isUser && (() => {
                const p = msg.sender_id ? adminProfiles[msg.sender_id] : null
                return p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a3560', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🌸</div>
                )
              })()}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 4 }}>
                <div>
                  {!isUser && (
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 3, marginLeft: 4 }}>{msg.sender_name || '運営'}</div>
                  )}
                  <div style={{
                    background: isUser ? '#1a3560' : '#fff',
                    color: isUser ? '#fff' : '#333',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: msg.image_url && !msg.message ? '4px' : '10px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="送信画像"
                        style={{ maxWidth: 220, maxHeight: 220, borderRadius: 12, display: 'block', cursor: 'pointer' }}
                        onClick={() => window.open(msg.image_url, '_blank')}
                      />
                    )}
                    {msg.message && <div style={{ marginTop: msg.image_url ? 6 : 0 }}>{msg.message}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#aaa', flexShrink: 0, paddingBottom: 2 }}>{formatTime(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div style={{ height: 8 }} />
      </div>

      {/* Input area */}
      {isLoggedIn && (
        <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '8px 12px', flexShrink: 0 }}>
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <img src={imagePreview.dataUrl} alt="preview" style={{ height: 80, borderRadius: 8, border: '1px solid #ddd' }} />
              <button onClick={() => setImagePreview(null)} style={{ position: 'absolute', top: -6, right: -6, background: '#e53935', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: '#e53935', marginBottom: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, flexShrink: 0, color: '#888' }}
              title="画像を送る"
            >📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: 20, padding: '8px 14px', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'sans-serif', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={sending || uploading || (!text.trim() && !imagePreview)}
              style={{ background: sending || (!text.trim() && !imagePreview) ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 16, flexShrink: 0 }}
            >{uploading ? '⏳' : '➤'}</button>
          </div>
        </div>
      )}

      {/* Overlay for non-logged-in users */}
      {!isLoading && !isLoggedIn && (
        <>
          {/* Demo messages behind overlay */}
          <div style={{ position: 'absolute', inset: 52, overflowY: 'hidden', padding: 16, pointerEvents: 'none', filter: 'blur(2px)' }}>
            {[
              { isUser: false, text: 'こんにちは！PhotoFleur運営です。ご質問やご連絡はこちらからどうぞ😊', time: '10:00' },
              { isUser: true, text: '撮影会について聞きたいことがあります', time: '10:01' },
              { isUser: false, text: 'もちろんです！お気軽にどうぞ🌸', time: '10:02' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: m.isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
                {!m.isUser && <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a3560', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌸</div>}
                <div style={{ background: m.isUser ? '#1a3560' : '#fff', color: m.isUser ? '#fff' : '#333', borderRadius: m.isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', maxWidth: '70%', fontSize: 14 }}>{m.text}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>{m.time}</div>
              </div>
            ))}
          </div>

          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, top: 60, background: 'rgba(240,242,245,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', zIndex: 10 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560', marginBottom: 10 }}>チャットを始めるには</div>
              <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 8 }}>
                会員登録またはログインが必要です
              </div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7, marginBottom: 24, padding: '10px 14px', background: '#f8f9fa', borderRadius: 10 }}>
                運営からの返信はご登録いただいている<br />LINEならびにメールに通知します。
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/login?redirect=/chat" style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 15, display: 'block' }}>
                  ログイン
                </Link>
                <Link href="/register" style={{ background: '#fff', color: '#1a3560', textDecoration: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 15, display: 'block', border: '2px solid #1a3560' }}>
                  新規登録
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
