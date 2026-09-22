// Next.js instrumentation hook — 런타임별 Sentry 초기화 + 서버 요청 에러 수집.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// 서버 컴포넌트 / route handler에서 throw된 에러. notFound()/redirect()는 SDK가 걸러낸다.
export const onRequestError = Sentry.captureRequestError;
