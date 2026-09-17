import { test, expect } from '@playwright/test';
import { createRound, fillHole, enterShots, saveHole, PAR4_GIR, PAR3_PENALTY, PAR5_SCRAMBLE } from './helpers';

test.describe('홀 입력 (샷 원장)', () => {
  test('파4 원장: 스코어·FIR·GIR·퍼트가 파생되고 저장 후 다음 홀로 간다', async ({ page }) => {
    await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);

    await expect(page.getByTestId('hole-score')).toHaveText('4');
    await expect(page.getByTestId('hole-score-label')).toHaveText('PAR');
    await expect(page.getByTestId('stat-fir-value')).toHaveText('✓');
    await expect(page.getByTestId('stat-gir-value')).toHaveText('✓');
    await expect(page.getByTestId('stat-putts-value')).toHaveText('2');
    await expect(page.getByTestId('stat-pen-value')).toHaveText('0');
    await expect(page.getByTestId('shot-entry')).toHaveCount(0); // 홀아웃 후 입력창 닫힘

    await saveHole(page, 1, 9);
  });

  test('파3 벌타: 샷 3 + 벌타 1 = 4타, GIR ✗, FIR 없음', async ({ page }) => {
    await createRound(page);
    await fillHole(page, PAR3_PENALTY);

    await expect(page.getByTestId('hole-score')).toHaveText('4');
    await expect(page.getByTestId('hole-score-label')).toHaveText('BOGEY');
    await expect(page.getByTestId('stat-fir-value')).toHaveText('–');
    await expect(page.getByTestId('stat-gir-value')).toHaveText('✗');
    await expect(page.getByTestId('stat-putts-value')).toHaveText('1');
    await expect(page.getByTestId('stat-pen-value')).toHaveText('1');
    await expect(page.getByTestId('shot-row').first()).toHaveAttribute('data-pen', 'true');
  });

  test('파5 스크램블: GIR 미스에 파 세이브', async ({ page }) => {
    await createRound(page);
    await fillHole(page, PAR5_SCRAMBLE);
    await expect(page.getByTestId('hole-score')).toHaveText('5');
    await expect(page.getByTestId('hole-score-label')).toHaveText('PAR');
    await expect(page.getByTestId('stat-fir-value')).toHaveText('✗');
    await expect(page.getByTestId('stat-gir-value')).toHaveText('✗');
    await expect(page.getByTestId('stat-putts-value')).toHaveText('1');
  });

  test('파를 바꾸면 홀 길이 선택이 초기화되고 옵션이 바뀐다', async ({ page }) => {
    await createRound(page);
    await page.getByTestId('holelen-p4:350-400').click();
    await expect(page.getByTestId('holelen-p4:350-400')).toHaveAttribute('data-active', 'true');
    await page.getByTestId('par-3').click();
    await expect(page.getByTestId('holelen-p4:350-400')).toHaveCount(0);
    await expect(page.getByTestId('holelen-p3:150-180')).toHaveAttribute('data-active', 'false');
  });

  test('홀아웃 전에는 저장이 막힌다', async ({ page }) => {
    await createRound(page);
    await enterShots(page, [{ lie: 'FW', dist: '100-150' }]);
    await page.getByTestId('save-hole').click();
    await expect(page.getByTestId('toast')).toContainText('홀아웃');
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('hole-nav-2')).not.toHaveAttribute('data-state', 'active');
  });

  test('마지막 샷 삭제와 벌타 토글이 스코어에 반영된다', async ({ page }) => {
    await createRound(page);
    await enterShots(page, [{ lie: 'FW', dist: '100-150' }, { lie: 'GR', dist: '2-5' }, { lie: 'HOLED' }]);
    await expect(page.getByTestId('hole-score')).toHaveText('3');

    await page.getByTestId('remove-last-shot').click();
    await expect(page.getByTestId('shot-row')).toHaveCount(2);
    await expect(page.getByTestId('hole-score-label')).toHaveText('진행 중');
    await expect(page.getByTestId('shot-entry')).toBeVisible();

    await page.getByTestId('pen-toggle-0').click();
    await expect(page.getByTestId('hole-score')).toHaveText('3'); // 2샷 + 1벌타
    await page.getByTestId('pen-toggle-0').click();
    await expect(page.getByTestId('hole-score')).toHaveText('2');
  });

  test('"스코어만 입력" 홀은 스테퍼 값으로 저장되고 새로고침 후 복원된다', async ({ page }) => {
    await createRound(page, { holes: 9 });
    await page.getByTestId('score-only-toggle').click();
    await expect(page.getByTestId('score-only-toggle')).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('shot-entry')).toHaveCount(0);

    await page.getByTestId('score-plus').click();
    await page.getByTestId('score-plus').click();
    await expect(page.getByTestId('score-stepper-value')).toHaveText('6');
    await saveHole(page, 1, 9);

    await page.reload();
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('score-only-toggle')).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('score-stepper-value')).toHaveText('6');
  });

  test('저장한 원장은 새로고침 후 그대로 복원된다', async ({ page }) => {
    await createRound(page, { holes: 9 });
    await fillHole(page, PAR4_GIR);
    await saveHole(page, 1, 9);

    await page.reload();
    await expect(page.getByTestId('shot-row')).toHaveCount(4);
    await expect(page.getByTestId('hole-score')).toHaveText('4');
    await expect(page.getByTestId('holelen-p4:350-400')).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('hole-nav-2')).toHaveAttribute('data-state', 'empty');
  });

  test('홀을 옮겨도 미저장 입력이 보존되고 네비에 표시된다', async ({ page }) => {
    await createRound(page, { holes: 9 });
    await enterShots(page, [{ lie: 'RO', dist: '150-200' }]);

    await page.getByTestId('hole-nav-3').click();
    await expect(page.getByTestId('hole-nav-3')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('hole-nav-1')).toHaveAttribute('data-state', 'dirty');
    await expect(page.getByTestId('shot-row')).toHaveCount(0);

    await page.getByTestId('hole-nav-1').click();
    await expect(page.getByTestId('shot-row')).toHaveCount(1);
    await expect(page.getByTestId('shot-row').first()).toHaveAttribute('data-lie', 'RO');
  });

  test('마지막 홀을 저장하면 라운드 완료 토스트가 뜬다', async ({ page }) => {
    await createRound(page, { holes: 9 });
    await page.getByTestId('hole-nav-9').click();
    await fillHole(page, PAR3_PENALTY);
    await saveHole(page, 9, 9);
  });
});
