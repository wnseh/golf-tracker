import { test, expect } from '@playwright/test';
import {
  readPending, addPending, removePending, clearPending, pendingKey, PENDING_KEY_PREFIX, type StorageLike,
} from '../../src/lib/pending-holes';
import type { HoleFormState } from '../../src/lib/types';

function memStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

const R = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';

function state(par: number, score = par): HoleFormState {
  return {
    par, score, holeLen: null, scoreOnly: false, notes: '',
    shots: [{ lie: 'FW', dist: '100-150', pen: false, strike: 'ok' }, { lie: 'HOLED', dist: null, pen: false, strike: 'ok' }],
  };
}

test.describe('pending-holes', () => {
  test('키는 라운드당 하나', () => {
    expect(pendingKey(R)).toBe(`${PENDING_KEY_PREFIX}${R}`);
  });

  test('없으면 빈 목록, add 후 read는 홀 번호 오름차순', () => {
    const s = memStorage();
    expect(readPending(s, R)).toEqual([]);
    expect(addPending(s, R, 5, state(4), new Date('2026-09-21T01:00:00Z'))).toBe(true);
    expect(addPending(s, R, 2, state(3), new Date('2026-09-21T01:01:00Z'))).toBe(true);
    const list = readPending(s, R);
    expect(list.map((p) => p.holeNum)).toEqual([2, 5]);
    expect(list[0].state.par).toBe(3);
    expect(list[1].savedAt).toBe('2026-09-21T01:00:00.000Z');
    expect(s.map.size).toBe(1);
  });

  test('같은 홀은 덮어쓴다', () => {
    const s = memStorage();
    addPending(s, R, 3, state(4, 5));
    addPending(s, R, 3, state(4, 6));
    const list = readPending(s, R);
    expect(list).toHaveLength(1);
    expect(list[0].state.score).toBe(6);
  });

  test('remove: 일부 제거 후 남은 목록, 전부 제거하면 키 삭제', () => {
    const s = memStorage();
    addPending(s, R, 1, state(4));
    addPending(s, R, 2, state(4));
    addPending(s, R, 3, state(4));
    expect(removePending(s, R, [1, 3]).map((p) => p.holeNum)).toEqual([2]);
    expect(s.map.has(pendingKey(R))).toBe(true);
    expect(removePending(s, R, [2])).toEqual([]);
    expect(s.map.has(pendingKey(R))).toBe(false);
    expect(removePending(s, R, [9])).toEqual([]);   // 없는 라운드도 조용히
  });

  test('라운드 간 격리', () => {
    const s = memStorage();
    addPending(s, R, 1, state(4));
    addPending(s, R2, 7, state(5));
    expect(readPending(s, R).map((p) => p.holeNum)).toEqual([1]);
    expect(readPending(s, R2).map((p) => p.holeNum)).toEqual([7]);
    clearPending(s, R);
    expect(readPending(s, R)).toEqual([]);
    expect(readPending(s, R2)).toHaveLength(1);
  });

  test('깨진 JSON·버전 불일치·이상한 항목은 빈 목록/무시, throw 없음', () => {
    const s = memStorage();
    s.map.set(pendingKey(R), '{not json');
    expect(readPending(s, R)).toEqual([]);
    s.map.set(pendingKey(R), JSON.stringify({ v: 99, holes: { '1': { state: state(4), savedAt: 'x' } } }));
    expect(readPending(s, R)).toEqual([]);
    s.map.set(pendingKey(R), JSON.stringify({ v: 1, holes: { abc: { state: state(4), savedAt: 'x' }, '0': { state: state(4), savedAt: 'x' }, '4': { state: { par: 4 }, savedAt: 'x' }, '6': { state: state(4), savedAt: 'x' } } }));
    expect(readPending(s, R).map((p) => p.holeNum)).toEqual([6]);
    // 깨진 상태에서 add하면 새로 시작
    s.map.set(pendingKey(R), '{not json');
    expect(addPending(s, R, 2, state(3))).toBe(true);
    expect(readPending(s, R).map((p) => p.holeNum)).toEqual([2]);
  });

  test('setItem이 throw하면(quota) add는 false', () => {
    const s = memStorage();
    s.setItem = () => { throw new Error('QuotaExceededError'); };
    expect(addPending(s, R, 1, state(4))).toBe(false);
    expect(readPending(s, R)).toEqual([]);
  });
});
