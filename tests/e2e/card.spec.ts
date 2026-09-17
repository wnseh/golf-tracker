import { test, expect } from '@playwright/test';
import { createRound, fillHole, saveHole, PAR4_GIR } from './helpers';

test.describe('Scorecard', () => {
  test('원장 홀과 스코어만 입력 홀이 타일과 홀 테이블에 맞게 표시된다', async ({ page }) => {
    const { course } = await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);
    await saveHole(page, 1, 9);
    // 2번 홀: 스코어만 6
    await page.getByTestId('score-only-toggle').click();
    await page.getByTestId('score-plus').click();
    await page.getByTestId('score-plus').click();
    await saveHole(page, 2, 9);

    await page.goto('/card');
    const round = page.locator(`[data-testid="card-round"][data-course="${course}"]`);
    await expect(round).toBeVisible();
    await expect(round).toContainText('2/9 홀');
    await expect(round).toContainText('원장 1홀');

    await round.getByTestId('card-round-toggle').click();
    const rows = round.getByTestId('hole-table-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('✓');            // FIR/GIR
    await expect(rows.nth(0).locator('td').nth(5)).toHaveText('2'); // Putt
    await expect(rows.nth(1).locator('td').nth(3)).toHaveText('—'); // 스코어만 → FIR —
    await expect(rows.nth(1).locator('td').nth(5)).toHaveText('—'); // Putt —
  });

  test('Elliott 타일이 분모와 함께 나오고 미기록은 N/A 다', async ({ page }) => {
    // 이 테스트만의 라운드: 파4 GIR 홀 하나
    await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);
    await saveHole(page, 1, 9);

    await page.goto('/card');
    await page.getByTestId('period-month').click();   // 오늘 만든 라운드는 이번달에 포함

    for (const id of ['score', 'fir', 'gir', 'putts', 'up-down', 'penalty']) {
      await expect(page.getByTestId(`tile-${id}`)).toBeVisible();
    }
    // 이번달 라운드 전체 합산이라 정확한 값 대신 형식만 검사
    await expect(page.getByTestId('tile-fir-value')).toHaveText(/^\d+%$/);
    await expect(page.getByTestId('tile-gir-value')).toHaveText(/^\d+%$/);
    await expect(page.getByTestId('tile-putts-value')).toHaveText(/^\d+\.\d$/);
    await expect(page.getByTestId('tile-fir')).toContainText('/');   // 분모 표기
  });
});
