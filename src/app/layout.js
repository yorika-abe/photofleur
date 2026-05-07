export const dynamic = 'force-dynamic'

import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";
import CartButton from "@/components/CartButton";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const cormorant = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata = {
  title: "PhotoFleur | 撮影会予約サービス",
  description: "PhotoFleurは、関東で開催されるポートレート撮影会です。所属モデルとカメラマンの自分らしい表現を見つける場所を提供しています。完全女性運営の安心環境でモデル活動を全力サポートします。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${geist.variable} ${cormorant.variable} h-full`}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-geist), Arial, sans-serif', background: '#fafafa', color: '#222' }}>
        <CartProvider>
          <Header />
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <Footer />
          <CartButton />
        </CartProvider>
      </body>
    </html>
  );
}
