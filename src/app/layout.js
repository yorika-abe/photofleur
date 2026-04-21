import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const cormorant = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata = {
  title: "PhotoFleur | 撮影会予約サービス",
  description: "プロカメラマンと魅力的なモデルが出会う撮影会予約プラットフォーム。ストリート撮影・スタジオ撮影・リクエスト撮影に対応。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${geist.variable} ${cormorant.variable} h-full`}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-geist), Arial, sans-serif', background: '#fafafa', color: '#222' }}>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
