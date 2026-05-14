'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

async function downloadPhoto(url, idx) {
  const res = await fetch(url)
  const blob = await res.blob()
  const ext = blob.type.split('/')[1] || 'jpg'
  const filename = `photo_${idx != null ? String(idx + 1).padStart(3, '0') + '_' : ''}${Date.now()}.${ext}`

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type })
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }) } catch (e) { /* キャンセル等 */ }
      return
    }
  }

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function formatDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PhotoCard({ p, modelMap, onExpand, onToggleStar, starring, selected, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: selected ? '2px solid #1a3560' : '1px solid #e5e5e5', overflow: 'hidden', position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); onSelect(p.id) }}
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          width: 26, height: 26, borderRadius: 6,
          background: selected ? '#1a3560' : 'rgba(255,255,255,0.9)',
          border: selected ? '2px solid #1a3560' : '2px solid #ccc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 14, color: '#fff', lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        {selected ? '✓' : ''}
      </button>
      <button
        onClick={() => onToggleStar(p)}
        disabled={starring === p.id}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          background: p.is_featured ? '#fff8e1' : 'rgba(255,255,255,0.9)',
          border: `1px solid ${p.is_featured ? '#ffc107' : '#ddd'}`,
          borderRadius: '50%', width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          opacity: starring === p.id ? 0.5 : 1,
        }}
        title={p.is_featured ? 'お気に入り解除' : 'お気に入りに追加'}
      >
        {p.is_featured ? '⭐' : '☆'}
      </button>
      <div style={{ aspectRatio: '4/3', background: '#f0f4fb', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => onExpand(p)}>
        <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{formatDateTime(p.created_at)}</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
          <span style={{ color: '#999' }}>カメラマン：</span>{p.user_name || p.user_email}
        </div>
        {p.model_ids?.length > 0 && (
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
            <span style={{ color: '#999' }}>モデル：</span>{p.model_ids.map(id => modelMap[id] || id).join('、')}
          </div>
        )}
        {p.sns_url && (
          <div style={{ fontSize: 12, marginBottom: 10, wordBreak: 'break-all' }}>
            <span style={{ color: '#999' }}>SNS：</span>
            <a href={p.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560' }}>{p.sns_url}</a>
          </div>
        )}
        <button onClick={() => downloadPhoto(p.photo_url)}
          style={{ display: 'block', width: '100%', textAlign: 'center', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ダウンロード
        </button>
      </div>
    </div>
  )
}

function FavoriteCard({ p, onExpand, onRemoveStar, onDragStart, onDragOver, onDrop, isDragging }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={onDrop}
      style={{
        background: '#fff', borderRadius: 12, border: `2px solid ${isDragging ? '#ffc107' : '#ffe082'}`,
        overflow: 'hidden', position: 'relative', cursor: 'grab', opacity: isDragging ? 0.5 : 1,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: 'rgba(255,255,255,0.85)', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#999', cursor: 'grab' }}>
        ☰ ドラッグで並替
      </div>
      <button
        onClick={() => onRemoveStar(p)}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          background: '#fff8e1', border: '1px solid #ffc107',
          borderRadius: '50%', width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
        title="お気に入り解除"
      >⭐</button>
      <div style={{ aspectRatio: '4/3', background: '#f0f4fb', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => onExpand(p)}>
        <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>{formatDateTime(p.created_at)}</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
          <span style={{ color: '#999' }}>カメラマン：</span>{p.user_name || p.user_email}
        </div>
        {p.sns_url && (
          <div style={{ fontSize: 12, wordBreak: 'break-all' }}>
            <span style={{ color: '#999' }}>SNS：</span>
            <a href={p.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560' }}>{p.sns_url}</a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPhotosPage() {
  const [tab, setTab] = useState('all') // 'all' | 'favorites'
  const [photos, setPhotos] = useState([])
  const [favorites, setFavorites] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [lastViewed, setLastViewed] = useState(null)
  const [starring, setStarring] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [notifyModal, setNotifyModal] = useState(null) // { photo }
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState(null) // { emailSent, lineSent, lineError }
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  useEffect(() => {
    const prev = document.cookie.split('; ').find(r => r.startsWith('photos_last_viewed='))?.split('=')[1]
    setLastViewed(prev || null)
    document.cookie = `photos_last_viewed=${new Date().toISOString()};path=/;max-age=${60 * 60 * 24 * 365}`

    Promise.all([
      fetch('/api/customer/contributed-photos').then(r => r.json()),
      fetch('/api/admin/models').then(r => r.json()).then(d => d.models || []).catch(() => []),
      fetch('/api/admin/contributed-photos').then(r => r.json()),
    ]).then(([p, m, fav]) => {
      if (p?.error) { setFetchError(p.error); setLoading(false); return }
      const allPhotos = Array.isArray(p) ? p : []
      const favData = Array.isArray(fav) ? fav : []
      const favIds = new Set(favData.map(f => f.id))
      // is_featuredフラグをallPhotosにマージ
      setPhotos(allPhotos.map(ph => ({ ...ph, is_featured: favIds.has(ph.id) })))
      setFavorites(favData)
      setModels(Array.isArray(m) ? m : [])
      setLoading(false)
    })
  }, [])

  const modelMap = Object.fromEntries(models.map(m => [m.id, m.name]))

  async function toggleStar(p) {
    setStarring(p.id)
    const newVal = !p.is_featured
    await fetch('/api/admin/contributed-photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, is_featured: newVal }),
    })
    setPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, is_featured: newVal } : ph))
    if (newVal) {
      setFavorites(prev => [...prev, { ...p, is_featured: true }])
      setNotifyModal({ photo: p })
    } else {
      setFavorites(prev => prev.filter(f => f.id !== p.id))
    }
    setStarring(null)
  }

  async function sendNotify(photo) {
    setNotifying(true)
    const res = await fetch('/api/admin/notify-contributor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_id: photo.id }),
    })
    const data = await res.json()
    setNotifying(false)
    setNotifyResult(data)
  }

  // ドラッグ並び替え
  function handleDragStart(idx) { dragItem.current = idx }
  function handleDragOver(idx) { dragOver.current = idx }
  async function handleDrop() {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return
    const newFavs = [...favorites]
    const [moved] = newFavs.splice(dragItem.current, 1)
    newFavs.splice(dragOver.current, 0, moved)
    dragItem.current = null
    dragOver.current = null
    setFavorites(newFavs)
    setSavingOrder(true)
    await fetch('/api/admin/contributed-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newFavs.map(f => f.id) }),
    })
    setSavingOrder(false)
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)))
    }
  }

  async function bulkDownload() {
    setBulkDownloading(true)
    const toDownload = photos.filter(p => selectedIds.has(p.id))
    for (let i = 0; i < toDownload.length; i++) {
      await downloadPhoto(toDownload[i].photo_url, i)
      if (i < toDownload.length - 1) await new Promise(r => setTimeout(r, 700))
    }
    setBulkDownloading(false)
    setSelectedIds(new Set())
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
  if (fetchError) return <div style={{ padding: 60, textAlign: 'center', color: '#e53935' }}>エラー: {fetchError}</div>

  const newPhotos = lastViewed ? photos.filter(p => new Date(p.created_at) > new Date(lastViewed)) : photos
  const seenPhotos = lastViewed ? photos.filter(p => new Date(p.created_at) <= new Date(lastViewed)) : []
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`@media(max-width:640px){ .photos-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } }`}</style>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '8px 0 4px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>ご提供写真</h1>
      </div>
      <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>※ご提供から2ヶ月で自動消去されます</p>

      {/* 一括操作バー */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={selectAll}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1a3560', background: selectedIds.size === photos.length ? '#1a3560' : '#fff', color: selectedIds.size === photos.length ? '#fff' : '#1a3560', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {selectedIds.size === photos.length ? '✓ 全選択中' : '全て選択'}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>{selectedIds.size}件選択中</span>
              <button onClick={() => setSelectedIds(new Set())}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 12, cursor: 'pointer' }}>
                解除
              </button>
              <button onClick={bulkDownload} disabled={bulkDownloading}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: bulkDownloading ? '#aaa' : '#1a3560', color: '#fff', fontSize: 12, fontWeight: 700, cursor: bulkDownloading ? 'not-allowed' : 'pointer' }}>
                {bulkDownloading ? 'ダウンロード中...' : `📥 一括ダウンロード（${selectedIds.size}件）`}
              </button>
            </>
          )}
        </div>
      )}

      {/* タブ */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #eee' }}>
        {[
          { id: 'all', label: '📸 ご提供写真', count: photos.length },
          { id: 'favorites', label: '⭐ お気に入り', count: favorites.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? '#1a3560' : '#999',
            borderBottom: tab === t.id ? '2px solid #1a3560' : '2px solid transparent',
            marginBottom: -2,
          }}>
            {t.label}
            <span style={{ marginLeft: 6, fontSize: 12, background: tab === t.id ? '#e8f0fe' : '#f5f5f5', color: tab === t.id ? '#1a3560' : '#999', borderRadius: 10, padding: '1px 7px' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ご提供写真タブ */}
      {tab === 'all' && (
        <>
          {photos.length === 0 ? (
            <p style={{ color: '#999' }}>まだ提供された写真はありません。</p>
          ) : (
            <>
              {newPhotos.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1a3560', letterSpacing: '0.08em', marginBottom: 12 }}>新着 {newPhotos.length}件</p>
                  <div className="photos-grid" style={grid}>
                    {newPhotos.map(p => <PhotoCard key={p.id} p={p} modelMap={modelMap} onExpand={setExpanded} onToggleStar={toggleStar} starring={starring} selected={selectedIds.has(p.id)} onSelect={toggleSelect} />)}
                  </div>
                </div>
              )}
              {newPhotos.length === 0 && <p style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>新着はありません。</p>}
              {seenPhotos.length > 0 && (
                <div>
                  <button onClick={() => setShowAll(v => !v)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: '#555', cursor: 'pointer', fontWeight: 600, marginBottom: 16 }}>
                    {showAll ? '▲ 閉じる' : `▼ 全て見る（${seenPhotos.length}件）`}
                  </button>
                  {showAll && (
                    <div className="photos-grid" style={grid}>
                      {seenPhotos.map(p => <PhotoCard key={p.id} p={p} modelMap={modelMap} onExpand={setExpanded} onToggleStar={toggleStar} starring={starring} selected={selectedIds.has(p.id)} onSelect={toggleSelect} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* お気に入りタブ */}
      {tab === 'favorites' && (
        <>
          {favorites.length === 0 ? (
            <p style={{ color: '#999' }}>⭐ をつけた写真がHOMEに表示されます。</p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
                ドラッグで表示順を変更できます。{savingOrder && <span style={{ color: '#f4a0be' }}>保存中...</span>}
              </p>
              <div className="photos-grid" style={grid}>
                {favorites.map((p, idx) => (
                  <FavoriteCard
                    key={p.id}
                    p={p}
                    modelMap={modelMap}
                    onExpand={setExpanded}
                    onRemoveStar={() => toggleStar(p)}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={() => handleDragOver(idx)}
                    onDrop={handleDrop}
                    isDragging={dragItem.current === idx}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Lightbox */}
      {expanded && (
        <div onClick={() => setExpanded(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={expanded.photo_url} alt=""
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setExpanded(null)}
            style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* 掲載通知モーダル */}
      {notifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            {!notifyResult ? (
              <>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>📢 カメラマンに通知しますか？</p>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.7 }}>
                  メール・LINE（連携済みの場合）でホームページ掲載をお知らせします。
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => sendNotify(notifyModal.photo)}
                    disabled={notifying}
                    style={{ flex: 1, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: notifying ? 0.6 : 1 }}>
                    {notifying ? '送信中...' : 'はい、送る'}
                  </button>
                  <button
                    onClick={() => { setNotifyModal(null); setNotifyResult(null) }}
                    disabled={notifying}
                    style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    いいえ
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 12 }}>送信結果</p>
                <p style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>
                  📧 メール：{notifyResult.emailSent ? '✅ 送信しました' : '❌ 失敗しました'}
                </p>
                <p style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>
                  💬 LINE：{notifyResult.lineSent ? '✅ 送信しました' : `❌ ${notifyResult.lineError || '失敗しました'}`}
                </p>
                <button
                  onClick={() => { setNotifyModal(null); setNotifyResult(null) }}
                  style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  閉じる
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
