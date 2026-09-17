/**
 * sg.ts — Strokes Gained vs PGA Tour. 순수 함수, Supabase 의존 없음.
 *
 * 샷 하나의 SG = E(치기 전 위치) − E(친 후 위치) − 1 − (벌타 ? 1 : 0)
 * E = PGA Tour 골퍼가 그 위치에서 홀아웃까지 걸리는 평균 타수.
 *
 * 기준표 출처 (모두 Mark Broadie, ShotLink 2003-2010 추정):
 *   - TEE/FW/RO/SA/TR: "Assessing Golfer Performance on the PGA TOUR" (2011), Appendix Table 9. 단위 yards.
 *   - GR: "Putts Gained: Measuring Putting on the PGA TOUR" (2011), Figure 1. 단위 feet.
 * 아래 표는 원 단위 그대로 적고, 조회 시 m로 변환한다.
 *
 * 카테고리 (Shot Scope 기준, 치기 전 위치로 분류):
 *   tee      = 파4/5의 첫 샷
 *   approach = 그린 밖에서 50m 초과 (파3 첫 샷 포함)
 *   short    = 그린 밖에서 50m 이하
 *   putt     = 그린 위
 */

import type { Shot, StartLie } from './types';
import { DIST_MID } from './constants';

/* ── 기준표 ────────────────────────────────────────────────────────────── */

const YD = 0.9144;
const FT = 0.3048;

// [yards, expected] — Broadie 2011 Table 9
const TEE_YD: [number, number][] = [
  [100, 2.92], [120, 2.99], [140, 2.97], [160, 2.99], [180, 3.05], [200, 3.12],
  [220, 3.17], [240, 3.25], [260, 3.45], [280, 3.65], [300, 3.71], [320, 3.79],
  [340, 3.86], [360, 3.92], [380, 3.96], [400, 3.99], [420, 4.02], [440, 4.08],
  [460, 4.17], [480, 4.28], [500, 4.41], [520, 4.54], [540, 4.65], [560, 4.74],
  [580, 4.79], [600, 4.82],
];
const FW_YD: [number, number][] = [
  [10, 2.18], [20, 2.40], [30, 2.52], [40, 2.60], [50, 2.66], [60, 2.70], [70, 2.72],
  [80, 2.75], [90, 2.77], [100, 2.80], [120, 2.85], [140, 2.91], [160, 2.98],
  [180, 3.08], [200, 3.19], [220, 3.32], [240, 3.45], [260, 3.58], [280, 3.69],
  [300, 3.78], [320, 3.84], [340, 3.88], [360, 3.95], [380, 4.03], [400, 4.11],
  [420, 4.19], [440, 4.27], [460, 4.34], [480, 4.42], [500, 4.50], [520, 4.58],
  [540, 4.66], [560, 4.74], [580, 4.82], [600, 4.89],
];
const RO_YD: [number, number][] = [
  [10, 2.34], [20, 2.59], [30, 2.70], [40, 2.78], [50, 2.87], [60, 2.91], [70, 2.93],
  [80, 2.96], [90, 2.99], [100, 3.02], [120, 3.08], [140, 3.15], [160, 3.23],
  [180, 3.31], [200, 3.42], [220, 3.53], [240, 3.64], [260, 3.74], [280, 3.83],
  [300, 3.90], [320, 3.95], [340, 4.02], [360, 4.11], [380, 4.21], [400, 4.30],
  [420, 4.40], [440, 4.49], [460, 4.58], [480, 4.68], [500, 4.77], [520, 4.87],
  [540, 4.96], [560, 5.06], [580, 5.15], [600, 5.25],
];
const SA_YD: [number, number][] = [
  [10, 2.43], [20, 2.53], [30, 2.66], [40, 2.82], [50, 2.92], [60, 3.15], [70, 3.21],
  [80, 3.24], [90, 3.24], [100, 3.23], [120, 3.21], [140, 3.22], [160, 3.28],
  [180, 3.40], [200, 3.55], [220, 3.70], [240, 3.84], [260, 3.93], [280, 4.00],
  [300, 4.04], [320, 4.12], [340, 4.26], [360, 4.41], [380, 4.55], [400, 4.69],
  [420, 4.83], [440, 4.97], [460, 5.11], [480, 5.25], [500, 5.40], [520, 5.54],
  [540, 5.68], [560, 5.82], [580, 5.96], [600, 6.10],
];
const TR_YD: [number, number][] = [
  [10, 3.45], [20, 3.51], [30, 3.57], [40, 3.71], [50, 3.79], [60, 3.83], [70, 3.84],
  [80, 3.84], [90, 3.82], [100, 3.80], [120, 3.78], [140, 3.80], [160, 3.81],
  [180, 3.82], [200, 3.87], [220, 3.92], [240, 3.97], [260, 4.03], [280, 4.10],
  [300, 4.20], [320, 4.31], [340, 4.44], [360, 4.56], [380, 4.66], [400, 4.75],
  [420, 4.84], [440, 4.94], [460, 5.03], [480, 5.13], [500, 5.22], [520, 5.32],
  [540, 5.41], [560, 5.51], [580, 5.60], [600, 5.70],
];
// [feet, expected putts] — Broadie 2011 putting paper Figure 1
const GR_FT: [number, number][] = [
  [2, 1.01], [3, 1.05], [4, 1.14], [5, 1.24], [6, 1.34], [7, 1.43], [8, 1.50],
  [9, 1.56], [10, 1.61], [15, 1.78], [20, 1.87], [30, 1.98], [40, 2.06], [50, 2.14],
  [60, 2.21], [90, 2.36],
];

type Table = [number, number][]; // [meters, expected], 오름차순

function toMeters(rows: [number, number][], factor: number): Table {
  return rows.map(([d, e]) => [d * factor, e]);
}

const BASELINE: Record<StartLie, Table> = {
  TEE: toMeters(TEE_YD, YD),
  FW:  toMeters(FW_YD, YD),
  RO:  toMeters(RO_YD, YD),
  SA:  toMeters(SA_YD, YD),
  TR:  toMeters(TR_YD, YD),
  GR:  toMeters(GR_FT, FT),
};

/** 위치(lie, 남은 거리 m)의 기대 타수. 표 범위 밖은 양끝 클램프, 사이는 선형 보간. */
export function expectedStrokes(lie: StartLie, distM: number): number {
  const t = BASELINE[lie];
  if (distM <= t[0][0]) return t[0][1];
  const last = t[t.length - 1];
  if (distM >= last[0]) return last[1];
  for (let i = 1; i < t.length; i++) {
    const [d1, e1] = t[i];
    if (distM <= d1) {
      const [d0, e0] = t[i - 1];
      const w = (distM - d0) / (d1 - d0);
      return e0 + w * (e1 - e0);
    }
  }
  return last[1];
}

/* ── 샷 / 홀 / 라운드 SG ───────────────────────────────────────────────── */

export type SgCategory = 'tee' | 'approach' | 'short' | 'putt';
export const SG_CATEGORIES: SgCategory[] = ['tee', 'approach', 'short', 'putt'];
export const SG_CATEGORY_LABELS: Record<SgCategory, string> = {
  tee: 'Tee', approach: 'Approach', short: 'Short Game', putt: 'Putting',
};

export interface ShotSG {
  index:     number;          // 0-based
  category:  SgCategory;
  startLie:  StartLie;
  startDist: number | null;   // m, 홀 길이 미입력 시 첫 샷은 null
  value:     number | null;   // startDist가 null이면 null
}

export type SgByCategory = Record<SgCategory, number>;

export interface HoleSG {
  shots:     ShotSG[];
  byCat:     SgByCategory;
  total:     number;
  counted:   number;   // value가 있는 샷 수
  skipped:   number;   // 홀 길이 미입력 등으로 계산 못 한 샷 수
}

export function emptySgByCategory(): SgByCategory {
  return { tee: 0, approach: 0, short: 0, putt: 0 };
}

/**
 * 완성된 원장의 샷별 SG. 완성 여부는 호출 측(stats.isLedgerComplete)에서 보장.
 * holeLenMid가 null이면 첫 샷 SG만 건너뛴다.
 */
export function holeSG(par: number, holeLenMid: number | null, shots: Shot[]): HoleSG {
  const out: ShotSG[] = [];
  const byCat = emptySgByCategory();
  let total = 0, counted = 0, skipped = 0;

  let startLie: StartLie = 'TEE';
  let startDist: number | null = holeLenMid;

  shots.forEach((shot, i) => {
    const category: SgCategory =
      i === 0 && par >= 4 ? 'tee'
      : startLie === 'GR' ? 'putt'
      : (startDist ?? Infinity) > 50 ? 'approach'
      : 'short';

    let value: number | null = null;
    if (startDist !== null) {
      const startE = expectedStrokes(startLie, startDist);
      const finishE = shot.lie === 'HOLED' || shot.dist === null
        ? 0
        : expectedStrokes(shot.lie, DIST_MID[shot.dist]);
      value = startE - finishE - 1 - (shot.pen ? 1 : 0);
      byCat[category] += value;
      total += value;
      counted++;
    } else {
      skipped++;
    }

    out.push({ index: i, category, startLie, startDist, value });

    if (shot.lie !== 'HOLED' && shot.dist !== null) {
      startLie = shot.lie;
      startDist = DIST_MID[shot.dist];
    }
  });

  return { shots: out, byCat, total, counted, skipped };
}

export interface RoundSG {
  byCat:         SgByCategory;   // 라운드 합
  total:         number;
  byCatPer18:    SgByCategory;   // 원장 완성 홀 기준 18홀 환산
  totalPer18:    number;
  holesCounted:  number;         // 원장 완성 홀 수
  shotsCounted:  number;
  shotsSkipped:  number;
}

export function roundSG(holeSgs: HoleSG[]): RoundSG | null {
  if (holeSgs.length === 0) return null;
  const byCat = emptySgByCategory();
  let total = 0, shotsCounted = 0, shotsSkipped = 0;
  for (const h of holeSgs) {
    for (const c of SG_CATEGORIES) byCat[c] += h.byCat[c];
    total += h.total;
    shotsCounted += h.counted;
    shotsSkipped += h.skipped;
  }
  const scale = 18 / holeSgs.length;
  const byCatPer18 = emptySgByCategory();
  for (const c of SG_CATEGORIES) byCatPer18[c] = byCat[c] * scale;
  return {
    byCat, total,
    byCatPer18, totalPer18: total * scale,
    holesCounted: holeSgs.length,
    shotsCounted, shotsSkipped,
  };
}

/** 여러 라운드의 18홀 환산 SG 평균 */
export function averageSG(rounds: RoundSG[]): { byCat: SgByCategory; total: number; rounds: number } | null {
  if (rounds.length === 0) return null;
  const byCat = emptySgByCategory();
  let total = 0;
  for (const r of rounds) {
    for (const c of SG_CATEGORIES) byCat[c] += r.byCatPer18[c];
    total += r.totalPer18;
  }
  for (const c of SG_CATEGORIES) byCat[c] /= rounds.length;
  return { byCat, total: total / rounds.length, rounds: rounds.length };
}
