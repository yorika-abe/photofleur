'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'


function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return '昨日'
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

function formatFullTime(ts) {
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

export default function AdminChatPage() {
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'room'
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [userPanelOpen, setUserPanelOpen] = useState(false)
  const [userPanelData, setUserPanelData] = useState(null) // { profile, bookings }
  const [userPanelLoading, setUserPanelLoading] = useState(false)
  const [bookingsOpen, setBookingsOpen] = useState(false)
  const fileRef = useRef(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    const emailParam = searchParams.get('email')
    if (emailParam) openRoom(emailParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Room list: initial load + Realtime
  useEffect(() => {
    if (view !== 'list') return
    loadRooms()

    const channel = supabase
      .channel('chat:admin:rooms')
      .on('broadcast', { event: 'room_updated' }, () => loadRooms())
      .subscribe()

    return () => supabase.removeChannel(channel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Message view: initial load + Realtime
  useEffect(() => {
    if (view !== 'room' || !selectedEmail) return
    loadMessages()

    const channel = supabase
      .channel(`chat:admin:${selectedEmail}`)
      .on('broadcast', { event: 'new_message' }, () => loadMessages())
      .subscribe()

    return () => supabase.removeChannel(channel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedEmail])

  const scrollAreaRef = useRef(null)

  useEffect(() => {
    if (view === 'room') {
      const el = scrollAreaRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [messages, view])

  async function loadRooms() {
    const res = await fetch('/api/admin/chat?list=1')
    if (!res.ok) return
    const { rooms } = await res.json()
    setRooms(rooms || [])
  }

  async function loadMessages() {
    const res = await fetch(`/api/admin/chat?email=${encodeURIComponent(selectedEmail)}`)
    if (!res.ok) return
    const { messages } = await res.json()
    setMessages(messages || [])
    // Update room unread count locally
    setRooms(prev => prev.map(r => r.user_email === selectedEmail ? { ...r, unread: 0 } : r))
  }

  function openRoom(email) {
    setSelectedEmail(email)
    setMessages([])
    setView('room')
  }

  function backToList() {
    setView('list')
    setSelectedEmail(null)
    setText('')
    setImagePreview(null)
  }

  async function handleSend() {
    if (sending || uploading || !selectedEmail) return
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
        if (!up.ok) throw new Error('画像アップロード失敗')
        const { url } = await up.json()
        image_url = url
        setUploading(false)
      }
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: selectedEmail, message: text.trim() || null, image_url }),
      })
      if (!res.ok) throw new Error('送信失敗')
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview({ file, dataUrl: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function openUserPanel() {
    if (!selectedEmail) return
    setUserPanelOpen(true)
    setBookingsOpen(false)
    if (userPanelData?.profile?.email === selectedEmail) return
    setUserPanelLoading(true)
    setUserPanelData(null)
    try {
      const res = await fetch(`/api/admin/users/profile?email=${encodeURIComponent(selectedEmail)}`)
      if (res.ok) setUserPanelData(await res.json())
    } catch {}
    setUserPanelLoading(false)
  }

  // Group messages by date
  const grouped = []
  let lastDate = null
  for (const msg of messages) {
    const d = formatDate(msg.created_at)
    if (d !== lastDate) { grouped.push({ type: 'date', label: d }); lastDate = d }
    grouped.push({ type: 'msg', msg })
  }

  const selectedRoom = rooms.find(r => r.user_email === selectedEmail)
  const roomName = selectedRoom?.profile?.name || selectedEmail

  // ---- LIST VIEW ----
  if (view === 'list') {
    const totalUnread = rooms.reduce((s, r) => s + (r.unread || 0), 0)
    const q = searchQuery.trim().toLowerCase()
    const filteredRooms = q
      ? rooms.filter(r => {
          const name = (r.profile?.name || '').toLowerCase()
          const email = (r.user_email || '').toLowerCase()
          return name.includes(q) || email.includes(q)
        })
      : rooms
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Link href="/admin" style={{ color: '#1a3560', textDecoration: 'none', fontSize: 13 }}>← 管理画面</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a3560', flex: 1 }}>🙋 チャットお問い合わせ</h1>
          {totalUnread > 0 && (
            <span style={{ background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{totalUnread}</span>
          )}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="名前・メールで検索..."
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 10, padding: '9px 14px', fontSize: 14, outline: 'none', marginBottom: 16, color: '#333' }}
        />

        {filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 60, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            {q ? '該当するユーザーが見つかりません' : 'まだお問い合わせはありません'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#e0e0e0', borderRadius: 12, overflow: 'hidden' }}>
            {filteredRooms.map(room => {
              const last = room.last_message
              const preview = last.image_url && !last.message ? '📷 画像' : (last.message?.slice(0, 40) || '')
              const isFromUser = last.sender_type === 'user'
              return (
                <div
                  key={room.user_email}
                  onClick={() => openRoom(room.user_email)}
                  style={{ background: '#fff', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f8ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#1a3560', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ fontWeight: room.unread > 0 ? 700 : 600, fontSize: 14, color: '#1a3560', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.profile?.name || room.user_email}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0, marginLeft: 8 }}>{formatTime(last.created_at)}</div>
                    </div>
                    <div style={{ fontSize: 13, color: room.unread > 0 ? '#333' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: room.unread > 0 ? 600 : 400 }}>
                      {!isFromUser ? `運営: ` : ''}{preview}
                    </div>
                  </div>
                  {room.unread > 0 && (
                    <div style={{ background: '#e53935', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{room.unread > 9 ? '9+' : room.unread}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ---- ROOM VIEW ----
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', background: '#f0f2f5', fontFamily: 'sans-serif', position: 'relative' }}>
      {/* Header */}
      <div style={{ background: '#1a3560', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={backToList} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}>←</button>
        <button onClick={openUserPanel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10, flex: 1, textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{roomName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{selectedEmail}</div>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollAreaRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        {grouped.map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${i}`} style={{ textAlign: 'center', margin: '12px 0', fontSize: 11, color: '#999' }}>
                <span style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '2px 10px' }}>{item.label}</span>
              </div>
            )
          }
          const { msg } = item
          const isFromCurrentAdmin = msg.sender_type === 'admin' && msg.sender_id === currentUser?.id
          const isFromOtherAdmin = msg.sender_type === 'admin' && msg.sender_id !== currentUser?.id
          const isFromUser = msg.sender_type === 'user'
          const alignRight = msg.sender_type === 'admin'

          const bubbleBg = isFromCurrentAdmin ? '#1a3560' : isFromOtherAdmin ? '#2e7d32' : '#fff'
          const bubbleColor = msg.sender_type === 'admin' ? '#fff' : '#333'

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: alignRight ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
              {isFromUser && (
                <button onClick={openUserPanel} style={{ width: 34, height: 34, borderRadius: '50%', background: '#90a4ae', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: 'none', cursor: 'pointer', padding: 0 }}>👤</button>
              )}
              {isFromOtherAdmin && (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🌸</div>
              )}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: alignRight ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 4 }}>
                <div>
                  {!alignRight && (
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 3, marginLeft: 4 }}>{msg.sender_name}</div>
                  )}
                  {isFromOtherAdmin && (
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 3, marginLeft: 4 }}>{msg.sender_name}（運営）</div>
                  )}
                  <div style={{
                    background: bubbleBg,
                    color: bubbleColor,
                    borderRadius: alignRight ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: msg.image_url && !msg.message ? '4px' : '10px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {msg.image_url && (
                      <img src={msg.image_url} alt="画像" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 12, display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.image_url, '_blank')} />
                    )}
                    {msg.message && <div style={{ marginTop: msg.image_url ? 6 : 0 }}>{msg.message}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#aaa', flexShrink: 0, paddingBottom: 2 }}>{formatFullTime(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div style={{ height: 8 }} />
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '8px 12px', flexShrink: 0 }}>
        {imagePreview && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            <img src={imagePreview.dataUrl} alt="preview" style={{ height: 80, borderRadius: 8, border: '1px solid #ddd' }} />
            <button onClick={() => setImagePreview(null)} style={{ position: 'absolute', top: -6, right: -6, background: '#e53935', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: '#e53935', marginBottom: 6 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, flexShrink: 0, color: '#888' }} title="画像を送る">📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="返信メッセージを入力..."
            rows={1}
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: 20, padding: '8px 14px', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'sans-serif', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || uploading || (!text.trim() && !imagePreview)}
            style={{ background: (sending || (!text.trim() && !imagePreview)) ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 16, flexShrink: 0 }}
          >{uploading ? '⏳' : '➤'}</button>
        </div>
      </div>

      {/* User info panel */}
      {userPanelOpen && (
        <>
          <div onClick={() => setUserPanelOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 20 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, background: '#fff', zIndex: 21, overflowY: 'auto', boxShadow: '-4px 0 16px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#1a3560', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>会員情報</div>
              <button onClick={() => setUserPanelOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {userPanelLoading && <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>読み込み中...</div>}

            {!userPanelLoading && userPanelData && (
              <div style={{ padding: 16 }}>
                {/* プロフィール */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>会員登録情報</div>
                  {[
                    { label: '名前', value: userPanelData.profile?.name },
                    { label: 'ニックネーム', value: userPanelData.profile?.nickname },
                    { label: 'メール', value: userPanelData.profile?.email },
                    { label: '電話', value: userPanelData.profile?.phone },
                    { label: 'SNS', value: userPanelData.profile?.sns_url },
                    { label: '登録日', value: userPanelData.profile?.created_at ? new Date(userPanelData.profile.created_at).toLocaleDateString('ja-JP') : null },
                  ].map(({ label, value }) => value ? (
                    <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                      <div style={{ color: '#888', flexShrink: 0, width: 72 }}>{label}</div>
                      <div style={{ color: '#333', wordBreak: 'break-all' }}>{value}</div>
                    </div>
                  ) : null)}
                </div>

                {/* 予約履歴 */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                  <button
                    onClick={() => setBookingsOpen(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: bookingsOpen ? 10 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      予約履歴（{userPanelData.bookings?.length || 0}件）
                    </div>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{bookingsOpen ? '▲' : '▼'}</span>
                  </button>
                  {bookingsOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {userPanelData.bookings?.length === 0 && (
                        <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>予約履歴がありません</div>
                      )}
                      {userPanelData.bookings?.map(b => (
                        <div key={`${b.type}-${b.id}`} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #eee', background: b.cancelled_at ? '#fafafa' : '#f8fbff', opacity: b.cancelled_at ? 0.7 : 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {b.event_date && <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3560', marginBottom: 2 }}>{new Date(b.event_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}</div>}
                              {b.event_title && <div style={{ fontSize: 12, color: '#333', marginBottom: 1 }}>{b.event_title}</div>}
                              {b.location_name && <div style={{ fontSize: 11, color: '#666', marginBottom: 1 }}>📍 {b.location_name}</div>}
                              {b.model_name && <div style={{ fontSize: 11, color: '#666', marginBottom: 1 }}>👤 {b.model_name}</div>}
                              {b.slot_label && <div style={{ fontSize: 11, color: '#555' }}>🕐 {b.slot_label}</div>}
                              {b.cancelled_at && <div style={{ fontSize: 10, color: '#c62828', marginTop: 2 }}>キャンセル済み</div>}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              {b.final_price != null && <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3560' }}>¥{b.final_price.toLocaleString()}</div>}
                              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{b.payment_method === 'card' ? '💳' : '💴'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
