/**
 * ledger.ts — 샷 원장의 위치·벌타 규칙. 순수 함수, Supabase 의존 없음.
 *
 * 원장 항목은 "친 후" 위치만 적는다. 샷 N+1의 출발 위치와 샷마다 붙는 벌타는 여기서 파생한다.
 * stats.ts / sg.ts / 입력 UI가 모두 이 규칙을 쓴다.
 *
 *   친 후        | 벌타 | 다음 샷 출발
 *   FW/RO/SA/TR/GR | pen  | 그 라이, 그 거리
 *   HZ + 거리    | +1   | RO, 그 거리 (드롭 지점 — 러프로 근사)
 *   OB, 거리 없음 | +1   | 이 샷의 출발 위치 그대로 (다시 치기, stroke and distance)
 *   OB + 거리    | +2   | FW, 그 거리 (특설티 / 로컬룰 E-5 드롭)
 * pen(수동 +1)은 위와 별개로 더한다 (언플레이어블 등).
 */

import type { Shot, StartLie } from './types';
import { DIST_MID } from './constants';

export interface StartPos {
  lie:  StartLie;
  dist: number | null;   // m. 홀 길이 미입력 시 티 출발은 null
}

/** OB 다시 치기 (같은 자리에서 다시) */
export function isObReplay(shot: Shot): boolean {
  return shot.lie === 'OB' && shot.dist === null;
}

/** 이 샷에 붙는 벌타 수: 수동 pen + HZ/OB 자동 벌타 */
export function penaltyStrokes(shot: Shot): number {
  const auto = shot.lie === 'HZ' ? 1 : shot.lie === 'OB' ? (shot.dist === null ? 1 : 2) : 0;
  return (shot.pen ? 1 : 0) + auto;
}

/** 샷을 친 후 위치 = 다음 샷의 출발 위치. HOLED면 null. */
export function finishPos(shot: Shot, start: StartPos): StartPos | null {
  if (shot.lie === 'HOLED') return null;
  if (shot.lie === 'OB') return shot.dist === null ? start : { lie: 'FW', dist: DIST_MID[shot.dist] };
  if (shot.dist === null) return null;   // 미완성 원장
  if (shot.lie === 'HZ') return { lie: 'RO', dist: DIST_MID[shot.dist] };
  return { lie: shot.lie, dist: DIST_MID[shot.dist] };
}

/**
 * 샷별 출발 위치. 0번은 티(홀 길이 중간값). shots.length + 1개를 돌려준다 —
 * 마지막 항목은 "다음에 입력할 샷"의 출발 위치 (홀아웃이면 null).
 */
export function startPositions(shots: Shot[], holeLenMid: number | null): (StartPos | null)[] {
  const out: (StartPos | null)[] = [{ lie: 'TEE', dist: holeLenMid }];
  for (let i = 0; i < shots.length; i++) {
    const start = out[i];
    out.push(start ? finishPos(shots[i], start) : null);
  }
  return out;
}

/** 샷 i를 치기 전까지의 타수 (앞 샷 수 + 앞 샷들의 벌타) */
export function strokesBefore(shots: Shot[], i: number): number {
  let n = 0;
  for (let k = 0; k < i; k++) n += 1 + penaltyStrokes(shots[k]);
  return n;
}
