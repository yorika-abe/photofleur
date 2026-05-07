import { getOgpImage, buildMetadata } from '@/lib/ogp'

export async function generateMetadata() {
  const image = await getOgpImage('ogp_faq')
  return buildMetadata({ title: 'よくある質問 | PhotoFleur', path: '/faq', imageUrl: image })
}

export default function FaqLayout({ children }) {
  return children
}
