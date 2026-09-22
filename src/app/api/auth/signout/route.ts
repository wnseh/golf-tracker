import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { logError } from '@/lib/log';

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });   // 이 기기 세션만 종료
  if (error) logError('auth.signOut', error);   // 실패해도 /login으로 — 미들웨어가 세션 상태를 다시 판단한다
  redirect('/login');
}
