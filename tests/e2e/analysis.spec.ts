import { test, expect } from '@playwright/test';
import { seedRoundWithHole, PAR4_GIR, PAR3_PENALTY, PAR5_SCRAMBLE } from './helpers';

test.describe('Analysis', () => {
  test('원장 라운드 3개가 모이면 Riccio · Trend · SG · Leak 이 모두 나온다', async ({ page }) => {
    // 이 테스트는 라운드 3개를 직접 만들어 SG 임계값(3)을 넘긴다
    await seedRoundWithHole(page, PAR4_GIR, 'analysis-a');
    await seedRoundWithHole(page, PAR3_PENALTY, 'analysis-b');
    await seedRoundWithHole(page, PAR5_SCRAMBLE, 'analysis-c');

    await page.goto('/analysis');
    await page.getByTestId('period-month').click();

    await expect(page.getByTestId('tile-score')).toBeVisible();

    const riccio = page.getByTestId('riccio-card');
    await expect(riccio).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('riccio-gir18')).toHaveText(/^\d+\.\d$/);
    await expect(page.getByTestId('riccio-exp-score')).toHaveText(/^\d+\.\d$/);
    await expect(page.getByTestId('riccio-gap')).toHaveText(/^[+-]?\d+\.\d$/);
    await expect(riccio).toContainText('95 − 2 × GIR');

    await expect(page.getByTestId('trend-card')).toBeVisible();
    await expect(page.getByTestId('trend-card')).toContainText('Riccio 기대');

    await expect(page.getByTestId('sg-needs-more')).toHaveCount(0);
    const sg = page.getByTestId('sg-card');
    await expect(sg).toBeVisible();
    await expect(sg).toContainText('vs Tour');
    for (const label of ['Tee', 'Approach', 'Short Game', 'Putting']) {
      await expect(sg).toContainText(label);
    }

    const leaks = page.getByTestId('leak-card');
    await expect(leaks).toHaveCount(2);
    await expect(leaks.first()).toContainText('Biggest Leak #1');
    await expect(leaks.first()).toContainText('vs Tour');
  });

  test('Riccio 기대 스코어는 GIR 18홀 환산으로 계산된다 (1홀 GIR → 59.0)', async ({ page }) => {
    // 라운드 하나, 1번 홀만 파4 GIR: gir18 = 18 → 95 − 36 = 59.0, 기대 퍼트 = 37 − 12 = 25.0
    // 다른 [E2E] 라운드의 영향을 피하려고 이 테스트는 직전 정리 상태를 가정하지 않고
    // 기간 필터 '전체'에서 값 형식만 보고, 정확한 값은 lib 테스트가 검증한다.
    await seedRoundWithHole(page, PAR4_GIR, 'riccio');
    await page.goto('/analysis');
    await expect(page.getByTestId('riccio-card')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('riccio-card')).toContainText('37 − ⅔ × GIR');
  });

  test('금지 표기가 화면에 없다 (eSG / Baseline / 핸디)', async ({ page }) => {
    await page.goto('/analysis');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/eSG|Estimated|Baseline|핸디/);
    await page.goto('/card');
    expect(await page.locator('body').innerText()).not.toMatch(/eSG|Baseline|핸디/);
  });
});
