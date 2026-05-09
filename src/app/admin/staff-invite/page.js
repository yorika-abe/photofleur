'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ModelStaffTabs from '@/components/ModelStaffTabs'

const STAFF_STEPS = [
  { num: 1, title: 'スタッフ登録手引き', desc: 'ようこそページ・PDF説明', href: '/staff-portal/onboarding' },
  { num: 2, title: '非公開情報・スタッフ規約', desc: '本名・連絡先の登録と規約への同意', href: '/staff-portal/private-info' },
  { num: 3, title: 'スタッフ活動の手引き', desc: '活動マニュアル・注意事項', href: '/staff-portal/guide' },
]

export default function StaffInvitePage() {
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/staff-invite')
      .then(r => r.json())
      .then(d => { if (d.inviteUrl) setInviteUrl(d.inviteUrl) })
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 0' }}>
        <ModelStaffTabs />
      </div>
      <div style={{ marginBottom: 32 }} />

      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>🔗 スタッフ登録リンク</h2>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>このリンクを共有すると、スタッフアカウントを作成できます。</p>

      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '24px' }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>スタッフ登録URL</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: '#f8fbff', border: '1px solid #ddd', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#333', wordBreak: 'break-all' }}>
            {inviteUrl || '読み込み中...'}
          </div>
          <button onClick={copyLink} disabled={!inviteUrl}
            style={{ background: copied ? '#388e3c' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 700, fontSize: 14, cursor: inviteUrl ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
            {copied ? '✅ コピー済み' : 'コピー'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 12 }}>
          ※ このURLを知っている人ならだれでもスタッフ登録できます。信頼できる方にのみ共有してください。
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '24px', marginTop: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 4 }}>スタッフ登録の流れ（プレビュー）</div>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>スタッフがリンクから登録後に進む各ステップのページを確認できます。</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAFF_STEPS.map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fbff', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a3560', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{s.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.desc}</div>
              </div>
              <Link href={s.href} target="_blank" style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                確認する →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
