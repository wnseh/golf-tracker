import { test, expect } from '@playwright/test';
import { withRetry, DEFAULT_RETRY_DELAYS } from '../../src/lib/retry';

function harness(failTimes: number) {
  let calls = 0;
  const sleeps: number[] = [];
  const retries: number[] = [];
  const fn = async () => {
    calls++;
    if (calls <= failTimes) throw new Error(`fail ${calls}`);
    return `ok ${calls}`;
  };
  const opts = {
    sleep: async (ms: number) => { sleeps.push(ms); },
    onRetry: (attempt: number) => { retries.push(attempt); },
  };
  return { fn, opts, sleeps, retries, calls: () => calls };
}

test.describe('withRetry', () => {
  test('첫 시도 성공이면 한 번만 호출, 대기 없음', async () => {
    const h = harness(0);
    expect(await withRetry(h.fn, h.opts)).toBe('ok 1');
    expect(h.calls()).toBe(1);
    expect(h.sleeps).toEqual([]);
    expect(h.retries).toEqual([]);
  });

  test('2번 실패 후 성공: 호출 3회, 대기 500·1000, onRetry 1·2', async () => {
    const h = harness(2);
    expect(await withRetry(h.fn, h.opts)).toBe('ok 3');
    expect(h.calls()).toBe(3);
    expect(h.sleeps).toEqual([500, 1000]);
    expect(h.retries).toEqual([1, 2]);
  });

  test('전부 실패: 최대 4회(첫 시도 + 재시도 3회), 마지막 에러 throw, 총 대기 3.5s', async () => {
    const h = harness(99);
    await expect(withRetry(h.fn, h.opts)).rejects.toThrow('fail 4');
    expect(h.calls()).toBe(4);
    expect(h.sleeps).toEqual(DEFAULT_RETRY_DELAYS);
    expect(h.retries).toEqual([1, 2, 3]);
  });

  test('isRetryable이 false면 즉시 throw, 대기 0회', async () => {
    const h = harness(99);
    await expect(withRetry(h.fn, { ...h.opts, isRetryable: () => false })).rejects.toThrow('fail 1');
    expect(h.calls()).toBe(1);
    expect(h.sleeps).toEqual([]);
  });

  test('retries·delays 조정: delays가 부족하면 마지막 값 반복', async () => {
    const h = harness(99);
    await expect(withRetry(h.fn, { ...h.opts, retries: 4, delays: [100, 200] })).rejects.toThrow('fail 5');
    expect(h.sleeps).toEqual([100, 200, 200, 200]);
  });

  test('fn은 attempt 번호(0부터)를 받는다', async () => {
    const seen: number[] = [];
    await expect(withRetry(async (a) => { seen.push(a); throw new Error('x'); }, { retries: 2, sleep: async () => {} }))
      .rejects.toThrow('x');
    expect(seen).toEqual([0, 1, 2]);
  });
});
