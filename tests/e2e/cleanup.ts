/**
 * 테스트가 만든 "[E2E]" 라운드 정리.
 * Supabase REST 를 테스트 계정 권한(RLS)으로 직접 호출한다 — UI 를 거치지 않아 빠르고,
 * 프론트/백엔드 분리 후에도 백엔드가 Supabase 인 한 그대로 동작한다.
 * 백엔드를 교체하면 이 파일만 바꾸면 된다.
 */
import { createClient } from '@supabase/supabase-js';
import { testCredentials, E2E_PREFIX } from './env';

export async function cleanupE2ERounds(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return 0;

  const { email, password } = testCredentials();
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) throw new Error(`cleanup: 테스트 계정 로그인 실패 — ${authErr.message}`);

  const { data, error } = await supabase
    .from('rounds')
    .delete()
    .like('course', `${E2E_PREFIX}%`)
    .select('id');
  if (error) throw new Error(`cleanup: 라운드 삭제 실패 — ${error.message}`);
  await supabase.auth.signOut();
  return data?.length ?? 0;
}
