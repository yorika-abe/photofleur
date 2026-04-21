const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID

async function pushMessage(to, message) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return { ok: false, reason: 'missing config' }

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text: message }],
    }),
  })
  return { ok: res.ok, status: res.status }
}

export async function sendLineMessage(lineUserId, message) {
  return pushMessage(lineUserId, message)
}

export async function sendLineGroupMessage(message) {
  if (!LINE_GROUP_ID) return { ok: false, reason: 'no group id' }
  return pushMessage(LINE_GROUP_ID, message)
}

export function buildBookingNoticeMessage({ modelName, eventDate, slotLabel, customerName }) {
  return `【PhotoFleur】予約が入りました🌸

モデル名：${modelName}
撮影日：${eventDate}
時間枠：${slotLabel}
お客様名：${customerName}

詳細は管理画面をご確認ください。`
}

export function buildDayBeforeNoticeMessage({ modelName, eventDate, slotLabel, locationName }) {
  return `【PhotoFleur】明日の撮影のお知らせ🌸

${eventDate}（明日）の撮影があります。

時間枠：${slotLabel}
集合場所：${locationName}

よろしくお願いいたします。`
}
