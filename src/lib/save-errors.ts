/**
 * save-errors.ts — Supabase(PostgREST/Auth) 에러 분류와 사용자 문구. 순수, 덕 타이핑.
 *
 * 화면에는 Supabase의 원본 error.message를 그대로 띄우지 않고 여기 문구를 쓴다.
 * 분류는 재시도 여부(isRetryableKind)와 로컬 보관 여부(shouldKeepLocally)를 정한다.
 *
 * postgrest-js는 네트워크 실패도 throw하지 않고 { error: { code: '', message }, status }로 돌려준다.
 * 그래서 code === '' 는 네트워크로 본다.
 */

export type SaveErrorKind = 'network' | 'server' | 'auth' | 'rls' | 'constraint' | 'invalid' | 'unknown';

export interface SupabaseErrorLike {
  message: string;
  code?:    string | null;
  details?: string | null;
  hint?:    string | null;
  status?:  number | null;
  name?:    string;
}

/** PostgREST `{ error, status }`를 throw 가능한 Error로 감싼다 */
export class SupabaseSaveError extends Error {
  readonly kind: SaveErrorKind;
  readonly code: string | null;
  readonly status: number | null;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(err: SupabaseErrorLike, status?: number | null) {
    super(err.message);
    this.name = 'SupabaseSaveError';
    this.code = err.code ?? null;
    this.status = status ?? err.status ?? null;
    this.details = err.details ?? null;
    this.hint = err.hint ?? null;
    this.kind = classifySupabaseError(err, this.status);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function classifySupabaseError(err: unknown, status?: number | null): SaveErrorKind {
  if (err instanceof SupabaseSaveError) return err.kind;

  const name = isRecord(err) && typeof err.name === 'string' ? err.name : '';
  const message = isRecord(err) && typeof err.message === 'string' ? err.message : String(err ?? '');
  const code = isRecord(err) && typeof err.code === 'string' ? err.code : null;
  const st = status ?? (isRecord(err) && typeof err.status === 'number' ? err.status : null);

  // 네트워크: fetch 실패, 중단, 타임아웃, PostgREST code ''
  if (
    name === 'TypeError' || name === 'AbortError' || name === 'AuthRetryableFetchError' ||
    (err instanceof Error && err.name === 'DOMException') ||
    code === '' ||
    /failed to fetch|network|abort|timeout|load failed/i.test(message)
  ) {
    return 'network';
  }

  // 서버/DB 연결
  if (
    (st !== null && st >= 500) ||
    (code !== null && (
      code === 'PGRST000' || code === 'PGRST001' ||
      code.startsWith('08') || code.startsWith('53') ||
      code === '57P01' || code === '40001' || code === '40P01'
    ))
  ) {
    return 'server';
  }

  // 인증
  if (
    st === 401 ||
    (code !== null && /^PGRST30[123]$/.test(code)) ||
    name === 'AuthSessionMissingError' ||
    (name.startsWith('Auth') && (st === 403 || /jwt|token|session|expired/i.test(message)))
  ) {
    return 'auth';
  }

  // RLS
  if (code === '42501' || st === 403) return 'rls';

  // 제약 (unique, FK=라운드 삭제됨, not-null, check)
  if (code !== null && code.startsWith('23')) return 'constraint';

  // 데이터 형식/요청 오류
  if ((code !== null && (code.startsWith('22') || /^PGRST1\d\d$/.test(code))) || (st !== null && st >= 400 && st < 500)) {
    return 'invalid';
  }

  return 'unknown';
}

/** 재시도해 볼 가치가 있는가 (upsert는 멱등이라 unknown도 재시도) */
export function isRetryableKind(kind: SaveErrorKind): boolean {
  return kind === 'network' || kind === 'server' || kind === 'unknown';
}

/** 실패해도 입력을 로컬에 보관해 나중에 다시 시도할 가치가 있는가 (auth는 재로그인 후 저장 가능) */
export function shouldKeepLocally(kind: SaveErrorKind): boolean {
  return isRetryableKind(kind) || kind === 'auth';
}

export function saveErrorMessage(kind: SaveErrorKind): string {
  switch (kind) {
    case 'network':    return '네트워크 연결이 불안정합니다';
    case 'server':     return '서버 오류가 났습니다';
    case 'auth':       return '로그인이 만료됐습니다. 다시 로그인해 주세요';
    case 'rls':        return '저장 권한이 없습니다. 다시 로그인해 주세요';
    case 'constraint': return '이 라운드에 저장할 수 없습니다 (삭제됐을 수 있음)';
    case 'invalid':    return '저장 데이터에 문제가 있습니다';
    default:           return '저장에 실패했습니다';
  }
}

/** 로그인/회원가입 에러 → 사용자 문구. Supabase Auth error code 기준, 없으면 message 패턴. */
export function authErrorMessage(err: unknown, mode: 'signin' | 'signup' = 'signin'): string {
  const code = isRecord(err) && typeof err.code === 'string' ? err.code : '';
  const message = isRecord(err) && typeof err.message === 'string' ? err.message : '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 올바르지 않습니다';
  if (code === 'email_not_confirmed' || /not confirmed/i.test(message)) return '이메일 인증을 완료해 주세요';
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(message)) return '이미 가입된 이메일입니다';
  if (code === 'weak_password' || /password should be at least/i.test(message)) return '비밀번호는 6자 이상이어야 합니다';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요';
  if (classifySupabaseError(err) === 'network') return '네트워크 연결을 확인해 주세요';
  return mode === 'signup' ? '회원가입에 실패했습니다' : '로그인에 실패했습니다';
}
