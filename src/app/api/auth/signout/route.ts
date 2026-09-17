import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });   // 이 기기 세션만 종료
  redirect('/login');
}
