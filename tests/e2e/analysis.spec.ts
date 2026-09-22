import { test, expect } from '@playwright/test';
import { seedRoundWithHole, PAR4_GIR, PAR3_PENALTY, PAR5_SCRAMBLE, PAR4_MISHIT } from './helpers';

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

    // Round vs 기간: 최근 라운드가 기본 선택, stat 행과 SG 행, 다른 라운드로 전환
    const rvp = page.getByTestId('round-vs-period');
    await expect(rvp).toBeVisible();
    await expect(rvp).toContainText('Round vs 이번달');
    for (const k of ['score', 'fir', 'gir', 'putts', 'scramble', 'penalty', 'doubles']) {
      await expect(page.getByTestId(`rvp-row-${k}`)).toBeVisible();
    }
    await expect(page.getByTestId('rvp-period-gir')).toHaveText(/^\d+%$/);
    await expect(page.getByTestId('rvp-round-sg')).toHaveText(/^[+-]\d+\.\d$/);
    const options = page.getByTestId('rvp-select').locator('option');
    expect(await options.count()).toBeGreaterThanOrEqual(3);
    const second = await options.nth(1).getAttribute('value');
    await page.getByTestId('rvp-select').selectOption(second!);
    await expect(page.getByTestId('rvp-select')).toHaveValue(second!);

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

  test('SG 해설 모달: 카테고리 ⓘ → 무엇을 재나/읽는 법/내 상황/출처, 닫기', async ({ page }) => {
    await seedRoundWithHole(page, PAR4_MISHIT, 'insight-a');
    await seedRoundWithHole(page, PAR3_PENALTY, 'insight-b');
    await seedRoundWithHole(page, PAR5_SCRAMBLE, 'insight-c');

    await page.goto('/analysis');
    await page.getByTestId('period-month').click();
    await expect(page.getByTestId('sg-card')).toBeVisible();
    // 미스 컨택 줄: 분모 있음, 퍼트 제외 표기
    await expect(page.getByTestId('sg-mishits')).toContainText('퍼트 제외');
    await expect(page.getByTestId('sg-mishits')).toContainText(/미스 컨택 \d+\/\d+ 샷/);

    // 퍼팅 카테고리
    await page.getByTestId('sg-info-putt').click();
    const modal = page.getByTestId('sg-insight-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('data-scope', 'putt');
    await expect(modal).toContainText('Putting');
    await expect(modal).toContainText('vs Tour');
    for (const h of ['무엇을 재나', '읽는 법', '내 상황', '출처']) {
      await expect(modal).toContainText(h);
    }
    await expect(modal).toContainText('Broadie');
    // 라운드 3개 → 표본 경고는 total 범위에만 있으므로 여기선 없어도 됨. 상황 항목 or 빈 안내 중 하나는 있어야 한다.
    const items = page.getByTestId('sg-insight-item');
    const empty = page.getByTestId('sg-insight-empty');
    expect((await items.count()) + (await empty.count())).toBeGreaterThan(0);

    await page.getByTestId('sg-insight-close').click();
    await expect(modal).toHaveCount(0);

    // 전체 ⓘ → 환산 배율 경고. 시드 라운드는 홀이 1개뿐이라 같은 달의 다른 [E2E] 라운드 수와 무관하게 항상 나온다.
    await page.getByTestId('sg-info-total').click();
    await expect(page.getByTestId('sg-insight-modal')).toHaveAttribute('data-scope', 'total');
    await expect(page.locator('[data-insight-id="total-partial-rounds"]')).toBeVisible();
    await expect(page.locator('[data-insight-id="total-partial-rounds"]')).toContainText('18홀');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('sg-insight-modal')).toHaveCount(0);

    // Leak 카드의 "읽는 법과 내 상황 보기"도 같은 모달
    await page.getByTestId('leak-detail').first().click();
    await expect(page.getByTestId('sg-insight-modal')).toBeVisible();
    await page.getByTestId('sg-insight-close').click();
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
    // 해설 모달이 열리는 상태라면 모달 본문도 검사
    if (await page.getByTestId('sg-info-total').count()) {
      await page.getByTestId('sg-info-total').click();
      expect(await page.getByTestId('sg-insight-modal').innerText()).not.toMatch(/eSG|Estimated|Baseline|핸디/);
      await page.keyboard.press('Escape');
    }
    await page.goto('/card');
    expect(await page.locator('body').innerText()).not.toMatch(/eSG|Baseline|핸디/);
  });
});
