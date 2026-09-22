import { test, expect, type Route } from '@playwright/test';
import { createRound, fillHole, PAR4_GIR, PAR3_PENALTY } from './helpers';
import { PENDING_KEY_PREFIX } from '../../src/lib/pending-holes';

/**
 * 홀 저장 실패 흐름. PostgREST의 holes upsert(POST)만 브라우저에서 실패시킨다.
 * 백엔드를 교체하면 이 라우트 패턴만 바꾼다.
 */
const HOLES_RE = /\/rest\/v1\/holes(\?|$)/;
const isHolesUpsert = (route: Route) => route.request().method() === 'POST' && HOLES_RE.test(route.request().url());

async function pendingInStorage(page: import('@playwright/test').Page, roundId: string) {
  return page.evaluate((key) => localStorage.getItem(key), `${PENDING_KEY_PREFIX}${roundId}`);
}

test.describe('홀 저장 복원력', () => {
  test('네트워크 실패: 재시도 스피너 → 이 기기에 보관 → 다음 홀 저장 때 함께 저장', async ({ page }) => {
    const { id } = await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);

    await page.route(HOLES_RE, (route) => (isHolesUpsert(route) ? route.abort('failed') : route.continue()));

    await page.getByTestId('save-hole').click();
    await expect(page.getByTestId('save-retrying')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('save-hole')).toContainText('재시도 중');

    // 재시도 3회(총 3.5s 대기) 후 보관
    const notice = page.getByTestId('pending-notice');
    await expect(notice).toBeVisible({ timeout: 15_000 });
    await expect(notice).toHaveAttribute('data-count', '1');
    await expect(notice).toContainText('1번');
    await expect(page.getByTestId('toast')).toContainText('이 기기에 보관');
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('save-hole')).toHaveAttribute('data-retrying', 'false');
    expect(await pendingInStorage(page, id)).toContain('"1"');

    // 네트워크 복구 → 2번 홀 입력 → 버튼에 미저장 표시 → 함께 저장
    await page.unroute(HOLES_RE);
    await page.getByTestId('hole-nav-2').click();
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'pending');
    await fillHole(page, PAR3_PENALTY);
    await expect(page.getByTestId('save-hole')).toContainText('미저장 1홀');

    await page.getByTestId('save-hole').click();
    await expect(page.getByTestId('toast')).toContainText('미저장 1홀 포함');
    await expect(page.getByTestId('hole-nav-3')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'saved');
    await expect(page.getByTestId('hole-nav-2')).toHaveAttribute('data-state', 'saved');
    await expect(notice).toHaveCount(0);
    expect(await pendingInStorage(page, id)).toBeNull();

    // 서버에 실제로 들어갔는지: 새로고침 후 1번 홀 원장이 4샷
    await page.reload();
    await page.getByTestId('hole-nav-1').click();
    await expect(page.getByTestId('shot-row')).toHaveCount(4);
    await expect(page.getByTestId('hole-nav-2')).toHaveAttribute('data-state', 'saved');
  });

  test('보관된 홀은 새로고침 후 복원되고 네비에 pending으로 표시된다', async ({ page }) => {
    const { id } = await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);
    await page.route(HOLES_RE, (route) => (isHolesUpsert(route) ? route.abort('failed') : route.continue()));
    await page.getByTestId('save-hole').click();
    await expect(page.getByTestId('pending-notice')).toBeVisible({ timeout: 15_000 });
    await page.unroute(HOLES_RE);

    await page.reload();
    await expect(page.getByTestId('pending-notice')).toHaveAttribute('data-count', '1');
    await expect(page.getByTestId('shot-row')).toHaveCount(4);          // 1번 홀이 활성이라 폼에 복원
    await expect(page.getByTestId('hole-score')).toHaveText('4');
    await page.getByTestId('hole-nav-2').click();
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'pending');
    await page.getByTestId('hole-nav-1').click();
    await expect(page.getByTestId('shot-row')).toHaveCount(4);

    // 정리: 이제 저장되면 대기열이 비어야 한다
    await page.getByTestId('save-hole').click();
    await expect(page.getByTestId('pending-notice')).toHaveCount(0);
    expect(await pendingInStorage(page, id)).toBeNull();
  });

  test('권한 오류(RLS)는 재시도·보관 없이 바로 문구만', async ({ page }) => {
    const { id } = await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);
    await page.route(HOLES_RE, (route) =>
      isHolesUpsert(route)
        ? route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ code: '42501', message: 'new row violates row-level security policy', details: null, hint: null }),
          })
        : route.continue(),
    );

    await page.getByTestId('save-hole').click();
    await expect(page.getByTestId('toast')).toContainText('권한');
    await expect(page.getByTestId('save-retrying')).toHaveCount(0);
    await expect(page.getByTestId('pending-notice')).toHaveCount(0);
    expect(await pendingInStorage(page, id)).toBeNull();
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'active');
    await page.unroute(HOLES_RE);
  });
});

test.describe('없는 라운드', () => {
  test('로그인 상태에서 없는 UUID → 404 페이지 (헤더 유지), 홈으로', async ({ page }) => {
    await page.goto('/round/00000000-0000-4000-8000-000000000000');
    await expect(page.getByTestId('not-found-page')).toBeVisible();
    await expect(page.getByTestId('not-found-page')).toContainText('라운드를 찾을 수 없습니다');
    await expect(page.getByRole('heading', { name: 'Golf Tracker' })).toBeVisible();
    await page.getByTestId('not-found-home').click();
    await expect(page).toHaveURL('/');
  });

  test('UUID 형식이 아니면 DB 없이 404', async ({ page }) => {
    await page.goto('/round/not-a-uuid');
    await expect(page.getByTestId('not-found-page')).toBeVisible();
  });
});
