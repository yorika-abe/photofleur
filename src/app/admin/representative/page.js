'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminRepresentativeListPage() {
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const dragIdx = useRef(null)
  const dragOverIdx = useRef(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/representatives')
    if (res.ok) setReps(await res.json())
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function createNew() {
    setCreating(true)
    const res = await fetch('/api/admin/representatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '（新規）', role: '', message: '', photo: '' }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/admin/representative/${data.id}`)
    }
    setCreating(false)
  }

  async function deleteRep(id, name) {
    if (!confirm(`「${name || '（無題）'}」を削除しますか？`)) return
    await fetch(`/api/admin/representatives/${id}`, { method: 'DELETE' })
    load()
  }

  function onDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, idx) {
    e.preventDefault()
    dragOverIdx.current = idx
    const els = document.querySelectorAll('[data-rep-card]')
    els.forEach((el, i) => {
      el.style.opacity = i === idx && i !== dragIdx.current ? '0.5' : '1'
    })
  }

  async function onDrop(e) {
    e.preventDefault()
    document.querySelectorAll('[data-rep-card]').forEach(el => { el.style.opacity = '1' })
    const from = dragIdx.current
    const to = dragOverIdx.current
    if (from === null || to === null || from === to) return

    const newReps = [...reps]
    const [moved] = newReps.splice(from, 1)
    newReps.splice(to, 0, moved)
    setReps(newReps)

    setSaving(true)
    await fetch('/api/admin/representatives/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: newReps.map(r => r.id) }),
    })
    setSaving(false)
    dragIdx.current = null
    dragOverIdx.current = null
  }

  function onDragEnd() {
    document.querySelectorAll('[data-rep-card]').forEach(el => { el.style.opacity = '1' })
    dragIdx.current = null
    dragOverIdx.current = null
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>代表メッセージ管理</h1>
        <button onClick={createNew} disabled={creating}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
          {creating ? '作成中...' : '＋ 新規作成'}
        </button>
      </div>

      <p style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
        ドラッグ&ドロップでHPに表示される順番を変更できます。
        {saving && <span style={{ color: '#1a3560', fontWeight: 600, marginLeft: 8 }}>保存中...</span>}
      </p>

      {loading ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
      ) : reps.length === 0 ? (
        <div style={{ background: '#f8fbff', border: '2px dashed #d6ecf5', borderRadius: 14, padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 16px' }}>代表メッセージがまだありません</p>
          <button onClick={createNew} disabled={creating}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            最初のメッセージを作成する
          </button>
        </div>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          {reps.map((rep, idx) => {
            const textPreview = (rep.message || '').replace(/<[^>]+>/g, '').slice(0, 80)
            return (
              <div
                key={rep.id}
                data-rep-card
                draggable
                onDragStart={e => onDragStart(e, idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                style={{
                  background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12,
                  padding: '16px', display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'grab', transition: 'opacity 0.15s',
                }}
              >
                {/* ドラッグハンドル */}
                <div style={{ color: '#ccc', fontSize: 18, cursor: 'grab', flexShrink: 0, userSelect: 'none' }}>⠿⠿</div>

                {/* 写真 */}
                {rep.photo ? (
                  <Image src={rep.photo} alt="" width={52} height={65} style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 52, height: 65, borderRadius: 8, background: '#f0f0f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
                )}

                {/* テキスト */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {rep.role && <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>{rep.role}</div>}
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>{rep.name || '（無題）'}</div>
                  {textPreview && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{textPreview}{(rep.message || '').replace(/<[^>]+>/g, '').length > 80 ? '...' : ''}</div>}
                </div>

                {/* ボタン */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/admin/representative/${rep.id}`}
                    style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    編集
                  </Link>
                  <button onClick={() => deleteRep(rep.id, rep.name)}
                    style={{ background: '#fff', color: '#e53935', border: '1px solid #e53935', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    削除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
