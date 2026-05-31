import { ImageResponse } from 'next/og'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

export default async function Icon() {
  try {
    const admin = await createSupabaseAdminClient()
    const { data } = await admin.from('site_settings').select('value').eq('key', 'pwa_icon').single()
    const iconUrl = data?.value

    if (iconUrl) {
      return new ImageResponse(
        <img src={iconUrl} width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} />,
        { width: 32, height: 32 }
      )
    }
  } catch {}

  return new ImageResponse(
    <div style={{ width: 32, height: 32, background: '#1a3560', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
      P
    </div>,
    { width: 32, height: 32 }
  )
}
