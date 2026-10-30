import type { Metadata, Viewport } from 'next';
import './globals.css';

const title = 'STAMPDOCK — エンジニアのスタンプ工房';
const description = 'LGTM、解決済み、ありがとう。エンジニアの毎日にちょうどいいスタンプを検索・作成して、好きな解像度のPNGでダウンロード。';
const imageAlt = 'STAMPDOCK。LGTM・解決済み・ありがとうのスタンプと、エンジニアのためのスタンプ工房の紹介。';

export const metadata: Metadata = {
  metadataBase: new URL('https://stamp-dock.kozyutu.work'),
  title,
  description,
  applicationName: 'STAMPDOCK',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'STAMPDOCK',
    url: '/',
    title,
    description,
    images: [{ url: '/og-image.png', width: 1200, height: 630, type: 'image/png', alt: imageAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [{ url: '/og-image.png', alt: imageAlt }],
  },
};
export const viewport: Viewport = { themeColor: '#f7f7f2' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><head><link rel="stylesheet" href="/assets/fonts.css" /></head><body>{children}</body></html>;
}
