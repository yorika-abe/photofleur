'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

export default function R2CleanupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(0)
  const [error, setError] = useState('')

  async function scan() {
    setLoading(true)
    setResult(null)
    setSelected(new Set())
    setError('')
    try {
      const res = await fetch('/api/admin/r2-cleanup')
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectAll() {
    if (!result) return
    setSelected(new Set(result.orphans.map(o => o.key)))
  }

  function clearSelect() {
    setSelected(new Set())
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`選択した ${selected.size} 件のファイルを削除しますか？\nこの操作は取り消せません。`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/r2-cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [...selected] }),
      })
      const data = await res.json()
      if (data.ok) {
        setDeleted(prev => prev + data.deleted)
        setResult(prev => ({ ...prev, orphans: prev.orphans.filter(o => !selected.has(o.key)), total: prev.total - selected.size }))
        setSelected(new Set())
      } else {
        setError(data.error || '削除に失敗しました')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setDeleting(false)
    }
  }

  const isImage = (key) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: '12px 0 8px' }}>R2 ストレージ クリーンアップ</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>DBで参照されていないファイルを検出・削除します</p>

      {error && (
        <div style={{ background: '#fce4ec', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c62828' }}>
          エラー: {error}
        </div>
      )}

      {deleted > 0 && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
          ✅ 合計 {deleted} 件削除しました
        </div>
      )}

      <button onClick={scan} disabled={loading}
        style={{ background: loading ? '#ccc' : '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, marginBottom: 24 }}>
        {loading ? '🔍 スキャン中...' : '🔍 スキャン開始'}
      </button>

      {result && (
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: 'R2 総ファイル数', value: result.total, color: '#2f2244' },
              { label: 'DB参照済み', value: result.used, color: '#388e3c' },
              { label: '孤立ファイル', value: result.orphans.length, color: result.orphans.length > 0 ? '#c62828' : '#388e3c' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '12px 20px', minWidth: 120 }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {result.orphans.length === 0 ? (
            <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '20px', textAlign: 'center', color: '#2e7d32', fontWeight: 600, fontSize: 15 }}>
              ✅ 孤立ファイルはありません
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#c62828', fontSize: 14 }}>孤立ファイル: {result.orphans.length} 件</span>
                <button onClick={selectAll} style={{ fontSize: 12, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>全選択</button>
                <button onClick={clearSelect} style={{ fontSize: 12, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>選択解除</button>
                {selected.size > 0 && (
                  <button onClick={deleteSelected} disabled={deleting}
                    style={{ fontSize: 12, background: deleting ? '#ccc' : '#c62828', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                    {deleting ? '削除中...' : `選択した ${selected.size} 件を削除`}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.orphans.map(o => (
                  <div key={o.key} onClick={() => toggleSelect(o.key)}
                    style={{ background: selected.has(o.key) ? '#fce4ec' : '#fff', border: `1.5px solid ${selected.has(o.key) ? '#ef9a9a' : '#e5e5e5'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.1s' }}>
                    <input type="checkbox" checked={selected.has(o.key)} onChange={() => toggleSelect(o.key)} onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }} />
                    {isImage(o.key) && (
                      <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f5f5f5' }}>
                        <img src={o.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#333', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.key}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        {formatBytes(o.size)} · {formatDate(o.lastModified)}
                      </div>
                    </div>
                    <a href={o.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11, color: '#1a3560', textDecoration: 'none', flexShrink: 0 }}>
                      開く↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
