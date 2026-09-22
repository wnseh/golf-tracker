'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logError } from '@/lib/log';
import { ErrorPanel, errorButtonPrimary, errorButtonSecondary } from '@/components/ui/error-panel';

/** (app) 세그먼트 에러 경계 — 헤더와 BottomNav는 (app)/layout.tsx가 그대로 유지한다. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError('error-boundary.app', error, { digest: error.digest });
  }, [error]);

  return (
    <ErrorPanel
      testId="error-page"
      title="문제가 생겼습니다"
      description="데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요"
      digest={error.digest}
      actions={
        <>
          <button type="button" data-testid="error-retry" onClick={reset} className={errorButtonPrimary}>다시 시도</button>
          <Link href="/" data-testid="error-home" className={errorButtonSecondary}>홈으로</Link>
        </>
      }
    />
  );
}
