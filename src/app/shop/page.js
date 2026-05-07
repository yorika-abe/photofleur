import GoodsShop from './GoodsShop'
import { getOgpImage, buildMetadata } from '@/lib/ogp'

export async function generateMetadata() {
  const image = await getOgpImage('ogp_goods')
  return buildMetadata({ title: 'グッズショップ | PhotoFleur', path: '/shop', imageUrl: image })
}

export default function ShopPage() {
  return <GoodsShop />
}
