import { test, expect } from '@playwright/test';
import { penaltyStrokes, startPositions, strokesBefore, isObReplay } from '../../src/lib/ledger';
import { derivedScore, holeStats, isLedgerComplete } from '../../src/lib/stats';
import { holeSG } from '../../src/lib/sg';
import type { Shot } from '../../src/lib/types';

const s = (lie: Shot['lie'], dist: Shot['dist'] = null, pen = false): Shot => ({ lie, dist, pen });

/** 파4 티샷 OB 다시 치기 → FW 100-150 → GR 2-5 → 2퍼트 = 6타 */
const OB_REPLAY: Shot[] = [s('OB'), s('FW', '100-150'), s('GR', '2-5'), s('GR', '0-1'), s('HOLED')];
/** 파4 티샷 OB 특설티(100-150) → GR 2-5 → 2퍼트 = 6타 */
const OB_DROP: Shot[] = [s('OB', '100-150'), s('GR', '2-5'), s('GR', '0-1'), s('HOLED')];
/** 파4 티샷 HZ(100-150 드롭) → GR 2-5 → 2퍼트 = 5타 */
const HZ: Shot[] = [s('HZ', '100-150'), s('GR', '2-5'), s('GR', '0-1'), s('HOLED')];

test.describe('벌타 규칙', () => {
  test('HZ +1, OB 다시 치기 +1, OB 특설티 +2, 수동 pen은 더한다', () => {
    expect(penaltyStrokes(s('HZ', '100-150'))).toBe(1);
    expect(penaltyStrokes(s('OB'))).toBe(1);
    expect(penaltyStrokes(s('OB', '100-150'))).toBe(2);
    expect(penaltyStrokes(s('FW', '100-150', true))).toBe(1);
    expect(penaltyStrokes(s('HZ', '100-150', true))).toBe(2);
    expect(isObReplay(s('OB'))).toBe(true);
    expect(isObReplay(s('OB', '0-20'))).toBe(false);
  });
  test('다음 샷 번호: 다시 치기 후 3타째, 특설티 후 4타째', () => {
    expect(strokesBefore(OB_REPLAY, 1) + 1).toBe(3);
    expect(strokesBefore(OB_DROP, 1) + 1).toBe(4);
    expect(strokesBefore(HZ, 1) + 1).toBe(3);
  });
});

test.describe('출발 위치', () => {
  test('OB 다시 치기는 같은 자리(티)에서, 특설티는 FW, HZ는 RO', () => {
    const r = startPositions(OB_REPLAY, 375);
    expect(r[1]).toEqual({ lie: 'TEE', dist: 375 });
    expect(r[2]).toEqual({ lie: 'FW', dist: 125 });
    expect(startPositions(OB_DROP, 375)[1]).toEqual({ lie: 'FW', dist: 125 });
    expect(startPositions(HZ, 375)[1]).toEqual({ lie: 'RO', dist: 125 });
    expect(startPositions(HZ, 375)[4]).toBeNull();   // 홀아웃
  });
  test('티가 아닌 곳에서 OB 다시 치기는 그 샷의 출발 위치로 돌아간다', () => {
    const shots = [s('FW', '150-200'), s('OB'), s('GR', '5-10')];
    expect(startPositions(shots, 375)[2]).toEqual({ lie: 'FW', dist: 175 });
  });
});

test.describe('stats / SG 반영', () => {
  test('OB 다시 치기: 6타, 벌타 1, 완성, 두 티샷 모두 tee, OB 샷 SG = −2', () => {
    expect(isLedgerComplete(OB_REPLAY)).toBe(true);
    expect(derivedScore(OB_REPLAY)).toBe(6);
    const st = holeStats(4, 6, OB_REPLAY);
    expect(st.penalties).toBe(1);
    expect(st.fir).toBe(false);
    expect(st.gir).toBe(false);
    expect(st.putts).toBe(2);
    const h = holeSG(4, 375, OB_REPLAY);
    expect(h.shots.map((x) => x.category)).toEqual(['tee', 'tee', 'approach', 'putt', 'putt']);
    expect(h.shots[0].value).toBeCloseTo(-2, 9);
  });
  test('OB 특설티: 6타, 벌타 2, GIR ✗', () => {
    expect(derivedScore(OB_DROP)).toBe(6);
    const st = holeStats(4, 6, OB_DROP);
    expect(st.penalties).toBe(2);
    expect(st.gir).toBe(false);
    expect(st.putts).toBe(2);
  });
  test('HZ: 5타, 벌타 1, GIR은 벌타 포함 타수로 판정해 ✗', () => {
    expect(derivedScore(HZ)).toBe(5);
    const st = holeStats(4, 5, HZ);
    expect(st.penalties).toBe(1);
    expect(st.gir).toBe(false);
    expect(st.scramble).toBe(false);
  });
  test('수동 pen도 GIR 타수에 들어간다 (기존: 스윙 수만 셈)', () => {
    const shots = [s('RO', '100-150', true), s('GR', '2-5'), s('GR', '0-1'), s('HOLED')];
    expect(holeStats(4, 5, shots).gir).toBe(false);
    const clean = [s('RO', '100-150'), s('GR', '2-5'), s('GR', '0-1'), s('HOLED')];
    expect(holeStats(4, 4, clean).gir).toBe(true);
  });
  test('HZ 샷 SG = E(출발) − E(RO, 드롭 거리) − 2', () => {
    const h = holeSG(4, 375, HZ);
    const viaRough = holeSG(4, 375, [s('RO', '100-150'), ...HZ.slice(1)]);
    expect(h.shots[0].value! - viaRough.shots[0].value!).toBeCloseTo(-1, 9);
  });
});
