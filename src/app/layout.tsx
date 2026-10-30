import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'STAMPDOCK — エンジニアのスタンプ工房',
  description: 'LGTM、解決済み、ありがとう。エンジニアの毎日にちょうどいいスタンプを検索・作成して、好きな解像度のPNGでダウンロード。',
  icons: { icon: '/assets/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#f7f7f2' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><head><link rel="stylesheet" href="/assets/fonts.css" /></head><body>{children}</body></html>;
}
