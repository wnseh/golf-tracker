import Link from 'next/link';
import { ErrorPanel, errorButtonPrimary } from '@/components/ui/error-panel';

/** 매칭되지 않는 URL. */
export default function RootNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <ErrorPanel
        testId="not-found-page"
        title="페이지를 찾을 수 없습니다"
        description="주소를 확인해 주세요"
        actions={<Link href="/" data-testid="not-found-home" className={errorButtonPrimary}>홈으로</Link>}
      />
    </main>
  );
}
