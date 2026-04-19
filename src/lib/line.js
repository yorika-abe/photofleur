const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

export async function sendLineMessage(lineUserId, message) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !lineUserId) return { ok: false, reason: 'missing config' }

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text: message }],
    }),
  })
  return { ok: res.ok, status: res.status }
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
