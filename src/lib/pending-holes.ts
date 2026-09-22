/**
 * pending-holes.ts — 저장에 실패한 홀을 이 기기(localStorage)에 보관하는 대기열. 순수, Storage 주입.
 *
 * 키: 라운드당 하나 `golf-tracker:pending-holes:<roundId>`
 * 값: { v: 1, holes: { [holeNum]: { state, savedAt } } }
 * 깨진 JSON이나 버전 불일치는 빈 목록으로 취급하고 절대 throw하지 않는다.
 */

import type { HoleFormState } from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingHole {
  holeNum: number;
  state:   HoleFormState;
  savedAt: string;   // ISO — 로컬에 보관한 시각
}

export const PENDING_KEY_PREFIX = 'golf-tracker:pending-holes:';
const SCHEMA_VERSION = 1;

interface Stored {
  v: number;
  holes: Record<string, { state: HoleFormState; savedAt: string }>;
}

export function pendingKey(roundId: string): string {
  return `${PENDING_KEY_PREFIX}${roundId}`;
}

function readStored(storage: StorageLike, roundId: string): Stored | null {
  try {
    const raw = storage.getItem(pendingKey(roundId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' || parsed === null ||
      (parsed as Stored).v !== SCHEMA_VERSION ||
      typeof (parsed as Stored).holes !== 'object' || (parsed as Stored).holes === null
    ) {
      return null;
    }
    return parsed as Stored;
  } catch {
    return null;
  }
}

function writeStored(storage: StorageLike, roundId: string, stored: Stored): boolean {
  try {
    if (Object.keys(stored.holes).length === 0) {
      storage.removeItem(pendingKey(roundId));
    } else {
      storage.setItem(pendingKey(roundId), JSON.stringify(stored));
    }
    return true;
  } catch {
    return false;   // quota 초과, private 모드 등
  }
}

function toList(stored: Stored | null): PendingHole[] {
  if (!stored) return [];
  return Object.entries(stored.holes)
    .map(([k, v]) => ({ holeNum: Number(k), state: v.state, savedAt: v.savedAt }))
    .filter((p) => Number.isInteger(p.holeNum) && p.holeNum > 0 && p.state && Array.isArray(p.state.shots))
    .sort((a, b) => a.holeNum - b.holeNum);
}

/** 라운드의 대기 홀 목록 (홀 번호 오름차순) */
export function readPending(storage: StorageLike, roundId: string): PendingHole[] {
  return toList(readStored(storage, roundId));
}

/** 홀 하나를 보관 (같은 홀은 덮어씀). 저장 실패(quota 등)면 false. */
export function addPending(storage: StorageLike, roundId: string, holeNum: number, state: HoleFormState, now: Date = new Date()): boolean {
  const stored = readStored(storage, roundId) ?? { v: SCHEMA_VERSION, holes: {} };
  stored.holes[String(holeNum)] = { state, savedAt: now.toISOString() };
  return writeStored(storage, roundId, stored);
}

/** 저장에 성공한 홀들을 대기열에서 제거. 남은 목록을 돌려준다. 비면 키를 지운다. */
export function removePending(storage: StorageLike, roundId: string, holeNums: number[]): PendingHole[] {
  const stored = readStored(storage, roundId);
  if (!stored) return [];
  for (const n of holeNums) delete stored.holes[String(n)];
  writeStored(storage, roundId, stored);
  return toList(stored);
}

export function clearPending(storage: StorageLike, roundId: string): void {
  try { storage.removeItem(pendingKey(roundId)); } catch { /* 무시 */ }
}

/** 브라우저 localStorage. SSR이거나 접근이 막힌 환경(private 모드 등)이면 null. */
export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage;
    const probe = `${PENDING_KEY_PREFIX}__probe__`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
