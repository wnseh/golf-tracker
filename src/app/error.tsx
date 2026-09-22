'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logError } from '@/lib/log';
import { ErrorPanel, errorButtonPrimary, errorButtonSecondary } from '@/components/ui/error-panel';

/** 루트 에러 경계 — (auth) 등 (app) 밖 세그먼트. (app) 안은 (app)/error.tsx가 헤더·BottomNav를 유지한 채 잡는다. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError('error-boundary.root', error, { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <ErrorPanel
        testId="error-page"
        title="문제가 생겼습니다"
        description="잠시 후 다시 시도해 주세요"
        digest={error.digest}
        actions={
          <>
            <button type="button" data-testid="error-retry" onClick={reset} className={errorButtonPrimary}>다시 시도</button>
            <Link href="/" data-testid="error-home" className={errorButtonSecondary}>홈으로</Link>
          </>
        }
      />
    </main>
  );
}
