import { getOgpImage, buildMetadata } from '@/lib/ogp'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const image = await getOgpImage('ogp_blog')
  return buildMetadata({ title: 'ブログ | PhotoFleur', path: '/blog', imageUrl: image })
}

export default function BlogLayout({ children }) {
  return children
}
