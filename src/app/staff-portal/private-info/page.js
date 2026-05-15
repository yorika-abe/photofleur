'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const REQUIRED_FIELDS = ['real_name', 'phone', 'email', 'address', 'station']
const EMPTY_FORM = { real_name: '', phone: '', email: '', address: '', station: '', bank_name: '', branch_name: '', account_type: '普通', account_number: '', account_holder: '' }

const RULES_ARTICLES = [
  {
    title: '第1条（業務内容）',
    body: '受付スタッフは、PhotoFleur撮影会における以下の業務を担当します。\n\n・参加者受付・チェックイン対応\n・参加者およびモデルの誘導\n・問い合わせ対応\n・会場準備・片付け補助\n・その他、運営が依頼する付随業務',
  },
  {
    title: '第2条（集合・遅刻・欠勤について）',
    body: '1. スタッフは、原則として撮影開始15分前もしくはスタジオ予約時間までに指定場所へ集合するものとします。\n2. 到着後、運営へ集合確認の連絡を行ってください。\n3. 無断欠勤および無連絡遅刻は禁止とします。\n4. やむを得ず遅刻・欠勤する場合は、判明時点で速やかに運営へ連絡してください。\n5. 必要に応じて、運営より代替スタッフの調整を依頼する場合があります。',
  },
  {
    title: '第3条（キャンセルについて）',
    body: '1. スタッフ確定後のキャンセルは原則として控えてください。\n2. やむを得ない事情がある場合は、速やかに運営へ連絡してください。\n3. 悪質な直前キャンセルや無断欠勤が続く場合、今後の依頼を停止する場合があります。',
  },
  {
    title: '第4条（報酬について）',
    body: '1. 報酬は、業務委託契約に基づき、撮影会開催形式により異なり、1時間あたり1200円〜（税込）とします。\n2. 支払方法および詳細は個別に定めるものとします。\n3. 交通費支給の有無については、個別に定めるものとします。',
  },
  {
    title: '第5条（個人情報・秘密保持）',
    body: '1. 業務上知り得た参加者・モデル・運営関係者の個人情報を、第三者へ漏洩してはなりません。\n2. 業務中に知り得た運営情報・参加者情報・内部連絡内容等を外部へ公開することを禁止します。\n3. 本条は契約終了後も有効とします。',
  },
  {
    title: '第6条（SNS・写真投稿について）',
    body: '1. 撮影会参加者を特定できる情報の投稿を禁止します。\n2. 運営許可のない内部情報の公開を禁止します。\n3. 会場写真等を投稿する場合は、参加者・モデルのプライバシーに十分配慮してください。',
  },
  {
    title: '第7条（禁止事項）',
    body: '以下の行為を禁止します。\n\n・参加者・モデルへの迷惑行為\n・ナンパ・営業・勧誘行為\n・業務中の無断撮影\n・運営指示に従わない行為\n・運営を介さないモデルへの過度な私的連絡\n・撮影会ブランドイメージを著しく損なう行為',
  },
  {
    title: '第8条（契約解除）',
    body: '運営は、以下の場合スタッフ登録を解除できるものとします。\n\n・本規約への重大な違反\n・無断欠勤・遅刻の繰り返し\n・業務態度に問題がある場合\n・運営継続が困難と判断した場合',
  },
  {
    title: '第9条（本人確認）',
    body: '運営は、必要に応じて本人確認書類の提示を求める場合があります。',
  },
]

const CONTRACT_ARTICLES = [
  {
    title: '第1条（業務内容）',
    body: '甲は乙に対し、PhotoFleur撮影会における受付・案内・運営補助業務を委託し、乙はこれを受託する。',
  },
  {
    title: '第2条（契約形態）',
    body: '本契約は業務委託契約であり、雇用契約ではない。\n乙は自己の裁量により業務を遂行するものとし、甲乙間に雇用関係は発生しない。',
  },
  {
    title: '第3条（報酬）',
    body: '1. 甲は乙に対し、業務時間1時間あたり1200円（税込）の報酬を支払う。\n2. 支払方法は、当日現金払いもしくは業務終了後1週間以内の銀行振込とする。\n3. 振込手数料は甲の負担とする。',
  },
  {
    title: '第4条（秘密保持）',
    body: '乙は、業務上知り得た参加者・モデル・運営関係者の個人情報、内部情報を第三者へ漏洩してはならない。',
  },
  {
    title: '第5条（禁止事項）',
    body: '乙は以下の行為を行ってはならない。\n\n・無断欠勤\n・参加者・モデルへの迷惑行為\n・個人情報漏洩\n・SNS等への内部情報投稿\n・運営を介さないモデルへの過度な私的連絡\n・撮影会ブランドイメージを損なう行為',
  },
  {
    title: '第6条（契約解除）',
    body: '甲または乙は、相手方に重大な契約違反がある場合、本契約を解除できる。',
  },
  {
    title: '第7条（損害賠償）',
    body: '乙の故意または重大な過失により甲へ損害が発生した場合、乙はその損害を賠償するものとする。',
  },
  {
    title: '第8条（本人確認）',
    body: '甲は、必要に応じて乙へ本人確認書類の提示を求める場合がある。',
  },
  {
    title: '第9条（協議事項）',
    body: '本契約に定めのない事項については、甲乙協議の上解決する。',
  },
]

function DocModal({ title, subtitle, articles, footer, readOnly, agreedAt, onClose, onAgree, checkLabel }) {
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
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a3560' }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{subtitle}</div>}
            {readOnly && <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600, marginTop: 4 }}>✅ 締結済み・閲覧専用</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div
          onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true) }}
          style={{ overflowY: 'auto', padding: '24px', flex: 1, fontSize: 13, lineHeight: 2, color: '#333' }}
        >
          {!readOnly && <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>※ 最後までスクロールして内容をご確認ください</p>}
          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560' }}>{title}</h3>
          <p style={{ margin: '8px 0' }}><strong>PhotoFleur 撮影会</strong></p>
          {articles.map((a, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 14, marginBottom: 4 }}>{a.title}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>
            </div>
          ))}
          {footer && <div style={{ marginTop: 20, fontSize: 13, whiteSpace: 'pre-wrap', color: '#555' }}>{footer(today)}</div>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', background: '#f8fbff' }}>
          {readOnly ? (
            <button onClick={onClose} style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>閉じる</button>
          ) : (
            <>
              {!scrolled && <p style={{ fontSize: 12, color: '#1565c0', margin: '0 0 12px', fontWeight: 600 }}>↓ 最後までスクロールすると同意できます</p>}
              {scrolled && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a3560' }}>
                  <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  {checkLabel}
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
  const router = useRouter()
  const [liveData, setLiveData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rulesAgreedAt, setRulesAgreedAt] = useState(null)
  const [contractAgreedAt, setContractAgreedAt] = useState(null)
  const [pendingChanges, setPendingChanges] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showContract, setShowContract] = useState(false)
  const [pendingRulesAt, setPendingRulesAt] = useState(null)
  const [message, setMessage] = useState('')

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
      bank_name: src.bank_name || '',
      branch_name: src.branch_name || '',
      account_type: src.account_type || '普通',
      account_number: src.account_number || '',
      account_holder: src.account_holder || '',
    })
    setRulesAgreedAt(data.rules_agreed_at || null)
    setContractAgreedAt(data.contract_agreed_at || null)
    setPendingChanges(data.pending_changes || null)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  function handleFirstSave() {
    const missing = REQUIRED_FIELDS.filter(k => !form[k])
    if (missing.length > 0) { setMessage('必須項目をすべて入力してください'); return }
    setShowRules(true)
  }

  function handleAgreeRules() {
    const now = new Date().toISOString()
    setPendingRulesAt(now)
    setShowRules(false)
    setShowContract(true)
  }

  async function handleAgreeContract() {
    setShowContract(false)
    setSaving(true)
    const rulesAt = pendingRulesAt || new Date().toISOString()
    const contractAt = new Date().toISOString()
    const res = await fetch('/api/staff-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rules_agreed_at: rulesAt, contract_agreed_at: contractAt }),
    })
    setSaving(false)
    if (res.ok) { router.push('/staff-portal/guide') }
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

  const contractFooter = (today) =>
    `契約締結日：${today}\n\n【甲】\nPhotoFleur\n代表　阿部依花\n\n【乙】\n氏名：${liveData?.real_name || form.real_name || '＿＿＿＿＿'}\n住所：${liveData?.address || form.address || '＿＿＿＿＿'}`

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 16px' }}>
      {showRules && (
        <DocModal
          title="PhotoFleur 受付スタッフ規約"
          articles={RULES_ARTICLES}
          readOnly={false}
          onClose={() => setShowRules(false)}
          onAgree={handleAgreeRules}
          checkLabel="上記のスタッフ規約に同意します"
        />
      )}
      {showContract && (
        <DocModal
          title="PhotoFleur 業務委託契約書"
          subtitle="PhotoFleur（甲）と受付スタッフ（乙）"
          articles={CONTRACT_ARTICLES}
          footer={contractFooter}
          readOnly={false}
          onClose={() => setShowContract(false)}
          onAgree={handleAgreeContract}
          checkLabel="上記の業務委託契約書に同意します"
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
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>基本情報を登録してください</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="本名" required value={form.real_name} editing onChange={v => setForm(f => ({ ...f, real_name: v }))} placeholder="山田 太郎" />
            <Field label="電話番号" required value={form.phone} editing onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="090-0000-0000" />
            <Field label="メールアドレス" required value={form.email} editing onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="example@email.com" />
            <Field label="住所" required value={form.address} editing onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="東京都○○区○○" />
            <Field label="最寄り駅" required value={form.station} editing onChange={v => setForm(f => ({ ...f, station: v }))} placeholder="○○駅" />
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 14 }}>振込先情報</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="銀行名" value={form.bank_name} editing onChange={v => setForm(f => ({ ...f, bank_name: v }))} placeholder="○○銀行" />
              <Field label="支店名" value={form.branch_name} editing onChange={v => setForm(f => ({ ...f, branch_name: v }))} placeholder="○○支店" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>口座種別</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['普通', '当座'].map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input type="radio" name="account_type_new" value={t} checked={form.account_type === t} onChange={() => setForm(f => ({ ...f, account_type: t }))} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <Field label="口座番号" value={form.account_number} editing onChange={v => setForm(f => ({ ...f, account_number: v }))} placeholder="1234567" />
              <Field label="口座名義（カナ）" value={form.account_holder} editing onChange={v => setForm(f => ({ ...f, account_holder: v }))} placeholder="ヤマダ タロウ" />
            </div>
          </div>
          <button onClick={handleFirstSave} disabled={saving}
            style={{ width: '100%', marginTop: 24, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {saving ? '保存中...' : '情報を確認して規約・契約書に同意する →'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', margin: 0 }}>登録情報</h2>
              {!editing && (
                <button onClick={() => { setEditing(true); setForm({ real_name: liveData.real_name || '', phone: liveData.phone || '', email: liveData.email || '', address: liveData.address || '', station: liveData.station || '', bank_name: liveData.bank_name || '', branch_name: liveData.branch_name || '', account_type: liveData.account_type || '普通', account_number: liveData.account_number || '', account_holder: liveData.account_holder || '' }); setMessage('') }}
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
            </div>
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 14 }}>振込先情報</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="銀行名" value={editing ? form.bank_name : (liveData.bank_name || '')} editing={editing} onChange={v => setForm(f => ({ ...f, bank_name: v }))} placeholder="○○銀行" />
                <Field label="支店名" value={editing ? form.branch_name : (liveData.branch_name || '')} editing={editing} onChange={v => setForm(f => ({ ...f, branch_name: v }))} placeholder="○○支店" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>口座種別</div>
                  {editing ? (
                    <div style={{ display: 'flex', gap: 12 }}>
                      {['普通', '当座'].map(t => (
                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                          <input type="radio" name="account_type_edit" value={t} checked={form.account_type === t} onChange={() => setForm(f => ({ ...f, account_type: t }))} />
                          {t}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '10px 12px', background: '#f5f7fa', borderRadius: 8, fontSize: 14, color: liveData.account_type ? '#1a3560' : '#bbb', fontWeight: liveData.account_type ? 600 : 400, minHeight: 42, display: 'flex', alignItems: 'center' }}>
                      {liveData.account_type || '未入力'}
                    </div>
                  )}
                </div>
                <Field label="口座番号" value={editing ? form.account_number : (liveData.account_number || '')} editing={editing} onChange={v => setForm(f => ({ ...f, account_number: v }))} placeholder="1234567" />
                <Field label="口座名義（カナ）" value={editing ? form.account_holder : (liveData.account_holder || '')} editing={editing} onChange={v => setForm(f => ({ ...f, account_holder: v }))} placeholder="ヤマダ タロウ" />
              </div>
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

          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 2 }}>PhotoFleur 受付スタッフ規約</div>
                {rulesAgreedAt
                  ? <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600 }}>✅ 締結済み（{new Date(rulesAgreedAt).toLocaleDateString('ja-JP')}）</div>
                  : <div style={{ fontSize: 12, color: '#e53935', fontWeight: 600 }}>⚠️ 未締結</div>}
              </div>
              <button onClick={() => setShowRules(true)}
                style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
                {rulesAgreedAt ? '規約を確認する →' : '確認する'}
              </button>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 2 }}>PhotoFleur 業務委託契約書</div>
                {contractAgreedAt
                  ? <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600 }}>✅ 締結済み（{new Date(contractAgreedAt).toLocaleDateString('ja-JP')}）</div>
                  : <div style={{ fontSize: 12, color: '#e53935', fontWeight: 600 }}>⚠️ 未締結</div>}
              </div>
              <button onClick={() => setShowContract(true)}
                style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
                {contractAgreedAt ? '契約書を確認する →' : '確認する'}
              </button>
            </div>
            {showRules && (
              <DocModal
                title="PhotoFleur 受付スタッフ規約"
                articles={RULES_ARTICLES}
                readOnly={!!rulesAgreedAt}
                agreedAt={rulesAgreedAt}
                onClose={() => setShowRules(false)}
                onAgree={() => setShowRules(false)}
                checkLabel="上記のスタッフ規約に同意します"
              />
            )}
            {showContract && (
              <DocModal
                title="PhotoFleur 業務委託契約書"
                subtitle="PhotoFleur（甲）と受付スタッフ（乙）"
                articles={CONTRACT_ARTICLES}
                footer={contractFooter}
                readOnly={!!contractAgreedAt}
                agreedAt={contractAgreedAt}
                onClose={() => setShowContract(false)}
                onAgree={() => setShowContract(false)}
                checkLabel="上記の業務委託契約書に同意します"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
