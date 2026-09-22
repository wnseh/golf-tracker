import { test, expect } from '@playwright/test';
import { holeStats, roundStats, periodStats, isLedgerComplete, derivedScore, riccioEstimate } from '../../src/lib/stats';
import type { Shot } from '../../src/lib/types';

const par4Gir: Shot[] = [
  { lie: 'FW', dist: '100-150', pen: false },
  { lie: 'GR', dist: '2-5', pen: false },
  { lie: 'GR', dist: '0-1', pen: false },
  { lie: 'HOLED', dist: null, pen: false },
];
const par3Pen: Shot[] = [
  { lie: 'FW', dist: '20-50', pen: true },
  { lie: 'GR', dist: '2-5', pen: false },
  { lie: 'HOLED', dist: null, pen: false },
];
const par5Scramble: Shot[] = [
  { lie: 'RO', dist: '200+', pen: false },
  { lie: 'FW', dist: '50-100', pen: false },
  { lie: 'RO', dist: '0-20', pen: false },
  { lie: 'GR', dist: '0-1', pen: false },
  { lie: 'HOLED', dist: null, pen: false },
];

test.describe('isLedgerComplete / derivedScore', () => {
  test('마지막이 HOLED 이고 앞이 전부 거리 있으면 완성', () => {
    expect(isLedgerComplete(par4Gir)).toBe(true);
    expect(isLedgerComplete([])).toBe(false);
    expect(isLedgerComplete(null)).toBe(false);
    expect(isLedgerComplete(par4Gir.slice(0, 3))).toBe(false);
    expect(isLedgerComplete([{ lie: 'FW', dist: null, pen: false }, { lie: 'HOLED', dist: null, pen: false }])).toBe(false);
  });
  test('스코어 = 샷 수 + 벌타', () => {
    expect(derivedScore(par4Gir)).toBe(4);
    expect(derivedScore(par3Pen)).toBe(4);
    expect(derivedScore([{ lie: 'HOLED', dist: null, pen: false }])).toBe(1); // 홀인원
  });
});

test.describe('holeStats', () => {
  test('파4 GIR', () => {
    expect(holeStats(4, 4, par4Gir)).toEqual({ par: 4, score: 4, complete: true, fir: true, gir: true, putts: 2, penalties: 0, scramble: null, mishits: { hit: 0, den: 0 } });
  });
  test('파3 벌타: FIR 없음, GIR ✗, 스크램블 실패', () => {
    expect(holeStats(3, 4, par3Pen)).toMatchObject({ fir: null, gir: false, putts: 1, penalties: 1, scramble: false });
  });
  test('파5 스크램블 성공', () => {
    expect(holeStats(5, 5, par5Scramble)).toMatchObject({ fir: false, gir: false, putts: 1, scramble: true });
  });
  test('홀인원은 GIR', () => {
    expect(holeStats(3, 1, [{ lie: 'HOLED', dist: null, pen: false }])).toMatchObject({ gir: true, putts: 0 });
  });
  test('파4에서 3번째 샷 온그린은 GIR 아님', () => {
    const shots: Shot[] = [
      { lie: 'RO', dist: '150-200', pen: false }, { lie: 'RO', dist: '20-50', pen: false },
      { lie: 'GR', dist: '2-5', pen: false }, { lie: 'HOLED', dist: null, pen: false },
    ];
    expect(holeStats(4, 4, shots)).toMatchObject({ gir: false, putts: 1, scramble: true });
  });
  test('원장 없음(스코어만) → 전부 null', () => {
    expect(holeStats(4, 6, null)).toEqual({ par: 4, score: 6, complete: false, fir: null, gir: null, putts: null, penalties: null, scramble: null, mishits: { hit: 0, den: 0 } });
  });
});

test.describe('roundStats', () => {
  const holes = [holeStats(4, 4, par4Gir), holeStats(3, 4, par3Pen), holeStats(5, 5, par5Scramble), holeStats(4, 6, null)];
  const r = roundStats(holes, 9);

  test('분모는 완성 홀 기준, 스코어는 저장 홀 전체', () => {
    expect(r.holesPlayed).toBe(4);
    expect(r.holesComplete).toBe(3);
    expect(r.scoreTotal).toBe(19);
    expect(r.scorePer18).toBe(38);
    expect(r.fir).toEqual({ hit: 1, den: 2 });       // 파3 제외
    expect(r.gir).toEqual({ hit: 1, den: 3 });
    expect(r.scramble).toEqual({ hit: 1, den: 2 });  // GIR 미스 2홀 중 1
    expect(r.putts).toEqual({ total: 4, holes: 3 });
    expect(r.puttsPer18).toBe(24);
    expect(r.penalties.total).toBe(1);
  });
  test('Riccio 는 18홀 환산 GIR·퍼트로', () => {
    expect(r.riccio).not.toBeNull();
    expect(r.riccio!.gir18).toBeCloseTo(6, 5);
    expect(r.riccio!.expScore).toBeCloseTo(83, 5);
    expect(r.riccio!.expPutts).toBeCloseTo(33, 5);
    expect(r.riccio!.expScoreWithPutts).toBeCloseTo(58 - 8 + 24, 5);
  });
  test('원장 없는 라운드는 Riccio null', () => {
    expect(roundStats([holeStats(4, 5, null)], 18).riccio).toBeNull();
  });
  test('컨택: strike 없는 이전 데이터는 den 0(N/A), ok/miss만 센다, 퍼트는 무시', () => {
    expect(holeStats(4, 4, par4Gir).mishits).toEqual({ hit: 0, den: 0 });
    const withStrike: Shot[] = [
      { lie: 'RO', dist: '100-150', pen: false, strike: 'miss' },
      { lie: 'GR', dist: '5-10', pen: false, strike: 'ok' },
      { lie: 'GR', dist: '0-1', pen: false, strike: null },
      { lie: 'HOLED', dist: null, pen: false, strike: null },
    ];
    expect(holeStats(4, 4, withStrike).mishits).toEqual({ hit: 1, den: 2 });
    const r2 = roundStats([holeStats(4, 4, withStrike), holeStats(4, 4, par4Gir), holeStats(4, 6, null)], 9);
    expect(r2.mishits).toEqual({ hit: 1, den: 2 });
    expect(periodStats([r2, r2]).mishits).toEqual({ hit: 2, den: 4 });
  });
  test('더블보기는 저장 홀 전체(스코어만 포함), 3퍼트는 완성 홀 기준', () => {
    // 파4 4, 파3 4(+1), 파5 5, 파4 6(+2, 스코어만) → 더블 이상 1/4
    expect(r.doubles).toEqual({ hit: 1, den: 4 });
    expect(r.doublesPer18).toBeCloseTo(4.5, 5);
    expect(r.threePutts).toEqual({ hit: 0, den: 3 });
    const empty = roundStats([], 18);
    expect(empty.doublesPer18).toBeNull();
    expect(empty.threePutts).toEqual({ hit: 0, den: 0 });
  });
});

test.describe('riccioEstimate / periodStats', () => {
  test('1홀 GIR → gir18 = 18 → 기대 스코어 59', () => {
    const e = riccioEstimate({ hit: 1, den: 1 }, { total: 2, holes: 1 })!;
    expect(e.gir18).toBe(18);
    expect(e.expScore).toBe(59);
    expect(e.expPutts).toBe(25);
    expect(e.putts18).toBe(36);
  });
  test('기간 집계는 라운드 합산', () => {
    const a = roundStats([holeStats(4, 4, par4Gir)], 9);
    const b = roundStats([holeStats(3, 4, par3Pen)], 9);
    const c = roundStats([holeStats(4, 7, null)], 9); // 스코어만
    const p = periodStats([a, b, c]);
    expect(p.rounds).toBe(3);
    expect(p.roundsComplete).toBe(2);
    expect(p.gir).toEqual({ hit: 1, den: 2 });
    expect(p.fir).toEqual({ hit: 1, den: 1 });
    expect(p.avgScore).toBeCloseTo((8 + 8 + 14) / 3, 5);
    expect(p.ledgerCoverage).toBeCloseTo(2 / 3, 5);
    expect(p.riccio!.gir18).toBe(9);
  });
  test('빈 기간', () => {
    const p = periodStats([]);
    expect(p.rounds).toBe(0);
    expect(p.avgScore).toBeNull();
    expect(p.riccio).toBeNull();
  });
});
