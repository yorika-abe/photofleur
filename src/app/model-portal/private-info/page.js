'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const REQUIRED_FIELDS = ['real_name', 'address', 'station', 'phone', 'email']

function ContractModal({ form, onClose, onAgree }) {
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const [scrolled, setScrolled] = useState(false)
  const [checked, setChecked] = useState(false)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a3560' }}>業務委託契約書・肖像権使用同意書</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div
          onScroll={e => {
            const el = e.currentTarget
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true)
          }}
          style={{ overflowY: 'auto', padding: '24px', flex: 1, fontSize: 13, lineHeight: 2, color: '#333' }}
        >
          <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>※ 最後までスクロールして内容をご確認ください</p>

          {/* ① 業務委託契約書 */}
          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560' }}>① 業務委託契約書</h3>
          <p><strong>契約日：</strong>{today}</p>
          <p><strong>依頼者（甲）：</strong>PhotoFleur</p>
          <p>
            <strong>モデル（乙）</strong><br />
            氏名：{form.real_name || '（未入力）'}<br />
            住所：{form.address || '（未入力）'}<br />
            電話番号：{form.phone || '（未入力）'}
          </p>

          <p><strong>第1条（契約の目的）</strong><br />
          甲は乙に対し、撮影会におけるモデル業務を委託し、乙はこれを受託する。</p>

          <p><strong>第2条（業務内容）</strong><br />
          ・撮影日時：不定期で開催される撮影会の日時<br />
          ・場所：不定期で開催される撮影会の開催場所<br />
          ・業務内容：撮影会へのモデル出演</p>

          <p><strong>第3条（報酬）</strong><br />
          ・報酬金額：￥最低3,000円/時間（税込）変動あり<br />
          ・支払方法：当日現金</p>

          <p><strong>第4条（肖像権と著作権）</strong><br />
          乙は、甲または甲の許可した者が撮影した写真を、商業的または非商業的に使用することに同意する。</p>

          <p><strong>第5条（禁止事項）</strong><br />
          別紙で指定する当撮影会の規約を違反する行為を禁止する。発覚した場合直ちに登録解除とするとともに当撮影会に被害が被った場合それと同等以上の請求をするものとする。</p>

          <p><strong>第6条（契約の解除）</strong><br />
          天災、病気、その他やむを得ない理由を除き、乙は契約を解除できない。</p>

          {form.guardian_name && <p><strong>保護者氏名：</strong>{form.guardian_name}</p>}

          <p>
            甲署名：photofleur撮影会主催 阿部依花<br />
            乙署名：{form.real_name || '（本名）'}<br />
            住所：{form.address || '（住所）'}
          </p>

          {/* ② 肖像権使用同意書 */}
          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560', marginTop: 32 }}>② 肖像権使用同意書</h3>
          <p>電話番号：{form.phone || '（未入力）'}</p>
          <p>
            私は、PhotoFleur撮影会において撮影されるすべての写真・動画について、以下の条件に同意します。<br />
            ・使用目的：SNS、Webサイト、広告宣伝、印刷物など<br />
            ・使用範囲：国内外問わず<br />
            ・使用期間：無期限<br />
            ・使用料：撮影報酬に含むものとする
          </p>
          <p>
            署名：{form.real_name || '（本名）'}<br />
            日付：{today}
          </p>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', background: '#f8fbff' }}>
          {!scrolled && (
            <p style={{ fontSize: 12, color: '#e65100', margin: '0 0 12px', fontWeight: 600 }}>↓ 最後までスクロールすると同意できます</p>
          )}
          {scrolled && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a3560' }}>
              <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              上記の業務委託契約書および肖像権使用同意書に同意します
            </label>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              キャンセル
            </button>
            <button onClick={() => checked && onAgree()} disabled={!checked}
              style={{ flex: 2, background: checked ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', cursor: checked ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}>
              同意して登録する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PrivateInfoPage() {
  const [form, setForm] = useState({
    real_name: '', address: '', station: '', agency: '',
    phone: '', email: '', school_company: '', guardian_name: '',
  })
  const [contractAgreedAt, setContractAgreedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showContract, setShowContract] = useState(false)

  useEffect(() => {
    fetch('/api/model-portal/private-info').then(r => r.json()).then(data => {
      if (data && !data.error) {
        setForm({
          real_name: data.real_name || '',
          address: data.address || '',
          station: data.station || '',
          agency: data.agency || '',
          phone: data.phone || '',
          email: data.email || '',
          school_company: data.school_company || '',
          guardian_name: data.guardian_name || '',
        })
        setContractAgreedAt(data.contract_agreed_at || null)
      }
      setLoading(false)
    })
  }, [])

  const canAgree = REQUIRED_FIELDS.every(f => form[f]?.trim())

  async function save(agreedAt) {
    setSaving(true)
    await fetch('/api/model-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, contract_agreed_at: agreedAt }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleAgree() {
    const now = new Date().toISOString()
    setContractAgreedAt(now)
    setShowContract(false)
    await save(now)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const label = (text, required) => (
    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>
      {text}{required && <span style={{ color: '#e53935', marginLeft: 4 }}>*</span>}
    </label>
  )

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      {showContract && (
        <ContractModal form={form} onClose={() => setShowContract(false)} onAgree={handleAgree} />
      )}

      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデルポータル</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 6px' }}>非公開登録情報</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>この情報はモデル様と運営のみが閲覧できます。ホームページには一切表示されません。</p>

      <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#795548' }}>
        <strong>⚠️ 必須情報について</strong><br />
        本名・住所・最寄り駅・電話番号・メールアドレスは業務委託契約に必要な情報です。正確にご入力ください。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 基本情報 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>基本情報</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {label('本名', true)}
              <input style={inp} value={form.real_name} onChange={e => setForm(f => ({ ...f, real_name: e.target.value }))} placeholder="山田 花子" />
            </div>
            <div>
              {label('住所', true)}
              <input style={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="東京都渋谷区..." />
            </div>
            <div>
              {label('最寄り駅', true)}
              <input style={inp} value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))} placeholder="渋谷駅" />
            </div>
            <div>
              {label('電話番号', true)}
              <input style={inp} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" />
            </div>
            <div>
              {label('メールアドレス（ログイン用）', true)}
              <input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" />
            </div>
          </div>
        </div>

        {/* 追加情報 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>追加情報</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {label('事務所名（所属している場合）')}
              <input style={inp} value={form.agency} onChange={e => setForm(f => ({ ...f, agency: e.target.value }))} placeholder="〇〇プロダクション" />
            </div>
            <div>
              {label('学校名または会社名（任意）')}
              <input style={inp} value={form.school_company} onChange={e => setForm(f => ({ ...f, school_company: e.target.value }))} placeholder="〇〇大学 / 〇〇株式会社" />
            </div>
            <div>
              {label('保護者名（未成年の場合）')}
              <input style={inp} value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} placeholder="山田 太郎" />
            </div>
          </div>
        </div>

        {/* 業務委託契約同意 */}
        <div style={{ background: '#fff', border: contractAgreedAt ? '1px solid #a5d6a7' : '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>業務委託契約・肖像権使用同意</h2>

          {contractAgreedAt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: '#388e3c', fontSize: 14 }}>同意済み</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {new Date(contractAgreedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 16 }}>
                業務委託契約書および肖像権使用同意書への同意が必要です。<br />
                <strong>必須情報をすべて入力してから</strong>同意画面をお開きください。
              </p>
              <button
                onClick={() => canAgree ? setShowContract(true) : null}
                disabled={!canAgree}
                style={{ background: canAgree ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: canAgree ? 'pointer' : 'not-allowed' }}>
                契約書・同意書を確認して同意する
              </button>
              {!canAgree && (
                <p style={{ fontSize: 12, color: '#e53935', marginTop: 8 }}>
                  ※ 本名・住所・最寄り駅・電話番号・メールアドレスを入力してください
                </p>
              )}
            </>
          )}
        </div>

      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => save(contractAgreedAt)} disabled={saving}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 48px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '保存中...' : '保存する'}
        </button>
        {saved && (
          <span style={{ fontSize: 14, color: '#388e3c', fontWeight: 600 }}>✓ 保存しました</span>
        )}
      </div>
    </div>
  )
}
