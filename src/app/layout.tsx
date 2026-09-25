import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ui/sw-register";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Golf Tracker",
  description: "Track your golf rounds shot by shot",
  applicationName: "Golf Tracker",
  // 홈 화면에서 실행 시 주소창 없이 (iOS). 상태바는 bg와 같은 검정 — translucent는 헤더가 상태바 밑으로 들어가 safe-area 처리가 필요해 쓰지 않는다.
  // apple-touch-icon은 app/apple-icon.png, manifest는 app/manifest.ts 파일 규칙으로 자동 연결.
  appleWebApp: { capable: true, title: "Golf", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",   // globals.css --color-bg
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
