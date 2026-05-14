import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'
  const token = process.env.MODEL_INVITE_TOKEN || ''
  const inviteUrl = `${base}/model-register?token=${token}`

  return Response.json({ inviteUrl })
}
