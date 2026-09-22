'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logError } from '@/lib/log';
import { ErrorPanel, errorButtonPrimary } from '@/components/ui/error-panel';
// global-error는 루트 레이아웃을 대체하므로 전역 스타일을 직접 가져와야 토큰 클래스가 적용된다.
// next/font는 붙지 않으므로 font-sans는 시스템 sans-serif로 폴백된다.
import './globals.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    logError('error-boundary.global', error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <main className="mx-auto max-w-lg px-4 py-10">
          <ErrorPanel
            testId="global-error-page"
            title="앱을 불러오지 못했습니다"
            description="새로고침해도 계속되면 잠시 후 다시 열어 주세요"
            digest={error.digest}
            actions={
              <button type="button" data-testid="global-error-retry" onClick={reset} className={errorButtonPrimary}>다시 시도</button>
            }
          />
        </main>
      </body>
    </html>
  );
}
