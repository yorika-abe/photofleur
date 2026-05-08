'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const REQUIRED_FIELDS = ['real_name', 'phone', 'email', 'address', 'station']
const EMPTY_FORM = { real_name: '', phone: '', email: '', address: '', station: '', emergency_contact: '' }

const STAFF_RULES = [
  { title: '第1条（業務内容）', body: '受付スタッフは、撮影会当日における受付業務（チェックイン、誘導、問い合わせ対応等）を担当します。' },
  { title: '第2条（遅刻・欠勤について）', body: '当日の無断欠勤・無連絡遅刻は禁止とします。\n事前に連絡がある場合でも、代役を手配する責任があります。\n撮影時間の15分前までに受付場所へ到着し、集合場所写真を送信してください。' },
  { title: '第3条（キャンセルについて）', body: 'スタッフ確定後のキャンセルは原則できません。\nやむを得ない場合は必ず事前にモデルと運営に連絡してください。' },
  { title: '第4条（個人情報の取り扱い）', body: 'スタッフ業務で知り得た参加者の個人情報（氏名、メールアドレス等）を外部に漏洩することを禁止します。' },
  { title: '第5条（SNSへの投稿）', body: '撮影会参加者を特定できる情報や、運営に関する内部情報をSNSに投稿することを禁止します。\n撮影会の様子を投稿する場合は、参加者の顔が映らないよう配慮してください。' },
  { title: '第6条（受付マニュアルの遵守）', body: '受付業務は別途共有する受付マニュアルに従って行ってください。' },
  { title: '第7条（違反時の措置）', body: '本規約に違反した場合、スタッフ登録を解除させていただく場合があります。' },
]

function ContractModal({ form, onClose, onAgree, readOnly, agreedAt }) {
  const today = agreedAt
    ? new Date(agreedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const [scrolled, setScrolled] = useState(readOnly)
  const [checked, setChecked] = useState(false)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a3560' }}>スタッフ規約・個人情報同意書</h2>
            {readOnly && <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600, marginTop: 4 }}>✅ 締結済み・閲覧専用</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div
          onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true) }}
          style={{ overflowY: 'auto', padding: '24px', flex: 1, fontSize: 13, lineHeight: 2, color: '#333' }}
        >
          {!readOnly && <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>※ 最後までスクロールして内容をご確認ください</p>}

          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560' }}>受付スタッフ規約</h3>
          <p style={{ margin: '8px 0' }}><strong>PhotoFleur 撮影会</strong></p>
          {STAFF_RULES.map((a, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 14, marginBottom: 4 }}>{a.title}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>
            </div>
          ))}

          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560', marginTop: 28 }}>個人情報の取り扱いについて</h3>
          <p>氏名：{form.real_name}<br />住所：{form.address}<br />電話番号：{form.phone}</p>
          <p>上記の個人情報は、スタッフ管理・緊急連絡・契約確認のみに使用し、第三者に提供しません。<br />同意日：{today}</p>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', background: '#f8fbff' }}>
          {readOnly ? (
            <button onClick={onClose} style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              閉じる
            </button>
          ) : (
            <>
              {!scrolled && <p style={{ fontSize: 12, color: '#1565c0', margin: '0 0 12px', fontWeight: 600 }}>↓ 最後までスクロールすると同意できます</p>}
              {scrolled && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a3560' }}>
                  <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  上記のスタッフ規約および個人情報の取り扱いに同意します
                </label>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>キャンセル</button>
                <button onClick={() => checked && onAgree()} disabled={!checked}
                  style={{ flex: 2, background: checked ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', cursor: checked ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}>
                  同意して締結する
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, value, editing, onChange, placeholder }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>
        {label}{required && <span style={{ color: '#e53935', marginLeft: 4 }}>*</span>}
      </div>
      {editing ? (
        <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <div style={{ padding: '10px 12px', background: '#f5f7fa', borderRadius: 8, fontSize: 14, color: value ? '#1a3560' : '#bbb', fontWeight: value ? 600 : 400, minHeight: 42, display: 'flex', alignItems: 'center' }}>
          {value || '未入力'}
        </div>
      )}
    </div>
  )
}

export default function StaffPrivateInfoPage() {
  const [liveData, setLiveData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [contractAgreedAt, setContractAgreedAt] = useState(null)
  const [pendingChanges, setPendingChanges] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showContract, setShowContract] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/staff-portal/private-info')
    const data = await res.json()
    setLiveData(data)
    const src = data.pending_changes || data
    setForm({
      real_name: src.real_name || '',
      phone: src.phone || '',
      email: src.email || '',
      address: src.address || '',
      station: src.station || '',
      emergency_contact: src.emergency_contact || '',
    })
    setContractAgreedAt(data.contract_agreed_at || null)
    setPendingChanges(data.pending_changes || null)
    setLoading(false)
  }

  async function handleFirstSave() {
    const missing = REQUIRED_FIELDS.filter(k => !form[k])
    if (missing.length > 0) { setMessage('必須項目をすべて入力してください'); return }
    setShowContract(true)
  }

  async function handleAgreeContract() {
    setShowContract(false)
    setSaving(true)
    const res = await fetch('/api/staff-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, contract_agreed_at: new Date().toISOString() }),
    })
    setSaving(false)
    if (res.ok) { setMessage('登録が完了しました'); load() }
    else setMessage('エラーが発生しました')
  }

  async function handleUpdate() {
    setSaving(true)
    const res = await fetch('/api/staff-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_changes: form }),
    })
    setSaving(false)
    if (res.ok) { setMessage('変更申請しました。運営の確認後に反映されます。'); setEditing(false); load() }
    else setMessage('エラーが発生しました')
  }

  const hasInfo = !!liveData?.real_name
  const hasPending = !!pendingChanges
  const displayForm = editing ? form : (pendingChanges || form)

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 16px' }}>
      {showContract && (
        <ContractModal
          form={form}
          onClose={() => setShowContract(false)}
          onAgree={handleAgreeContract}
          readOnly={false}
        />
      )}

      <Link href="/staff-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← スタッフ画面</Link>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: '10px 0 4px' }}>スタッフ非公開情報</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>登録情報は運営のみ閲覧できます。一般には公開されません。</p>

      {message && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#388e3c', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {hasPending && (
        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1565c0' }}>
          ⏳ 変更申請中です。運営の確認後に反映されます。
        </div>
      )}

      {!hasInfo ? (
        // 未登録：フォーム入力 + 契約同意
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>基本情報を登録してください</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="本名" required value={form.real_name} editing onChange={v => setForm(f => ({ ...f, real_name: v }))} placeholder="山田 太郎" />
            <Field label="電話番号" required value={form.phone} editing onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="090-0000-0000" />
            <Field label="メールアドレス" required value={form.email} editing onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="example@email.com" />
            <Field label="住所" required value={form.address} editing onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="東京都○○区○○" />
            <Field label="最寄り駅" required value={form.station} editing onChange={v => setForm(f => ({ ...f, station: v }))} placeholder="○○駅" />
            <Field label="緊急連絡先（氏名・電話番号）" value={form.emergency_contact} editing onChange={v => setForm(f => ({ ...f, emergency_contact: v }))} placeholder="山田花子 090-0000-0001（母）" />
          </div>
          <button onClick={handleFirstSave} disabled={saving}
            style={{ width: '100%', marginTop: 24, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {saving ? '保存中...' : '情報を確認して規約に同意する →'}
          </button>
        </div>
      ) : (
        // 登録済み：表示 + 編集
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', margin: 0 }}>登録情報</h2>
              {!editing && (
                <button onClick={() => { setEditing(true); setForm({ real_name: liveData.real_name || '', phone: liveData.phone || '', email: liveData.email || '', address: liveData.address || '', station: liveData.station || '', emergency_contact: liveData.emergency_contact || '' }); setMessage('') }}
                  style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 7, padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  編集する
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="本名" required value={editing ? form.real_name : (liveData.real_name || '')} editing={editing} onChange={v => setForm(f => ({ ...f, real_name: v }))} />
              <Field label="電話番号" required value={editing ? form.phone : (liveData.phone || '')} editing={editing} onChange={v => setForm(f => ({ ...f, phone: v }))} />
              <Field label="メールアドレス" required value={editing ? form.email : (liveData.email || '')} editing={editing} onChange={v => setForm(f => ({ ...f, email: v }))} />
              <Field label="住所" required value={editing ? form.address : (liveData.address || '')} editing={editing} onChange={v => setForm(f => ({ ...f, address: v }))} />
              <Field label="最寄り駅" required value={editing ? form.station : (liveData.station || '')} editing={editing} onChange={v => setForm(f => ({ ...f, station: v }))} />
              <Field label="緊急連絡先" value={editing ? form.emergency_contact : (liveData.emergency_contact || '')} editing={editing} onChange={v => setForm(f => ({ ...f, emergency_contact: v }))} />
            </div>
            {editing && (
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setEditing(false); setMessage('') }}
                  style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>キャンセル</button>
                <button onClick={handleUpdate} disabled={saving}
                  style={{ flex: 2, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {saving ? '申請中...' : '変更を申請する'}
                </button>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 2 }}>スタッフ規約・個人情報同意書</div>
                {contractAgreedAt
                  ? <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600 }}>✅ 締結済み（{new Date(contractAgreedAt).toLocaleDateString('ja-JP')}）</div>
                  : <div style={{ fontSize: 12, color: '#e53935', fontWeight: 600 }}>⚠️ 未締結</div>}
              </div>
              <button onClick={() => setShowContract(true)}
                style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
                確認する
              </button>
            </div>
            {showContract && (
              <ContractModal form={liveData} onClose={() => setShowContract(false)} onAgree={() => {}} readOnly={!!contractAgreedAt} agreedAt={contractAgreedAt} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
