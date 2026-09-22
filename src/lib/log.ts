/**
 * log.ts — 공용 로거. 서버(Node/Edge)와 클라이언트 모두에서 쓴다.
 *
 * - console은 항상 남긴다: 서버는 Vercel Function/Edge 로그, 클라는 devtools.
 * - Sentry는 초기화돼 있을 때만(NEXT_PUBLIC_SENTRY_DSN 설정 시) 전달한다. 없으면 no-op.
 * - Supabase 에러를 삼키지 않는 게 목적. 원본 error.message를 화면에 띄우는 용도가 아니다
 *   (화면 문구는 save-errors.ts).
 *
 * 이 파일은 @sentry/nextjs를 import하므로 순수 lib이 아니다. retry/save-errors/pending-holes는 이 파일을 쓰지 않는다.
 */

import * as Sentry from '@sentry/nextjs';

export type LogContext = Record<string, unknown>;

export interface ErrorSummary {
  name:     string;
  message:  string;
  code?:    string;
  status?:  number;
  details?: string;
  hint?:    string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** 에러를 직렬화 가능한 요약으로 (PostgrestError / AuthError / SupabaseSaveError 필드 포함) */
export function describeError(error: unknown): ErrorSummary {
  if (!isRecord(error)) {
    return { name: typeof error, message: String(error) };
  }
  const out: ErrorSummary = {
    name: typeof error.name === 'string' ? error.name : (error instanceof Error ? 'Error' : 'object'),
    message: typeof error.message === 'string' ? error.message : JSON.stringify(error).slice(0, 300),
  };
  if (typeof error.code === 'string' && error.code !== '') out.code = error.code;
  if (typeof error.status === 'number') out.status = error.status;
  if (typeof error.details === 'string' && error.details) out.details = error.details;
  if (typeof error.hint === 'string' && error.hint) out.hint = error.hint;
  return out;
}

/** 미로그인 상태의 auth.getUser()는 정상 케이스라 로그하지 않는다 */
export function isSessionMissing(error: unknown): boolean {
  return isRecord(error) && error.name === 'AuthSessionMissingError';
}

const PREFIX = '[golf-tracker]';

export function logError(scope: string, error: unknown, context: LogContext = {}): void {
  const summary = describeError(error);
  console.error(PREFIX, scope, { ...summary, ...context });

  if (!Sentry.getClient()) return;
  Sentry.withScope((s) => {
    s.setTag('scope', scope);
    s.setContext('error', { ...summary });
    s.setExtras(context);
    s.captureException(error instanceof Error ? error : new Error(`${scope}: ${summary.message}`));
  });
}

export function logWarn(scope: string, message: string, context: LogContext = {}): void {
  console.warn(PREFIX, scope, message, context);
  if (!Sentry.getClient()) return;
  Sentry.addBreadcrumb({ category: scope, level: 'warning', message, data: context });
}
