// Sentry — 브라우저. DSN 없으면 비활성. Replay/Feedback은 무료 티어 쿼터와 번들 크기 때문에 넣지 않는다.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === '1',
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
