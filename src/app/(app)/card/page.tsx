import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logError, isSessionMissing } from '@/lib/log';
import { loadRoundSummaries } from '@/lib/load-rounds';
import { ScorecardClient } from './scorecard-client';

export default async function CardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isSessionMissing(error)) logError('auth.getUser', error, { where: 'card' });
  if (!user) redirect('/login');

  const rounds = await loadRoundSummaries(user.id);
  return <ScorecardClient rounds={rounds} />;
}
