import Link from 'next/link';
import { ErrorPanel, errorButtonPrimary } from '@/components/ui/error-panel';

/** (app) 안에서 notFound()가 던져지면 (라운드 없음 등) 헤더·BottomNav를 유지한 채 렌더. */
export default function AppNotFound() {
  return (
    <ErrorPanel
      testId="not-found-page"
      title="라운드를 찾을 수 없습니다"
      description="삭제됐거나 주소가 잘못됐습니다"
      actions={<Link href="/" data-testid="not-found-home" className={errorButtonPrimary}>홈으로</Link>}
    />
  );
}
