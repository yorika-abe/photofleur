import { createSupabaseServerClient } from '@/lib/supabase-server'
import { uploadToR2 } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) return Response.json({ error: 'Invalid type' }, { status: 400 })

  const MAX_MB = 5
  if (file.size > MAX_MB * 1024 * 1024) return Response.json({ error: 'Too large' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const key = `chat/${user.id}/${Date.now()}.${ext}`
  const url = await uploadToR2(key, buffer, file.type)

  return Response.json({ url })
}
