import { test, expect } from '@playwright/test';
import { expectedStrokes, holeSG, roundSG, averageSG, sumStrike } from '../../src/lib/sg';
import type { Shot } from '../../src/lib/types';

test.describe('expectedStrokes (Broadie 투어 기준표)', () => {
  test('표 값과 일치 (yd/ft → m 변환)', () => {
    expect(expectedStrokes('FW', 100 * 0.9144)).toBeCloseTo(2.80, 2);
    expect(expectedStrokes('RO', 100 * 0.9144)).toBeCloseTo(3.02, 2);
    expect(expectedStrokes('SA', 20 * 0.9144)).toBeCloseTo(2.53, 2);
    expect(expectedStrokes('TR', 100 * 0.9144)).toBeCloseTo(3.80, 2);
    expect(expectedStrokes('TEE', 400 * 0.9144)).toBeCloseTo(3.99, 2);
    expect(expectedStrokes('GR', 8 * 0.3048)).toBeCloseTo(1.50, 2);
    expect(expectedStrokes('GR', 33 * 0.3048)).toBeCloseTo(2.0, 1); // 논문 본문: 33ft ≈ 2.0
  });
  test('보간과 클램프', () => {
    const mid = expectedStrokes('FW', 110 * 0.9144);
    expect(mid).toBeGreaterThan(2.80);
    expect(mid).toBeLessThan(2.85);
    expect(expectedStrokes('GR', 0.1)).toBeCloseTo(1.01, 2);   // 2ft 아래 → 클램프
    expect(expectedStrokes('TEE', 700 * 0.9144)).toBeCloseTo(4.82, 2);
  });
});

test.describe('holeSG', () => {
  // Shot Scope 예시: 파4 426yd, 5타. 글: −0.61 −0.06 −0.28 −0.20 +0.23 = −0.92
  const ex1: Shot[] = [
    { lie: 'RO', dist: '200+', pen: false }, { lie: 'FW', dist: '50-100', pen: false },
    { lie: 'GR', dist: '10+', pen: false }, { lie: 'GR', dist: '1-2', pen: false },
    { lie: 'HOLED', dist: null, pen: false },
  ];
  test('예시 홀 1: 카테고리·부호·합계가 글과 같은 방향 (버킷 오차 내)', () => {
    const sg = holeSG(4, 375, ex1);
    expect(sg.shots.map((s) => s.category)).toEqual(['tee', 'approach', 'approach', 'putt', 'putt']);
    expect(sg.shots[0].value!).toBeLessThan(0);
    expect(sg.shots[4].value!).toBeCloseTo(0.23, 1);
    expect(sg.total).toBeGreaterThan(-1.3);
    expect(sg.total).toBeLessThan(-0.6);
    expect(sg.counted).toBe(5);
    expect(sg.skipped).toBe(0);
  });
  test('파3 첫 샷은 approach, 벌타는 −1 추가', () => {
    const shots: Shot[] = [
      { lie: 'FW', dist: '20-50', pen: true }, { lie: 'GR', dist: '2-5', pen: false }, { lie: 'HOLED', dist: null, pen: false },
    ];
    const withPen = holeSG(3, 165, shots);
    const noPen = holeSG(3, 165, shots.map((s) => ({ ...s, pen: false })));
    expect(withPen.shots[0].category).toBe('approach');
    expect(withPen.shots[1].category).toBe('short');
    expect(withPen.total).toBeCloseTo(noPen.total - 1, 6);
  });
  test('홀 길이 없으면 첫 샷만 건너뛴다', () => {
    const sg = holeSG(4, null, ex1);
    expect(sg.shots[0].value).toBeNull();
    expect(sg.skipped).toBe(1);
    expect(sg.counted).toBe(4);
  });
  test('완벽한 홀은 SG 합이 파 대비 기대 타수 차이', () => {
    // 홀인원: E(TEE, 165m) − 0 − 1
    const sg = holeSG(3, 165, [{ lie: 'HOLED', dist: null, pen: false }]);
    expect(sg.total).toBeCloseTo(expectedStrokes('TEE', 165) - 1, 6);
  });
});

test.describe('roundSG / averageSG', () => {
  test('18홀 환산과 라운드 평균', () => {
    const h = holeSG(4, 375, [
      { lie: 'FW', dist: '100-150', pen: false }, { lie: 'GR', dist: '2-5', pen: false },
      { lie: 'GR', dist: '0-1', pen: false }, { lie: 'HOLED', dist: null, pen: false },
    ]);
    const r = roundSG([h, h])!;
    expect(r.holesCounted).toBe(2);
    // 2홀 합 × (18/2) = 홀 SG × 18
    expect(r.totalPer18).toBeCloseTo(h.total * 18, 6);
    expect(r.byCatPer18.putt).toBeCloseTo(h.byCat.putt * 18, 6);
    const avg = averageSG([r, r])!;
    expect(avg.rounds).toBe(2);
    expect(avg.total).toBeCloseTo(r.totalPer18, 6);
    expect(roundSG([])).toBeNull();
    expect(averageSG([])).toBeNull();
  });
});

test.describe('컨택별 SG 분리 (byStrike)', () => {
  const shots: Shot[] = [
    { lie: 'RO', dist: '150-200', pen: false, strike: 'miss' },   // tee, 미스
    { lie: 'GR', dist: '5-10', pen: false, strike: 'ok' },        // approach, ok
    { lie: 'GR', dist: '0-1', pen: false, strike: 'ok' },         // putt — 컨택은 무시(na)
    { lie: 'HOLED', dist: null, pen: false },                     // putt, strike 필드 없음
  ];
  test('퍼트는 항상 na, 나머지는 기록값대로. 합은 byCat과 일치', () => {
    const h = holeSG(4, 375, shots);
    expect(h.shots.map((s) => s.strike)).toEqual(['miss', 'ok', null, null]);
    expect(h.byStrike.miss.shots).toEqual({ tee: 1, approach: 0, short: 0, putt: 0 });
    expect(h.byStrike.ok.shots).toEqual({ tee: 0, approach: 1, short: 0, putt: 0 });
    expect(h.byStrike.na.shots).toEqual({ tee: 0, approach: 0, short: 0, putt: 2 });
    expect(h.byStrike.miss.sg.tee).toBeCloseTo(h.byCat.tee, 9);
    expect(h.byStrike.ok.sg.approach).toBeCloseTo(h.byCat.approach, 9);
    expect(h.byStrike.na.sg.putt).toBeCloseTo(h.byCat.putt, 9);
  });
  test('홀 길이 없으면 첫 샷은 컨택 집계에서도 빠진다', () => {
    const h = holeSG(4, null, shots);
    expect(h.byStrike.miss.shots.tee).toBe(0);
    expect(h.skipped).toBe(1);
  });
  test('roundSG·sumStrike는 단순 합 (환산 없음)', () => {
    const h = holeSG(4, 375, shots);
    const r = roundSG([h, h])!;
    expect(r.byStrike.miss.shots.tee).toBe(2);
    expect(r.byStrike.miss.sg.tee).toBeCloseTo(h.byCat.tee * 2, 9);
    const sum = sumStrike([r, r]);
    expect(sum.miss.shots.tee).toBe(4);
    expect(sum.ok.shots.approach).toBe(4);
  });
});
