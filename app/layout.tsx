import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel-title',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel-body',
});

export const metadata: Metadata = {
  title: "榜单合约",
  description: "基于 Binance 期货的榜单交易系统，支持市值榜单和涨幅榜单交易，实时市场数据和持仓管理",
  viewport: "width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} ${vt323.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
