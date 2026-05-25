'use client'
import { useState, useEffect } from 'react'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://photofleur.vercel.app'

const DEFAULT_DECLINE_MSG = `この度はリクエスト撮影をご希望いただき、誠にありがとうございます🤍

大変申し訳ございませんが、いただきました日程ではスケジュールの調整が難しく、
今回はご希望に添うことができませんでした🙇🏻‍♀️

せっかくご連絡いただいたにも関わらず申し訳ございません…！

もしよろしければ、また別日程にて改めてご検討いただけますと幸いです🌸
今後ともどうぞよろしくお願いいたします✨`

const STATUS_LABELS = { available: '参加可能', time_specified: '時間指定', unavailable: '不可' }
const STATUS_COLORS = { available: '#2e7d32', time_specified: '#e65100', unavailable: '#c62828' }

function getHourlyRate(studioPrice) {
  return parseInt(studioPrice || 0)
}

function getModelManagementRate(priceTier) {
  if (priceTier === '12000') return 4000
  if (priceTier === '9900') return 3500
  if (priceTier === '8900') return 3000
  return 0  // 運営モデル
}

function addHours(timeStr, hours) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const totalMin = h * 60 + m + Math.round(hours * 60)
  const eh = Math.floor(totalMin / 60) % 24
  const em = totalMin % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

function findOverlapDates(modelResponses, preferences) {
  return preferences.map(pref => {
    const statuses = modelResponses.map(mr => {
      const r = mr.responses.find(r => r.preference_order === pref.preference_order)
      return r ? r.status : null
    }).filter(Boolean)
    const canAll = statuses.every(s => s === 'available' || s === 'time_specified')
    return { pref, canAll }
  })
}

function computeConstrainedRange(pref, modelResponses, staffAvailableDates) {
  const [prefStart, prefEnd] = (pref.time_range || '').split('〜')
  // モデル制約を計算
  const responses = modelResponses.map(mr => mr.responses.find(r => r.preference_order === pref.preference_order)).filter(Boolean)
  const canAll = responses.every(r => r.status === 'available' || r.status === 'time_specified')
  if (!canAll) return { valid: false, time_range: pref.time_range, reason: '参加不可のモデルあり' }
  const allAvailable = responses.every(r => r.status === 'available')
  let modelFrom = prefStart, modelUntil = prefEnd
  if (!allAvailable) {
    const froms = responses.filter(r => r.available_from).map(r => r.available_from)
    const untils = responses.filter(r => r.available_until).map(r => r.available_until)
    const rawFrom = froms.length > 0 ? froms.sort().at(-1) : prefStart
    const rawUntil = untils.length > 0 ? untils.sort()[0] : prefEnd
    modelFrom = rawFrom > prefStart ? rawFrom : prefStart
    modelUntil = rawUntil < prefEnd ? rawUntil : prefEnd
  }
  // スタッフ制約を計算
  let intersectFrom = modelFrom, intersectUntil = modelUntil
  let staffUnavailable = false
  if (staffAvailableDates?.length > 0) {
    const staffEntry = staffAvailableDates.find(d => (d?.date || d) === pref.preferred_date)
    if (!staffEntry) { staffUnavailable = true }
    else if (staffEntry.from || staffEntry.until) {
      const sf = staffEntry.from || modelFrom
      const su = staffEntry.until || modelUntil
      intersectFrom = sf > modelFrom ? sf : modelFrom
      intersectUntil = su < modelUntil ? su : modelUntil
    }
  }
  if (staffUnavailable) return { valid: false, time_range: pref.time_range, reason: 'スタッフ不参加' }
  // 時間幅チェック
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const diffMin = toMin(intersectUntil) - toMin(intersectFrom)
  if (diffMin < pref.duration_hours * 60) return { valid: false, time_range: `${intersectFrom}〜${intersectUntil}`, reason: '時間不足' }
  const hasAdjusted = intersectFrom !== prefStart || intersectUntil !== prefEnd
  return { valid: true, time_range: `${intersectFrom}〜${intersectUntil}`, hasAdjusted }
}

function initPriceComponents(app, pref) {
  const hours = Number(pref?.duration_hours || 0)
  return {
    modelFees: app.model_responses.map(mr => ({
      model_id: mr.model_id,
      name: mr.models?.name || '',
      hourlyRate: getHourlyRate(mr.models?.studio_price),
      fee: getHourlyRate(mr.models?.studio_price) * hours,
      managementRate: getModelManagementRate(mr.models?.price_tier),
      managementFee: getModelManagementRate(mr.models?.price_tier) * hours,
    })),
    staffFeePerHour: 1000,
    staffFeeTotal: 1000 * hours,
    modelTransport: app.model_responses.map(mr => ({
      model_id: mr.model_id,
      name: mr.models?.name || '',
      fee: mr.responses.find(r => r.transport_fee)?.transport_fee || 0,
    })),
    staffTransport: 0,
    hours,
  }
}

function PriceRow({ label, value, onChange, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eef4f8' }}>
      <span style={{ flex: 1, fontSize: 12, color: '#556070' }}>{label}</span>
      {note && <span style={{ fontSize: 11, color: '#aaa' }}>{note}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 12 }}>¥</span>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #d0e4f0', fontSize: 13, textAlign: 'right' }} />
      </div>
    </div>
  )
}

function ApplicationCard({ app, onUpdate }) {
  const [lineMsg, setLineMsg] = useState(DEFAULT_DECLINE_MSG)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  // 確定フロー
  const [selectedPrefOrder, setSelectedPrefOrder] = useState(null)
  const [actualStartTime, setActualStartTime] = useState('')
  const [productTitle, setProductTitle] = useState('')
  const [priceComp, setPriceComp] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('both')
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)

  const isPending = ['pending', 'notified'].includes(app.status)
  const isResponded = app.all_responded
  const isStaffRecruiting = app.status === 'staff_recruiting'
  const isConfirmed = app.status === 'confirmed'
  const isDeclined = app.status === 'declined'

  const overlaps = isResponded ? findOverlapDates(app.model_responses, app.preferences) : []

  // スタッフ募集
  const defaultChecked = isResponded ? new Set(overlaps.filter(o => o.canAll).map(o => o.pref.preference_order)) : new Set()
  const [staffRecruitCheckedOrders, setStaffRecruitCheckedOrders] = useState(defaultChecked)
  const [addingStaff, setAddingStaff] = useState(false)
  const [staffRecruitResult, setStaffRecruitResult] = useState(null)

  // 選択された希望日が変わったら料金を初期化
  useEffect(() => {
    if (!selectedPrefOrder) return
    const pref = app.preferences.find(p => p.preference_order === selectedPrefOrder)
    if (!pref) return
    const comp = initPriceComponents(app, pref)
    setPriceComp(comp)
    setActualStartTime('')
    const modelNames = app.model_responses.map(mr => mr.models?.name || '').join('・')
    setProductTitle(`${pref.preferred_date} ${modelNames} リクエスト撮影`)
  }, [selectedPrefOrder])

  const totalPrice = priceComp
    ? priceComp.modelFees.reduce((s, m) => s + m.fee, 0)
      + priceComp.staffFeeTotal
      + priceComp.modelTransport.reduce((s, m) => s + m.fee, 0)
      + priceComp.staffTransport
    : 0

  const managementCost = priceComp
    ? priceComp.modelFees.reduce((s, m) => s + m.managementFee, 0)
      + (isStaffRecruiting ? 1200 : 0)
      + priceComp.modelTransport.reduce((s, m) => s + m.fee, 0)
      + priceComp.staffTransport
    : 0

  async function sendLine() {
    if (!lineMsg.trim()) return
    setSending(true); setSendResult(null)
    try {
      const res = await fetch('/api/admin/line-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'customer_individual', customer_user_id: app.user_id, message: lineMsg }),
      })
      const json = await res.json()
      setSendResult(json.ok ? '送信しました' : `エラー: ${json.error}`)
      if (json.ok) {
        await fetch('/api/admin/request-applications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: app.id, status: 'declined' }),
        })
        onUpdate()
      }
    } catch { setSendResult('通信エラー') }
    setSending(false)
  }

  async function addToStaffRecruit() {
    setAddingStaff(true); setStaffRecruitResult(null)
    try {
      const modelIds = app.model_responses.map(mr => mr.model_id)
      const checkedPrefs = app.preferences.filter(p => staffRecruitCheckedOrders.has(p.preference_order))

      const recruitDates = checkedPrefs.map(pref => {
        const responses = app.model_responses.map(mr => mr.responses.find(r => r.preference_order === pref.preference_order)).filter(Boolean)
        const allAvailable = responses.every(r => r.status === 'available')
        let time_range
        if (allAvailable) {
          time_range = pref.time_range
        } else {
          const [prefStart, prefEnd] = pref.time_range.split('〜')
          const froms = responses.filter(r => r.available_from).map(r => r.available_from)
          const untils = responses.filter(r => r.available_until).map(r => r.available_until)
          const rawFrom = froms.length > 0 ? froms.sort().at(-1) : prefStart
          const rawUntil = untils.length > 0 ? untils.sort()[0] : prefEnd
          const maxFrom = rawFrom > prefStart ? rawFrom : prefStart
          const minUntil = rawUntil < prefEnd ? rawUntil : prefEnd
          time_range = `${maxFrom}〜${minUntil}`
        }
        return { date: pref.preferred_date, time_range, duration_hours: pref.duration_hours }
      })

      await fetch('/api/admin/request-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status: 'staff_recruiting' }),
      })
      await fetch('/api/admin/staff-recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{
            type: 'custom',
            shoot_type: 'request',
            recruit_date: null,
            location: app.location || '未定',
            shoot_time: null,
            model_ids: modelIds,
            capacity: 1,
            recruit_dates: recruitDates,
            photographer_name: `${app.last_name}${app.first_name}`,
            photographer_nickname: app.nickname,
            photographer_sns: app.sns_url,
            payment_status: '未定',
            request_application_id: app.id,
          }],
        }),
      })
      setStaffRecruitResult('スタッフ募集日に追加しました')
      onUpdate()
    } catch { setStaffRecruitResult('エラーが発生しました') }
    setAddingStaff(false)
  }

  async function confirmApplication() {
    if (!selectedPrefOrder) return alert('確定する日程を選択してください')
    if (!actualStartTime) return alert('実際の開始時刻を入力してください')
    if (!priceComp) return
    setConfirming(true); setConfirmResult(null)
    try {
      const pref = app.preferences.find(p => p.preference_order === selectedPrefOrder)
      const endTime = addHours(actualStartTime, Number(pref.duration_hours))
      const actualTimeRange = `${actualStartTime}〜${endTime}`
      const modelIds = app.model_responses.map(mr => mr.model_id)
      const firstModelImage = app.model_responses[0]?.models?.image || null

      const productRes = await fetch('/api/admin/private-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: productTitle,
          price: totalPrice,
          model_ids: modelIds,
          event_date: pref.preferred_date,
          time_label: actualTimeRange,
          stock: 1,
          image: firstModelImage,
          payment_method: paymentMethod,
          description: `リクエスト撮影\n場所: ${app.location}\n時間: ${pref.duration_hours}時間`,
        }),
      })
      const product = await productRes.json()
      if (!product.token) {
        setConfirmResult(`商品作成エラー: ${product.error || '不明なエラー'}`)
        setConfirming(false)
        return
      }

      await fetch('/api/admin/request-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status: 'confirmed', private_product_token: product.token }),
      })

      const modelNames = app.model_responses.map(mr => mr.models?.name || '').join('・')
      const bookingUrl = `${SITE_URL}/p/${product.token}`
      const confirmMsg = `【リクエスト撮影が確定しました】\n\nこの度はリクエスト撮影をご希望くださりありがとうございます。\n撮影日が確定しましたのでご確認ください。\n📅${pref.preferred_date} ${actualTimeRange}\n📍${app.location}\n👤${modelNames}\n⏰${pref.duration_hours}時間\n\n以下のリンクよりお支払いに関してご確認ください。\n🔗${bookingUrl}`
      await fetch('/api/admin/line-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'customer_individual', customer_user_id: app.user_id, message: confirmMsg }),
      })

      setConfirmResult('確定しました！LINEを送信しました。')
      onUpdate()
    } catch { setConfirmResult('エラーが発生しました') }
    setConfirming(false)
  }

  const cardBg = isConfirmed ? '#f1f8f1' : isDeclined ? '#fafafa' : '#fff'
  const borderColor = isConfirmed ? '#c8e6c9' : isDeclined ? '#eee' : '#d6ecf5'

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '20px', marginBottom: 16, opacity: isDeclined ? 0.7 : 1 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3560' }}>
            {app.last_name} {app.first_name}（{app.nickname}）
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{app.email} / {app.phone}</div>
          <div style={{ fontSize: 12, color: '#1a3560', marginTop: 2 }}>🔗 {app.sns_url}</div>
          <div style={{ fontSize: 12, color: '#1a3560', marginTop: 4 }}>
            {app.model_responses.map(mr => `👤 ${mr.models?.name || ''}`).join('　')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {app.model_responses
            .filter(mr => !isPending || !mr.responses?.length)
            .map(mr => (
              <span key={mr.model_id} style={{ fontSize: 11, background: '#e8f0fe', color: '#1a3560', borderRadius: 20, padding: '3px 10px', fontWeight: 700 }}>
                {mr.models?.name}
              </span>
            ))}
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: isConfirmed ? '#e8f5e9' : isDeclined ? '#fafafa' : isStaffRecruiting ? '#f3e5f5' : isResponded ? '#fff3e0' : '#e3f2fd',
            color: isConfirmed ? '#2e7d32' : isDeclined ? '#999' : isStaffRecruiting ? '#6a1b9a' : isResponded ? '#e65100' : '#1565c0' }}>
            {isConfirmed ? '確定' : isDeclined ? '不可' : isStaffRecruiting ? 'スタッフ募集中' : isResponded ? 'モデル回答済み' : isPending ? 'モデル回答待ち' : app.status}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#556070', marginBottom: 10 }}>📍 {app.location}</div>
      {app.notes && <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>備考: {app.notes}</div>}

      {/* 希望日時とモデル回答 */}
      {isResponded && (
        <div style={{ background: '#f8fbff', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1a3560', margin: '0 0 8px' }}>モデル回答状況</p>
          {overlaps.map(({ pref, canAll }) => (
            <div key={pref.preference_order} style={{ padding: '8px 0', borderBottom: '1px solid #eef4f8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#556070' }}>
                  第{pref.preference_order}希望 {pref.preferred_date} {pref.time_range}（{pref.duration_hours}h）
                </span>
                {canAll && <span style={{ fontSize: 11, background: '#e8f5e9', color: '#2e7d32', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>全員OK</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {app.model_responses.map(mr => {
                  const r = mr.responses.find(r => r.preference_order === pref.preference_order)
                  return r ? (
                    <span key={mr.model_id} style={{ fontSize: 11, color: STATUS_COLORS[r.status] || '#888', fontWeight: 600 }}>
                      {mr.models?.name}: {STATUS_LABELS[r.status] || r.status}
                      {r.status === 'time_specified' && r.available_from ? ` (${r.available_from}〜${r.available_until})` : ''}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          ))}
          {/* 交通費 */}
          {app.model_responses.some(mr => mr.responses.some(r => r.transport_fee)) && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              {app.model_responses.map(mr => {
                const fee = mr.responses.find(r => r.transport_fee)?.transport_fee
                return fee ? (
                  <span key={mr.model_id} style={{ fontSize: 12, color: '#556070' }}>
                    {mr.models?.name} 交通費: ¥{fee.toLocaleString()}
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>
      )}

      {/* スタッフを募集する */}
      {isResponded && !isConfirmed && !isDeclined && (
        <div style={{ marginBottom: 12 }}>
          {!isStaffRecruiting ? (
            <div style={{ background: '#f5f0ff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e1d4f5' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6a1b9a', margin: '0 0 8px' }}>スタッフを募集する（複数日程同時募集）</p>
              <div style={{ marginBottom: 8 }}>
                {overlaps.map(({ pref, canAll }) => {
                  const responses = app.model_responses.map(mr => mr.responses.find(r => r.preference_order === pref.preference_order)).filter(Boolean)
                  const hasTimeSpec = responses.some(r => r.status === 'time_specified')
                  let timeDisplay = pref.time_range
                  if (hasTimeSpec) {
                    const [prefStart, prefEnd] = pref.time_range.split('〜')
                    const froms = responses.filter(r => r.available_from).map(r => r.available_from)
                    const untils = responses.filter(r => r.available_until).map(r => r.available_until)
                    const rawFrom = froms.length > 0 ? froms.sort().at(-1) : prefStart
                    const rawUntil = untils.length > 0 ? untils.sort()[0] : prefEnd
                    const maxFrom = rawFrom > prefStart ? rawFrom : prefStart
                    const minUntil = rawUntil < prefEnd ? rawUntil : prefEnd
                    timeDisplay = `${maxFrom}〜${minUntil}`
                  }
                  return (
                    <label key={pref.preference_order} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4, cursor: canAll ? 'pointer' : 'default', opacity: canAll ? 1 : 0.4 }}>
                      <input type="checkbox" disabled={!canAll}
                        checked={staffRecruitCheckedOrders.has(pref.preference_order)}
                        onChange={() => {
                          setStaffRecruitCheckedOrders(prev => {
                            const next = new Set(prev)
                            if (next.has(pref.preference_order)) next.delete(pref.preference_order)
                            else next.add(pref.preference_order)
                            return next
                          })
                        }} />
                      第{pref.preference_order}希望 {pref.preferred_date} {timeDisplay}
                      {hasTimeSpec && <span style={{ fontSize: 10, color: '#e65100' }}>（時間調整済み）</span>}
                      {!canAll && <span style={{ fontSize: 10, color: '#c62828' }}>（不可あり）</span>}
                    </label>
                  )
                })}
              </div>
              <button onClick={addToStaffRecruit} disabled={addingStaff}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #6a1b9a', background: '#fff', color: '#6a1b9a', fontSize: 13, fontWeight: 700, cursor: addingStaff ? 'not-allowed' : 'pointer' }}>
                {addingStaff ? '処理中...' : 'スタッフ募集日に追加'}
              </button>
              {staffRecruitResult && <p style={{ fontSize: 12, color: staffRecruitResult.includes('エラー') ? '#c62828' : '#2e7d32', marginTop: 6 }}>{staffRecruitResult}</p>}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: '#6a1b9a', fontWeight: 600, marginBottom: 6 }}>✅ スタッフ募集中 — スタッフ募集日に追加済み</div>
              {app.confirmed_staff ? (
                <div style={{ fontSize: 12, background: '#f3e5f5', borderRadius: 6, padding: '8px 12px', color: '#4a148c' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>✅ スタッフ確定：{app.confirmed_staff.user_name}</div>
                  {app.confirmed_staff.available_dates?.length > 0 && (
                    <div>
                      参加可能日：
                      {app.confirmed_staff.available_dates.map(d => {
                        const dateStr = d?.date || d
                        const dt = new Date(dateStr + 'T00:00:00')
                        const label = `${dt.getMonth() + 1}/${dt.getDate()}`
                        const timeSpec = (d?.from || d?.until) ? ` ${d.from || ''}〜${d.until || ''}` : ''
                        return <span key={dateStr} style={{ marginRight: 8 }}>{label}{timeSpec}</span>
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#aaa' }}>スタッフ未確定</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 確定フロー */}
      {isResponded && !isConfirmed && !isDeclined && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '16px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 12px' }}>✅ 確定する</p>

          {/* 日程選択 */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>確定する日程：</p>
            {app.preferences.map(pref => {
              const staffAvail = app.confirmed_staff?.available_dates
              const constraint = computeConstrainedRange(pref, app.model_responses, staffAvail)
              return (
                <div key={pref.preference_order} style={{ marginBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: constraint.valid ? 'pointer' : 'not-allowed', opacity: constraint.valid ? 1 : 0.5 }}>
                    <input type="radio" name={`confirm-pref-${app.id}`} value={pref.preference_order}
                      disabled={!constraint.valid}
                      checked={selectedPrefOrder === pref.preference_order}
                      onChange={() => {
                        if (!constraint.valid) { alert(`この日程は選択できません: ${constraint.reason}`); return }
                        setSelectedPrefOrder(pref.preference_order)
                      }} />
                    <span>
                      第{pref.preference_order}希望 {pref.preferred_date}{' '}
                      <span style={{ color: constraint.hasAdjusted ? '#e65100' : undefined }}>{constraint.time_range}</span>
                      （{pref.duration_hours}h）
                      {constraint.hasAdjusted && <span style={{ fontSize: 10, color: '#e65100', marginLeft: 4 }}>（時間調整済み）</span>}
                      {!constraint.valid && <span style={{ fontSize: 10, color: '#c62828', marginLeft: 4 }}>【{constraint.reason}】</span>}
                    </span>
                  </label>
                </div>
              )
            })}
          </div>

          {/* 実際の開始時刻 */}
          {selectedPrefOrder && (() => {
            const pref = app.preferences.find(p => p.preference_order === selectedPrefOrder)
            if (!pref) return null
            const endTime = addHours(actualStartTime, Number(pref.duration_hours))
            return (
              <div style={{ marginBottom: 12, background: '#fff', borderRadius: 8, padding: '12px', border: '1px solid #86efac' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>
                  実際の撮影時間（候補: {pref.time_range}）
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 2 }}>開始時刻</label>
                    <input type="time" value={actualStartTime} onChange={e => setActualStartTime(e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #86efac', fontSize: 13 }} />
                  </div>
                  <span style={{ color: '#888', marginTop: 16 }}>〜</span>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 2 }}>終了（自動）</label>
                    <input type="text" value={endTime} readOnly
                      style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d0d0d0', fontSize: 13, background: '#f5f5f5', width: 72 }} />
                  </div>
                  {actualStartTime && <span style={{ fontSize: 12, color: '#166534', marginTop: 16, fontWeight: 700 }}>✓ {pref.duration_hours}h</span>}
                </div>
              </div>
            )
          })()}

          {priceComp && (
            <>
              {/* 商品名 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>商品名 *</label>
                <input value={productTitle} onChange={e => setProductTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #86efac', fontSize: 13, boxSizing: 'border-box' }} />
              </div>

              {/* 料金内訳 */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>お客様への請求金額（税込）</p>
                <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px' }}>
                  {priceComp.modelFees.map((m, i) => (
                    <PriceRow key={m.model_id}
                      label={`${m.name} スタジオ料金（${m.hourlyRate.toLocaleString()}円/h × ${priceComp.hours}h）`}
                      value={m.fee}
                      onChange={v => setPriceComp(c => ({ ...c, modelFees: c.modelFees.map((x, j) => i === j ? { ...x, fee: v } : x) }))} />
                  ))}
                  <PriceRow
                    label={`スタッフ料（1,000円/h × ${priceComp.hours}h）`}
                    value={priceComp.staffFeeTotal}
                    onChange={v => setPriceComp(c => ({ ...c, staffFeeTotal: v }))} />
                  {priceComp.modelTransport.map(m => m.fee > 0 && (
                    <PriceRow key={m.model_id}
                      label={`${m.name} 交通費（往復）`}
                      value={m.fee}
                      onChange={v => setPriceComp(c => ({ ...c, modelTransport: c.modelTransport.map(x => x.model_id === m.model_id ? { ...x, fee: v } : x) }))} />
                  ))}
                  <PriceRow
                    label="スタッフ交通費（往復）"
                    value={priceComp.staffTransport}
                    onChange={v => setPriceComp(c => ({ ...c, staffTransport: v }))}
                    note={isStaffRecruiting ? '' : '運営参加の場合'} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>合計</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>¥{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 支払方法 */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>支払方法</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[['both', 'どちらも可'], ['cash_only', '現金のみ'], ['card_only', '事前決済カードのみ']].map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="radio" value={val} checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 販管費（参考） */}
              <details style={{ marginBottom: 12 }}>
                <summary style={{ fontSize: 12, color: '#888', cursor: 'pointer' }}>販管費（参考）</summary>
                <div style={{ background: '#fafafa', borderRadius: 6, padding: '8px 12px', marginTop: 6, fontSize: 12, color: '#556070', lineHeight: 2 }}>
                  {priceComp.modelFees.map(m => (
                    <div key={m.model_id}>
                      モデル報酬（{m.name}）：¥{m.managementFee.toLocaleString()}
                      {m.managementRate > 0 ? `（${m.managementRate.toLocaleString()}円/h × ${priceComp.hours}h）` : '（運営）'}
                    </div>
                  ))}
                  {isStaffRecruiting && <div>スタッフ報酬: ¥1,200</div>}
                  {priceComp.modelTransport.filter(m => m.fee > 0).map(m => (
                    <div key={m.model_id}>{m.name} 交通費: ¥{m.fee.toLocaleString()}</div>
                  ))}
                  <div>スタッフ交通費: ¥{priceComp.staffTransport.toLocaleString()}</div>
                  <div style={{ fontWeight: 700, borderTop: '1px solid #eee', marginTop: 4, paddingTop: 4 }}>
                    合計: ¥{managementCost.toLocaleString()}
                  </div>
                </div>
              </details>

              <button onClick={confirmApplication} disabled={confirming}
                style={{ width: '100%', padding: '12px', background: confirming ? '#aaa' : '#166534', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: confirming ? 'not-allowed' : 'pointer' }}>
                {confirming ? '処理中...' : '申し込みリンクを作成してLINEで確定連絡'}
              </button>
              {confirmResult && <p style={{ fontSize: 12, color: confirmResult.includes('エラー') ? '#c62828' : '#166534', marginTop: 8 }}>{confirmResult}</p>}
            </>
          )}
        </div>
      )}

      {isConfirmed && (
        <div style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600, marginBottom: 12 }}>✅ 確定済み — お客様にLINEで予約URLを送信しました</div>
      )}

      {/* LINE直接送信（断り） */}
      {!isConfirmed && !isDeclined && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 13, color: '#1a3560', cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
            📨 直接LINEを送信（お断り等）
          </summary>
          <textarea value={lineMsg} onChange={e => setLineMsg(e.target.value)}
            style={{ width: '100%', minHeight: 180, padding: '10px', borderRadius: 8, border: '1px solid #d0e4f0', fontSize: 13, lineHeight: 1.7, boxSizing: 'border-box', resize: 'vertical', marginTop: 8 }} />
          <button onClick={sendLine} disabled={sending}
            style={{ marginTop: 8, padding: '10px 24px', background: sending ? '#aaa' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer' }}>
            {sending ? '送信中...' : '送信'}
          </button>
          {sendResult && <p style={{ fontSize: 12, color: sendResult.includes('エラー') ? '#c62828' : '#2e7d32', marginTop: 6 }}>{sendResult}</p>}
        </details>
      )}
    </div>
  )
}

export default function RequestApplicationsSection() {
  const [subTab, setSubTab] = useState('responded')
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/admin/request-applications')
      .then(r => r.json())
      .then(d => { setApps(d.applications || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const pendingApps = apps.filter(a => ['pending', 'notified'].includes(a.status))
  const respondedApps = apps.filter(a => !['pending', 'notified'].includes(a.status))

  const displayed = subTab === 'pending' ? pendingApps : respondedApps

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #eee' }}>
        {[['pending', `リクエスト申請中（${pendingApps.length}）`], ['responded', `モデル回答済（${respondedApps.length}）`]].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer',
              color: subTab === key ? '#1a3560' : '#aaa',
              borderBottom: `2px solid ${subTab === key ? '#1a3560' : 'transparent'}`,
              marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>読み込み中...</p>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
          該当する申請はありません
        </div>
      ) : (
        displayed.map(app => <ApplicationCard key={app.id} app={app} onUpdate={load} />)
      )}
    </div>
  )
}
