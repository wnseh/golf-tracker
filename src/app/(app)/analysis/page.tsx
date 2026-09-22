import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logError, isSessionMissing } from '@/lib/log';
import { loadRoundSummaries } from '@/lib/load-rounds';
import { AnalysisClient } from './analysis-client';

export default async function AnalysisPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isSessionMissing(error)) logError('auth.getUser', error, { where: 'analysis' });
  if (!user) redirect('/login');

  const rounds = await loadRoundSummaries(user.id);
  return <AnalysisClient rounds={rounds} />;
}
