'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ModelStaffTabs from '@/components/ModelStaffTabs'

export default function ModelInvitePage() {
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/model-invite')
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
      <Link href="/admin/models" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデル管理</Link>

      <div style={{ margin: '8px 0 32px' }}>
        <ModelStaffTabs />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 招待リンク */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '28px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>招待リンク</h2>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 20, marginTop: 0 }}>
            このリンクを送ったモデル候補者は、LINEログインなしでメール・パスワードで会員登録でき、<strong>モデル権限が自動で付与</strong>されます。
          </p>

          {inviteUrl ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, background: '#f5f9ff', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1a3560', fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #d6ecf5' }}>
                {inviteUrl}
              </div>
              <button onClick={copyLink}
                style={{ background: copied ? '#388e3c' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
          ) : (
            <p style={{ color: '#aaa', fontSize: 14 }}>読み込み中...</p>
          )}
        </section>

        {/* ページプレビュー */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '28px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>モデル登録の流れ（プレビュー）</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 20, marginTop: 0 }}>
            モデルがリンクから登録後に進む各ステップのページを確認できます。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'モデル登録手引き', desc: 'ようこそページ・PDF説明', href: '/model-portal/onboarding' },
              { label: '芸名・X作成', desc: '芸名入力とXアカウント作成説明', href: '/model-portal/stage-name' },
              { label: '非公開登録情報', desc: '本名・住所・契約書への同意', href: '/model-portal/private-info' },
              { label: 'プロフィール編集', desc: '公開プロフィールの作成', href: '/model-portal/profile' },
            ].map((item, i) => (
              <div key={item.href} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f5f9ff', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ background: '#1a3560', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.desc}</div>
                </div>
                <a href={item.href}
                  style={{ background: '#fff', color: '#1a3560', border: '1px solid #d6ecf5', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  確認する →
                </a>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
