/**
 * retry.ts — 순수 재시도 헬퍼. 브라우저/서버/테스트 어디서나 동작.
 *
 * "3회 재시도" = 첫 시도 + 재시도 3회 = 최대 4회 호출. 기본 대기 500ms → 1s → 2s (총 3.5s).
 * isRetryable이 false를 돌려주면 즉시 그 에러를 던진다. 마지막 실패의 에러를 그대로 던진다.
 */

export interface RetryOptions {
  retries?:     number;                                   // 첫 시도 이후 추가 시도 횟수. 기본 3
  delays?:      number[];                                 // 재시도 i(0-based) 전 대기(ms). 부족하면 마지막 값 반복
  isRetryable?: (error: unknown) => boolean;              // 기본: 전부 재시도
  onRetry?:     (attempt: number, error: unknown) => void; // attempt = 1..retries, 대기 직전에 호출
  sleep?:       (ms: number) => Promise<void>;            // 테스트 주입용
}

export const DEFAULT_RETRY_DELAYS = [500, 1000, 2000];

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const delays = opts.delays && opts.delays.length > 0 ? opts.delays : DEFAULT_RETRY_DELAYS;
  const isRetryable = opts.isRetryable ?? (() => true);
  const sleep = opts.sleep ?? defaultSleep;

  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt >= retries || !isRetryable(e)) throw e;
      attempt++;
      opts.onRetry?.(attempt, e);
      await sleep(delays[Math.min(attempt - 1, delays.length - 1)]);
    }
  }
}
