export async function POST(req) {
  try {
    const { sourceId, amount, email } = await req.json()
    if (!sourceId || !amount) return Response.json({ error: '決済情報が不足しています' }, { status: 400 })

    const res = await fetch(`https://connect.squareup.com/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        amount_money: { amount: amount, currency: 'JPY' },
        location_id: process.env.SQUARE_LOCATION_ID,
        ...(email ? { buyer_email_address: email } : {}),
      }),
    })

    const data = await res.json()
    if (!res.ok || data.errors) {
      const msg = data.errors?.[0]?.detail || 'カード決済に失敗しました'
      return Response.json({ error: msg }, { status: 400 })
    }

    return Response.json({ success: true, payment_id: data.payment.id })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
