// Sentry — Edge 런타임. DSN 없으면 비활성.
// Turbopack 빌드에선 middleware.ts가 자동 계측되지 않으므로 middleware는 console 로그(Vercel Edge 로그)만 남긴다.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
