const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID
const LINE_CAMERA_CHANNEL_ACCESS_TOKEN = process.env.LINE_CAMERA_CHANNEL_ACCESS_TOKEN

// 公式LINEアカウント経由でカメラマン個人にpush（LINE連携済みかつ公式LINEをフォロー済みの場合のみ有効）
export async function sendLineCameraUser(lineUserId, message) {
  return pushMessage(LINE_CAMERA_CHANNEL_ACCESS_TOKEN, lineUserId, message)
}

async function pushMessage(token, to, message) {
  if (!token || !to) return { ok: false, reason: 'missing config' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: 'text', text: message }] }),
      signal: controller.signal,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) console.error('LINE push error:', res.status, JSON.stringify(body))
    return { ok: res.ok, status: res.status, error: body?.message }
  } catch (e) {
    console.error('LINE push exception:', e.message)
    return { ok: false, reason: e.message }
  } finally {
    clearTimeout(timer)
  }
}

async function broadcastMessages(token, messages) {
  if (!token) return { ok: false, reason: 'missing config' }
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages }),
  })
  return { ok: res.ok, status: res.status }
}

export async function sendLineMessage(lineUserId, message) {
  return pushMessage(LINE_CHANNEL_ACCESS_TOKEN, lineUserId, message)
}

export async function sendLineGroupMessage(message) {
  if (!LINE_GROUP_ID) return { ok: false, reason: 'no group id' }
  return pushMessage(LINE_CHANNEL_ACCESS_TOKEN, LINE_GROUP_ID, message)
}

export async function sendLineGroupMessageToId(groupId, message) {
  return pushMessage(LINE_CHANNEL_ACCESS_TOKEN, groupId, message)
}

export async function broadcastCameraLine(message) {
  return broadcastMessages(LINE_CAMERA_CHANNEL_ACCESS_TOKEN, [{ type: 'text', text: message }])
}

export async function broadcastCameraLineWithImage(message, imageUrl) {
  const msgs = [{ type: 'text', text: message }]
  if (imageUrl) msgs.push({ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl })
  return broadcastMessages(LINE_CAMERA_CHANNEL_ACCESS_TOKEN, msgs)
}

export function buildBookingNoticeMessage({ modelName, eventDate, slotLabel, customerName }) {
  return `【PhotoFleur】予約が入りました🌸

モデル名：${modelName}
撮影日：${eventDate}
時間枠：${slotLabel}
お客様名：${customerName}

詳細は管理画面をご確認ください。`
}

export function buildDayBeforeNoticeMessage({ eventDate, slotLabel, locationName }) {
  return `【PhotoFleur】明日の撮影のお知らせ🌸

${eventDate}（明日）の撮影があります。

時間枠：${slotLabel}
集合場所：${locationName}

よろしくお願いいたします。`
}

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export function buildShiftOpenMessage() {
  return `お疲れ様です😊
📢シフト提出受付を開始しました。

モデルポータルから📅シフト提出日を確認して締め切りまでに提出よろしくお願いします🙇‍♂️
🔗${SITE_URL}`
}

export function buildShiftDeadlineReminderMessage() {
  return `お疲れ様です🎀🫧
📢シフト提出締め切り前日になりました。

未提出者は連絡確認次第モデルポータルからシフト提出日お願いします🙇‍♂️
🔗${SITE_URL}`
}
