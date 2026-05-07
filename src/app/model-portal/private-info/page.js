'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const REQUIRED_FIELDS = ['real_name', 'address', 'station', 'phone', 'email']
const EMPTY_FORM = { real_name: '', address: '', station: '', agency: '', phone: '', email: '', school_company: '', guardian_name: '' }

function ContractModal({ form, onClose, onAgree, readOnly, agreedAt }) {
  const today = agreedAt
    ? new Date(agreedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const [scrolled, setScrolled] = useState(readOnly)
  const [checked, setChecked] = useState(false)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a3560' }}>業務委託契約書・肖像権使用同意書</h2>
            {readOnly && <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600, marginTop: 4 }}>✅ 締結済み・閲覧専用</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div
          onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true) }}
          style={{ overflowY: 'auto', padding: '24px', flex: 1, fontSize: 13, lineHeight: 2, color: '#333' }}
        >
          <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>※ 最後までスクロールして内容をご確認ください</p>

          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560' }}>① 業務委託契約書</h3>
          <p><strong>契約日：</strong>{today}<br /><strong>依頼者（甲）：</strong>PhotoFleur</p>
          <p><strong>モデル（乙）</strong><br />氏名：{form.real_name}<br />住所：{form.address}<br />電話番号：{form.phone}</p>
          <p><strong>第1条（契約の目的）</strong><br />甲は乙に対し、撮影会におけるモデル業務を委託し、乙はこれを受託する。</p>
          <p><strong>第2条（業務内容）</strong><br />・撮影日時：不定期で開催される撮影会の日時<br />・場所：不定期で開催される撮影会の開催場所<br />・業務内容：撮影会へのモデル出演</p>
          <p><strong>第3条（報酬）</strong><br />・報酬金額：￥最低3,000円/時間（税込）変動あり<br />・支払方法：当日現金</p>
          <p><strong>第4条（肖像権と著作権）</strong><br />乙は、甲または甲の許可した者が撮影した写真を、商業的または非商業的に使用することに同意する。</p>
          <p><strong>第5条（禁止事項）</strong><br />別紙で指定する当撮影会の規約を違反する行為を禁止する。発覚した場合直ちに登録解除とするとともに当撮影会に被害が被った場合それと同等以上の請求をするものとする。</p>
          <p><strong>第6条（契約の解除）</strong><br />天災、病気、その他やむを得ない理由を除き、乙は契約を解除できない。</p>
          {form.guardian_name && <p><strong>保護者氏名：</strong>{form.guardian_name}</p>}
          <p>甲署名：photofleur撮影会主催 阿部依花<br />乙署名：{form.real_name}<br />住所：{form.address}</p>

          <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid #1a3560', paddingBottom: 6, color: '#1a3560', marginTop: 32 }}>② 肖像権使用同意書</h3>
          <p>電話番号：{form.phone}</p>
          <p>私は、PhotoFleur撮影会において撮影されるすべての写真・動画について、以下の条件に同意します。<br />・使用目的：SNS、Webサイト、広告宣伝、印刷物など<br />・使用範囲：国内外問わず<br />・使用期間：無期限<br />・使用料：撮影報酬に含むものとする</p>
          <p>署名：{form.real_name}<br />日付：{today}</p>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', background: '#f8fbff' }}>
          {readOnly ? (
            <button onClick={onClose} style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              閉じる
            </button>
          ) : (
            <>
              {!scrolled && <p style={{ fontSize: 12, color: '#e65100', margin: '0 0 12px', fontWeight: 600 }}>↓ 最後までスクロールすると同意できます</p>}
              {scrolled && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a3560' }}>
                  <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  上記の業務委託契約書および肖像権使用同意書に同意します
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

const RULES_ARTICLES = [
  { title: '第1条（掛け持ちの禁止）', body: '他撮影会との掛け持ちは禁止とします。' },
  { title: '第2条（カメラマンとの個別接触の禁止）', body: '撮影会に参加されたカメラマンと、撮影会外で個人的に会い、直接撮影を受ける行為を禁止します。\n※撮影会の運営維持のため、厳守してください。' },
  { title: '第3条（作品撮りの例外）', body: '同年代の友人関係にある方との、私的な作品撮り（食事や交流を伴うもの）は許可します。\n※営利目的や継続的な撮影は対象外とします。' },
  { title: '第4条（写真の利用について）', body: '撮影会で撮影された写真の二次利用（販売・他媒体への提供等）は禁止します。\nただし、個人のSNSでの使用は可能とします。' },
  { title: '第5条（キャンセルについて）', body: '撮影枠に予約が入った後のキャンセルは原則できません。やむを得ない場合を除き、責任を持って対応してください。' },
  { title: '第6条（情報漏洩の禁止）', body: '報酬や運営内容など、撮影会の内部情報を外部へ漏らす行為を禁止します。' },
  { title: '第7条（欠勤について）', body: '当日の無断欠勤は禁止とします。\n事前連絡がある場合でも、当日欠勤が継続する場合は登録解除の対象となります。' },
  { title: '第8条（活動制限）', body: 'ラウンジ、キャバクラ等の水商売での勤務をされている方の登録はお断りしております。' },
  { title: '第9条（勧誘行為の禁止）', body: '他コミュニティ、団体、事業への勧誘行為を禁止します。\n違反が確認された場合、必要に応じて法的措置を検討します。' },
  { title: '第10条（将来的な起用について）', body: '当撮影会では、今後アパレル事業等の展開を予定しており、専属モデルとしてスカウトさせていただく可能性があります。' },
  { title: '第11条（衣装および表現の禁止）', body: 'モデルは、以下に該当する衣装・表現での撮影活動を一切行ってはなりません。\n・水着（ビキニ、ワンピース水着等すべてを含む）\n・過度な露出のあるコスプレ衣装\n・下着、または下着と誤認される可能性のある衣装\n・過度な露出を伴う服装（胸部・臀部・腹部等の露出が大きいもの）\n・性的表現を含む撮影およびコンテンツ' },
  { title: '第12条（適用範囲）', body: '上記は撮影会内外、媒体（SNS公開アカウント・個人活動含む）を問わず適用されます。' },
  { title: '第13条（違反時の措置）', body: '本条項に違反した場合、登録解除とさせていただく場合があります。' },
]

function RulesModal({ onClose, onAgree, readOnly, agreedAt }) {
  const [scrolled, setScrolled] = useState(readOnly)
  const [checked, setChecked] = useState(false)
  const agreedDate = agreedAt
    ? new Date(agreedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a3560' }}>フォトフルール モデル登録規約</h2>
            {readOnly && <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600, marginTop: 4 }}>✅ 同意済み・閲覧専用</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div
          onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true) }}
          style={{ overflowY: 'auto', padding: '24px', flex: 1, fontSize: 13, lineHeight: 2, color: '#333' }}
        >
          {!readOnly && <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>※ 最後までスクロールして内容をご確認ください</p>}
          {RULES_ARTICLES.map((a, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 14, marginBottom: 4 }}>{a.title}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>
            </div>
          ))}
          {agreedDate && <p style={{ color: '#555', fontSize: 12, marginTop: 16 }}>同意日：{agreedDate}</p>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', background: '#f8fbff' }}>
          {readOnly ? (
            <button onClick={onClose} style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              閉じる
            </button>
          ) : (
            <>
              {!scrolled && <p style={{ fontSize: 12, color: '#e65100', margin: '0 0 12px', fontWeight: 600 }}>↓ 最後までスクロールすると同意できます</p>}
              {scrolled && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a3560' }}>
                  <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  上記の撮影会規約に同意します
                </label>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>キャンセル</button>
                <button onClick={() => checked && onAgree()} disabled={!checked}
                  style={{ flex: 2, background: checked ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', cursor: checked ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}>
                  同意する
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
        <input
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <div style={{ padding: '10px 12px', background: '#f5f7fa', borderRadius: 8, fontSize: 14, color: value ? '#1a3560' : '#bbb', fontWeight: value ? 600 : 400, minHeight: 42, display: 'flex', alignItems: 'center' }}>
          {value || '未入力'}
        </div>
      )}
    </div>
  )
}

export default function PrivateInfoPage() {
  const [liveData, setLiveData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [contractAgreedAt, setContractAgreedAt] = useState(null)
  const [rulesAgreedAt, setRulesAgreedAt] = useState(null)
  const [pendingChanges, setPendingChanges] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showContract, setShowContract] = useState(null) // null | 'view' | 'agree'
  const [showRules, setShowRules] = useState(null) // null | 'view' | 'agree'
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    fetch('/api/model-portal/private-info').then(r => r.json()).then(data => {
      if (data && !data.error) {
        const live = {
          real_name: data.real_name || '', address: data.address || '',
          station: data.station || '', agency: data.agency || '',
          phone: data.phone || '', email: data.email || '',
          school_company: data.school_company || '', guardian_name: data.guardian_name || '',
        }
        setLiveData(live)
        setForm(live)
        setContractAgreedAt(data.contract_agreed_at || null)
        setRulesAgreedAt(data.rules_agreed_at || null)
        setPendingChanges(data.pending_changes || null)
      }
      setLoading(false)
    })
  }, [])

  const isLocked = !!contractAgreedAt
  const isEditing = !isLocked || editMode
  const canAgree = REQUIRED_FIELDS.every(f => form[f]?.trim())

  async function saveInitial() {
    setSaving(true)
    await fetch('/api/model-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form }),
    })
    setLiveData({ ...form })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleAgree() {
    const now = new Date().toISOString()
    setSaving(true)
    await fetch('/api/model-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, contract_agreed_at: now }),
    })
    setLiveData({ ...form })
    setContractAgreedAt(now)
    setShowContract(false)
    setSaving(false)
  }

  async function handleAgreeRules() {
    const now = new Date().toISOString()
    setSaving(true)
    await fetch('/api/model-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rules_agreed_at: now }),
    })
    setRulesAgreedAt(now)
    setShowRules(null)
    setSaving(false)
  }

  async function submitChangeRequest() {
    setSaving(true)
    await fetch('/api/model-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_changes: form }),
    })
    setPendingChanges({ ...form })
    setForm({ ...liveData })
    setEditMode(false)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function cancelEdit() {
    setForm({ ...liveData })
    setEditMode(false)
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      {showContract && <ContractModal form={form} onClose={() => setShowContract(null)} onAgree={handleAgree} readOnly={showContract === 'view'} agreedAt={contractAgreedAt} />}
      {showRules && <RulesModal onClose={() => setShowRules(null)} onAgree={handleAgreeRules} readOnly={showRules === 'view'} agreedAt={rulesAgreedAt} />}

      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデルポータル</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 6px' }}>非公開登録情報</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>この情報はモデル様と運営のみが閲覧できます。ホームページには一切表示されません。</p>

      {/* 変更申請中バナー */}
      {pendingChanges && (
        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#1565c0' }}>
          <strong>📋 変更申請中</strong><br />
          変更申請を受け付けました。運営が確認次第、情報を更新します。
        </div>
      )}

      {!isLocked && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#795548' }}>
          <strong>⚠️ 必須情報について</strong><br />
          本名・住所・最寄り駅・電話番号・メールアドレスを入力のうえ、業務委託契約に同意してください。
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 基本情報 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', margin: 0 }}>基本情報</h2>
            {isLocked && !editMode && !pendingChanges && (
              <button onClick={() => setEditMode(true)}
                style={{ background: 'none', border: '1px solid #1a3560', color: '#1a3560', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                変更を申請する
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="本名" required value={form.real_name} editing={isEditing} onChange={v => setForm(f => ({ ...f, real_name: v }))} placeholder="山田 花子" />
            <Field label="住所" required value={form.address} editing={isEditing} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="東京都渋谷区..." />
            <Field label="最寄り駅" required value={form.station} editing={isEditing} onChange={v => setForm(f => ({ ...f, station: v }))} placeholder="渋谷駅" />
            <Field label="電話番号" required value={form.phone} editing={isEditing} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="090-0000-0000" />
            <Field label="メールアドレス（ログイン用）" required value={form.email} editing={isEditing} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="example@email.com" />
          </div>
        </div>

        {/* 追加情報 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>追加情報</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="事務所名（所属している場合）" value={form.agency} editing={isEditing} onChange={v => setForm(f => ({ ...f, agency: v }))} placeholder="〇〇プロダクション" />
            <Field label="学校名または会社名（任意）" value={form.school_company} editing={isEditing} onChange={v => setForm(f => ({ ...f, school_company: v }))} placeholder="〇〇大学 / 〇〇株式会社" />
            <Field label="保護者名（未成年の場合）" value={form.guardian_name} editing={isEditing} onChange={v => setForm(f => ({ ...f, guardian_name: v }))} placeholder="山田 太郎" />
          </div>
        </div>

        {/* 業務委託契約同意 */}
        <div style={{ background: '#fff', border: contractAgreedAt ? '2px solid #a5d6a7' : '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 12 }}>業務委託契約・肖像権使用同意</h2>
          {contractAgreedAt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#e8f5e9', borderRadius: 10, padding: '16px 20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 36 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 16 }}>契約締結済み</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  締結日：{new Date(contractAgreedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => setShowContract('view')}
                style={{ background: '#fff', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                契約書を確認する →
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 16 }}>
                業務委託契約書および肖像権使用同意書への同意が必要です。<br />
                <strong>必須情報をすべて入力してから</strong>同意画面をお開きください。
              </p>
              <button onClick={() => canAgree ? setShowContract('agree') : null} disabled={!canAgree}
                style={{ background: canAgree ? '#1a3560' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: canAgree ? 'pointer' : 'not-allowed' }}>
                契約書・同意書を確認して締結する
              </button>
              {!canAgree && <p style={{ fontSize: 12, color: '#e53935', marginTop: 8 }}>※ 本名・住所・最寄り駅・電話番号・メールアドレスを入力してください</p>}
            </>
          )}
        </div>

        {/* 撮影会規約同意 */}
        <div style={{ background: '#fff', border: rulesAgreedAt ? '2px solid #a5d6a7' : '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 12 }}>撮影会規約への同意</h2>
          {rulesAgreedAt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#e8f5e9', borderRadius: 10, padding: '16px 20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 36 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 16 }}>同意済み</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  同意日：{new Date(rulesAgreedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => setShowRules('view')}
                style={{ background: '#fff', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                規約を確認する →
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 16 }}>
                フォトフルール モデル登録規約への同意が必要です。
              </p>
              <button onClick={() => setShowRules('agree')}
                style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                規約を確認して同意する
              </button>
            </>
          )}
        </div>

      </div>

      {/* モデル登録を進める */}
      {contractAgreedAt && rulesAgreedAt && (
        <div style={{ marginTop: 8, background: '#f0f7ff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>契約・規約の同意が完了しました</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>次のステップに進んでください</div>
          </div>
          <a href="/model-portal/stage-name"
            style={{ display: 'inline-block', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14 }}>
            モデル登録を進める →
          </a>
        </div>
      )}

      {/* アクションボタン */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isLocked && (
          <>
            <button onClick={saveInitial} disabled={saving}
              style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 40px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '保存中...' : '保存する'}
            </button>
            {saved && <span style={{ fontSize: 14, color: '#388e3c', fontWeight: 600 }}>✓ 保存しました</span>}
          </>
        )}
        {isLocked && editMode && (
          <>
            <button onClick={submitChangeRequest} disabled={saving}
              style={{ background: '#1565c0', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 40px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '送信中...' : '変更申請を送信する'}
            </button>
            <button onClick={cancelEdit} style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 10, padding: '14px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              キャンセル
            </button>
            {saved && <span style={{ fontSize: 14, color: '#388e3c', fontWeight: 600 }}>✓ 変更申請を送信しました</span>}
          </>
        )}
      </div>
    </div>
  )
}
