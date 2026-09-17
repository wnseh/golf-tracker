import { test, expect } from '@playwright/test';
import { createRound } from './helpers';
import { e2eCourseName } from './env';

test.describe('라운드 CRUD', () => {
  test('새 라운드를 만들면 홀 입력으로 이동하고 홈 목록에 나타난다', async ({ page }) => {
    const { course } = await createRound(page, { holes: 9 });
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('hole-nav-9')).toBeVisible();
    await expect(page.getByTestId('hole-nav-10')).toHaveCount(0);

    await page.goto('/');
    const card = page.locator(`[data-testid="round-card"][data-course="${course}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('9 holes');
  });

  test('코스명을 수정하면 목록에 반영된다', async ({ page }) => {
    const { course } = await createRound(page);
    const renamed = e2eCourseName('renamed');

    await page.goto('/');
    await page.locator(`[data-testid="round-card"][data-course="${course}"] [data-testid="round-menu"]`).click();
    await page.getByTestId('edit-round-course').fill(renamed);
    await page.getByTestId('edit-round-update').click();

    await expect(page.locator(`[data-testid="round-card"][data-course="${renamed}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="round-card"][data-course="${course}"]`)).toHaveCount(0);
  });

  test('삭제는 두 번 눌러야 실행된다', async ({ page }) => {
    const { course } = await createRound(page);
    await page.goto('/');
    const card = page.locator(`[data-testid="round-card"][data-course="${course}"]`);
    await card.getByTestId('round-menu').click();

    const del = page.getByTestId('edit-round-delete');
    await del.click();
    await expect(del).toHaveText('Confirm Delete');
    await expect(card).toBeVisible();          // 아직 삭제 안 됨

    await del.click();
    await expect(card).toHaveCount(0);
  });
});
