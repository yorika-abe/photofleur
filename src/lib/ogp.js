import { createSupabaseAdminClient } from './supabase-server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'
const DEFAULT_DESC = 'PhotoFleurは、関東で開催されるポートレート撮影会です。所属モデルとカメラマンの自分らしい表現を見つける場所を提供しています。完全女性運営の安心環境でモデル活動を全力サポートします。'

export async function getOgpImage(key) {
  try {
    const admin = await createSupabaseAdminClient()
    const { data } = await admin.from('site_settings').select('value').eq('key', key).single()
    return data?.value || null
  } catch {
    return null
  }
}

export function buildMetadata({ title, description, imageUrl, path = '' }) {
  const desc = description || DEFAULT_DESC
  const url = `${BASE_URL}${path}`
  const images = imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title }] : []
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url,
      siteName: 'PhotoFleur',
      locale: 'ja_JP',
      type: 'website',
      images,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description: desc,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}
