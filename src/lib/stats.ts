/**
 * stats.ts — Elliott 기본 5 stat + Riccio's Rule. 순수 함수, Supabase 의존 없음.
 *
 * 홀 원장(Shot[])에서 스코어/FIR/GIR/퍼트/페널티/스크램블을 파생한다.
 * 원장이 완성되지 않은 홀은 모든 stat이 null (미기록은 0이 아니라 N/A).
 *
 * Riccio's Rule (Riccio 1990, Analytics Magazine 2021):
 *   Score ≈ 95 − 2·GIR
 *   ExpectedPutts | GIR ≈ 37 − (2/3)·GIR
 *   Score ≈ 58 − (4/3)·GIR + Putts
 * 모두 18홀 기준.
 */

import type { Shot } from './types';

/* ── 원장 판정 ─────────────────────────────────────────────────────────── */

/** 마지막 항목이 HOLED이고, 그 앞 항목들은 전부 거리가 있는 원장 */
export function isLedgerComplete(shots: Shot[] | null | undefined): shots is Shot[] {
  if (!shots || shots.length === 0) return false;
  const last = shots[shots.length - 1];
  if (last.lie !== 'HOLED') return false;
  for (let i = 0; i < shots.length - 1; i++) {
    const s = shots[i];
    if (s.lie === 'HOLED' || s.dist === null) return false;
  }
  return true;
}

export function derivedScore(shots: Shot[]): number {
  return shots.length + shots.filter((s) => s.pen).length;
}

/* ── 홀 단위 ───────────────────────────────────────────────────────────── */

export interface HoleStats {
  par:       number;
  score:     number;
  complete:  boolean;          // 원장 완성 여부
  fir:       boolean | null;   // 파3은 null
  gir:       boolean | null;
  putts:     number | null;
  penalties: number | null;
  scramble:  boolean | null;   // GIR 미스 홀에서만 값 있음 (Elliott의 Up & Down)
}

export function holeStats(par: number, score: number, shots: Shot[] | null | undefined): HoleStats {
  if (!isLedgerComplete(shots)) {
    return { par, score, complete: false, fir: null, gir: null, putts: null, penalties: null, scramble: null };
  }

  const fir = par >= 4 ? shots[0].lie === 'FW' : null;

  const regulation = Math.max(0, par - 2);
  const gir = shots
    .slice(0, regulation)
    .some((s) => s.lie === 'GR' || s.lie === 'HOLED');

  let putts = 0;
  for (let i = 1; i < shots.length; i++) {
    if (shots[i - 1].lie === 'GR') putts++;
  }

  const penalties = shots.filter((s) => s.pen).length;
  const scramble = gir ? null : score <= par;

  return { par, score, complete: true, fir, gir, putts, penalties, scramble };
}

/* ── 라운드 단위 ───────────────────────────────────────────────────────── */

export interface Ratio { hit: number; den: number }

export interface RiccioEstimate {
  gir18:              number;
  putts18:            number | null;
  expScore:           number;          // 95 − 2·GIR
  expPutts:           number;          // 37 − (2/3)·GIR
  expScoreWithPutts:  number | null;   // 58 − (4/3)·GIR + Putts
}

export interface RoundStats {
  holesPlanned:   number;
  holesPlayed:    number;    // 저장된 홀 수
  holesComplete:  number;    // 원장 완성 홀 수
  scoreTotal:     number;
  scorePer18:     number;
  fir:            Ratio;
  gir:            Ratio;
  scramble:       Ratio;
  putts:          { total: number; holes: number };
  puttsPer18:     number | null;
  penalties:      { total: number; holes: number };
  penaltiesPer18: number | null;
  riccio:         RiccioEstimate | null;
}

export function roundStats(holes: HoleStats[], holesPlanned: number): RoundStats {
  const holesPlayed = holes.length;
  const scoreTotal = holes.reduce((s, h) => s + h.score, 0);
  const scorePer18 = holesPlayed > 0 ? scoreTotal * (18 / holesPlanned) : 0;

  const complete = holes.filter((h) => h.complete);
  const holesComplete = complete.length;

  const firHoles = complete.filter((h) => h.fir !== null);
  const fir: Ratio = { hit: firHoles.filter((h) => h.fir).length, den: firHoles.length };

  const gir: Ratio = { hit: complete.filter((h) => h.gir).length, den: holesComplete };

  const scrHoles = complete.filter((h) => h.scramble !== null);
  const scramble: Ratio = { hit: scrHoles.filter((h) => h.scramble).length, den: scrHoles.length };

  const putts = {
    total: complete.reduce((s, h) => s + (h.putts ?? 0), 0),
    holes: holesComplete,
  };
  const puttsPer18 = holesComplete > 0 ? putts.total * (18 / holesComplete) : null;

  const penalties = {
    total: complete.reduce((s, h) => s + (h.penalties ?? 0), 0),
    holes: holesComplete,
  };
  const penaltiesPer18 = holesComplete > 0 ? penalties.total * (18 / holesComplete) : null;

  const riccio = holesComplete > 0 ? riccioEstimate(gir, putts) : null;

  return {
    holesPlanned, holesPlayed, holesComplete,
    scoreTotal, scorePer18,
    fir, gir, scramble,
    putts, puttsPer18,
    penalties, penaltiesPer18,
    riccio,
  };
}

/** GIR·퍼트를 18홀로 환산한 뒤 Riccio 공식 적용 */
export function riccioEstimate(gir: Ratio, putts: { total: number; holes: number }): RiccioEstimate | null {
  if (gir.den === 0) return null;
  const gir18 = gir.hit * (18 / gir.den);
  const putts18 = putts.holes > 0 ? putts.total * (18 / putts.holes) : null;
  return {
    gir18,
    putts18,
    expScore: 95 - 2 * gir18,
    expPutts: 37 - (2 / 3) * gir18,
    expScoreWithPutts: putts18 !== null ? 58 - (4 / 3) * gir18 + putts18 : null,
  };
}

/* ── 기간 집계 (여러 라운드) ─────────────────────────────────────────── */

export interface PeriodStats {
  rounds:          number;
  roundsComplete:  number;     // 원장 완성 홀이 1개 이상인 라운드
  avgScore:        number | null;
  fir:             Ratio;
  gir:             Ratio;
  scramble:        Ratio;
  avgPutts:        number | null;   // 라운드별 puttsPer18 평균
  avgPenalties:    number | null;
  riccio:          RiccioEstimate | null;   // 합산 GIR/퍼트 기준
  ledgerCoverage:  number | null;   // 원장 완성 홀 / 저장 홀
}

export function periodStats(rounds: RoundStats[]): PeriodStats {
  const played = rounds.filter((r) => r.holesPlayed > 0);
  const n = played.length;
  const withLedger = played.filter((r) => r.holesComplete > 0);

  const sumRatio = (pick: (r: RoundStats) => Ratio): Ratio =>
    withLedger.reduce((acc, r) => ({ hit: acc.hit + pick(r).hit, den: acc.den + pick(r).den }), { hit: 0, den: 0 });

  const avg = (vals: (number | null)[]): number | null => {
    const v = vals.filter((x): x is number => x !== null);
    return v.length > 0 ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };

  const gir = sumRatio((r) => r.gir);
  const putts = withLedger.reduce(
    (acc, r) => ({ total: acc.total + r.putts.total, holes: acc.holes + r.putts.holes }),
    { total: 0, holes: 0 },
  );

  const holesPlayedAll = played.reduce((s, r) => s + r.holesPlayed, 0);
  const holesCompleteAll = played.reduce((s, r) => s + r.holesComplete, 0);

  return {
    rounds: n,
    roundsComplete: withLedger.length,
    avgScore: avg(played.map((r) => r.scorePer18)),
    fir: sumRatio((r) => r.fir),
    gir,
    scramble: sumRatio((r) => r.scramble),
    avgPutts: avg(withLedger.map((r) => r.puttsPer18)),
    avgPenalties: avg(withLedger.map((r) => r.penaltiesPer18)),
    riccio: riccioEstimate(gir, putts),
    ledgerCoverage: holesPlayedAll > 0 ? holesCompleteAll / holesPlayedAll : null,
  };
}
