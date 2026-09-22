/**
 * UI 를 통해서만 동작하는 헬퍼. 백엔드 구현에 의존하지 않는다.
 */
import { expect, type Page } from '@playwright/test';
import { e2eCourseName } from './env';

export type Lie = 'FW' | 'RO' | 'SA' | 'TR' | 'GR' | 'HOLED';
export interface ShotInput { lie: Lie; dist?: string; pen?: boolean; miss?: boolean }
export interface HoleInput { par: 3 | 4 | 5; len?: string; shots: ShotInput[] }

/** 새 라운드를 만들고 홀 입력 화면으로 이동. 라운드 id 를 돌려준다. */
export async function createRound(page: Page, opts: { course?: string; holes?: 9 | 18 } = {}): Promise<{ id: string; course: string }> {
  const course = opts.course ?? e2eCourseName('round');
  await page.goto('/');
  await page.getByTestId('new-round-open').click();
  await page.getByTestId('new-round-course').fill(course);
  await page.getByTestId(`new-round-holes-${opts.holes ?? 9}`).click();
  await page.getByTestId('new-round-create').click();
  await expect(page).toHaveURL(/\/round\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId('round-course')).toHaveText(course);
  const id = page.url().split('/').pop()!;
  return { id, course };
}

/** 원장에 샷을 순서대로 입력 (현재 홀). */
export async function enterShots(page: Page, shots: ShotInput[]) {
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    await page.getByTestId(`lie-${s.lie}`).click();
    if (s.lie !== 'HOLED') {
      if (!s.dist) throw new Error(`shot ${i + 1}: dist required for lie ${s.lie}`);
      await page.getByTestId(`dist-${s.dist}`).click();
    }
    await expect(page.getByTestId('shot-row')).toHaveCount(i + 1);
    if (s.pen) await page.getByTestId(`pen-toggle-${i}`).click();
    if (s.miss) await page.getByTestId(`strike-toggle-${i}`).click();
  }
}

/** 파/홀 길이/원장을 한 번에 입력 (저장은 하지 않음). */
export async function fillHole(page: Page, hole: HoleInput) {
  await page.getByTestId(`par-${hole.par}`).click();
  if (hole.len) await page.getByTestId(`holelen-${hole.len}`).click();
  await enterShots(page, hole.shots);
}

/** 현재 홀 저장. 마지막 홀이 아니면 다음 홀로 자동 이동한다. */
export async function saveHole(page: Page, holeNum: number, totalHoles: number) {
  await page.getByTestId('save-hole').click();
  if (holeNum < totalHoles) {
    await expect(page.getByTestId(`hole-nav-${holeNum + 1}`)).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId(`hole-nav-${holeNum}`)).toHaveAttribute('data-state', 'saved');
  } else {
    await expect(page.getByTestId('toast')).toContainText('라운드 완료');
  }
}

/* ── 자주 쓰는 원장 ─────────────────────────────────────── */

/** 파4 380m, 4타: FW 100-150 → GR 2-5 → GR 0-1 → HOLED. FIR ✓ GIR ✓ 퍼트 2 */
export const PAR4_GIR: HoleInput = {
  par: 4, len: 'p4:350-400',
  shots: [{ lie: 'FW', dist: '100-150' }, { lie: 'GR', dist: '2-5' }, { lie: 'GR', dist: '0-1' }, { lie: 'HOLED' }],
};

/** 파3 165m, 4타: 티샷 물(+1) 드롭 FW 20-50 → GR 2-5 → HOLED. GIR ✗ 벌타 1 퍼트 1 */
export const PAR3_PENALTY: HoleInput = {
  par: 3, len: 'p3:150-180',
  shots: [{ lie: 'FW', dist: '20-50', pen: true }, { lie: 'GR', dist: '2-5' }, { lie: 'HOLED' }],
};

/** 파5 475m, 5타: RO 200+ → FW 50-100 → RO 0-20 → GR 0-1 → HOLED. FIR ✗ GIR ✗ 업앤다운 ✓ */
export const PAR5_SCRAMBLE: HoleInput = {
  par: 5, len: 'p5:450-500',
  shots: [{ lie: 'RO', dist: '200+' }, { lie: 'FW', dist: '50-100' }, { lie: 'RO', dist: '0-20' }, { lie: 'GR', dist: '0-1' }, { lie: 'HOLED' }],
};

/** 파4 380m, 5타: 티샷 미스 컨택 RO 150-200 → FW 50-100 → GR 2-5 → GR 0-1 → HOLED. 미스 1/3 (퍼트 제외) */
export const PAR4_MISHIT: HoleInput = {
  par: 4, len: 'p4:350-400',
  shots: [{ lie: 'RO', dist: '150-200', miss: true }, { lie: 'FW', dist: '50-100' }, { lie: 'GR', dist: '2-5' }, { lie: 'GR', dist: '0-1' }, { lie: 'HOLED' }],
};

/** 라운드 하나 만들고 1번 홀에 원장 하나 저장 (분석용 시드). */
export async function seedRoundWithHole(page: Page, hole: HoleInput = PAR4_GIR, suffix = 'seed') {
  const r = await createRound(page, { course: e2eCourseName(suffix), holes: 9 });
  await fillHole(page, hole);
  await saveHole(page, 1, 9);
  return r;
}
