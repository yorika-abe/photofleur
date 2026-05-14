import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  let iconUrl = null
  try {
    const admin = await createSupabaseAdminClient()
    const { data } = await admin.from('site_settings').select('value').eq('key', 'pwa_icon').single()
    iconUrl = data?.value || null
  } catch {}

  const manifest = {
    name: 'Photo Fleur',
    short_name: 'Photo Fleur',
    description: '撮影会予約サービス',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#1a3560',
    icons: iconUrl
      ? [
          { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/apple-touch-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        ]
      : [],
  }

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
