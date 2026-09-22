import { test, expect } from '@playwright/test';
import {
  classifySupabaseError, isRetryableKind, shouldKeepLocally, saveErrorMessage, authErrorMessage,
  SupabaseSaveError, type SaveErrorKind,
} from '../../src/lib/save-errors';

const FORBIDDEN = /eSG|Estimated|Baseline|핸디/;

test.describe('classifySupabaseError', () => {
  const cases: Array<[string, unknown, number | null, SaveErrorKind]> = [
    ['PostgREST code "" (네트워크)',      { message: 'TypeError: Failed to fetch', code: '', details: '', hint: '' }, null, 'network'],
    ['TypeError Failed to fetch',         Object.assign(new TypeError('Failed to fetch'), {}), null, 'network'],
    ['AbortError',                        Object.assign(new Error('aborted'), { name: 'AbortError' }), null, 'network'],
    ['AuthRetryableFetchError',           { name: 'AuthRetryableFetchError', message: 'fetch failed', status: 0 }, null, 'network'],
    ['status 503',                        { message: 'Service Unavailable', code: 'PGRST000' }, 503, 'server'],
    ['status 500 code 없음',              { message: 'Internal', code: 'XX000' }, 500, 'server'],
    ['DB 연결 08006',                     { message: 'connection failure', code: '08006' }, null, 'server'],
    ['status 401',                        { message: 'JWT expired', code: 'PGRST301' }, 401, 'auth'],
    ['PGRST303 (status 없음)',            { message: 'JWT', code: 'PGRST303' }, null, 'auth'],
    ['AuthSessionMissingError',           { name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 400 }, null, 'auth'],
    ['RLS 42501',                         { message: 'new row violates row-level security', code: '42501' }, 403, 'rls'],
    ['status 403 code 없음',              { message: 'forbidden', code: 'PGRST' }, 403, 'rls'],
    ['FK 23503 (라운드 삭제됨)',          { message: 'violates foreign key', code: '23503' }, 409, 'constraint'],
    ['unique 23505',                      { message: 'duplicate', code: '23505' }, 409, 'constraint'],
    ['22P02 invalid uuid',                { message: 'invalid input syntax for type uuid', code: '22P02' }, 400, 'invalid'],
    ['PGRST102 body 오류',                { message: 'bad body', code: 'PGRST102' }, 400, 'invalid'],
    ['정체불명',                          { message: 'something', code: 'ZZZZZ' }, null, 'unknown'],
    ['문자열',                            'weird', null, 'unknown'],
    ['null',                              null, null, 'unknown'],
  ];
  for (const [label, err, status, kind] of cases) {
    test(`${label} → ${kind}`, () => {
      expect(classifySupabaseError(err, status)).toBe(kind);
    });
  }

  test('SupabaseSaveError는 생성 시 분류하고 필드를 보존한다', () => {
    const e = new SupabaseSaveError({ message: 'dup', code: '23505', details: 'Key exists', hint: null }, 409);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('SupabaseSaveError');
    expect(e.kind).toBe('constraint');
    expect(e.code).toBe('23505');
    expect(e.status).toBe(409);
    expect(e.details).toBe('Key exists');
    expect(classifySupabaseError(e)).toBe('constraint');
  });
});

test.describe('재시도·보관 정책', () => {
  test('network/server/unknown만 재시도', () => {
    const kinds: SaveErrorKind[] = ['network', 'server', 'auth', 'rls', 'constraint', 'invalid', 'unknown'];
    expect(kinds.filter(isRetryableKind)).toEqual(['network', 'server', 'unknown']);
  });
  test('보관은 재시도 대상 + auth', () => {
    const kinds: SaveErrorKind[] = ['network', 'server', 'auth', 'rls', 'constraint', 'invalid', 'unknown'];
    expect(kinds.filter(shouldKeepLocally)).toEqual(['network', 'server', 'auth', 'unknown']);
  });
});

test.describe('문구', () => {
  test('모든 kind에 한국어 문구가 있고 금지 표기가 없다', () => {
    const kinds: SaveErrorKind[] = ['network', 'server', 'auth', 'rls', 'constraint', 'invalid', 'unknown'];
    for (const k of kinds) {
      const m = saveErrorMessage(k);
      expect(m.length).toBeGreaterThan(5);
      expect(m).not.toMatch(FORBIDDEN);
    }
    expect(saveErrorMessage('rls')).toContain('권한');
  });
  test('authErrorMessage: code 우선, message 패턴 폴백, 모드별 기본값', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'x' })).toContain('올바르지 않습니다');
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toContain('올바르지 않습니다');
    expect(authErrorMessage({ code: 'email_not_confirmed', message: '' })).toContain('인증');
    expect(authErrorMessage({ code: 'user_already_exists', message: '' }, 'signup')).toContain('이미 가입');
    expect(authErrorMessage({ message: 'Password should be at least 6 characters' }, 'signup')).toContain('6자');
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toContain('네트워크');
    expect(authErrorMessage({ message: 'whatever' })).toBe('로그인에 실패했습니다');
    expect(authErrorMessage({ message: 'whatever' }, 'signup')).toBe('회원가입에 실패했습니다');
  });
});
