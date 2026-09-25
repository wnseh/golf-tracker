import type { MetadataRoute } from 'next';

/**
 * PWA manifest → /manifest.webmanifest (Next가 <link rel="manifest">를 자동으로 넣는다).
 * 색상은 globals.css의 bg 토큰(#0a0a0a)과 맞춘다. manifest는 CSS 변수를 못 쓴다.
 * middleware matcher에서 제외돼 있어야 한다 — 브라우저는 manifest를 쿠키 없이 가져간다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Golf Tracker',
    short_name: 'Golf',
    description: '샷 원장으로 기록하고 Strokes Gained로 분석하는 골프 라운드 트래커',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
