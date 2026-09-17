import { createClient } from '@/lib/supabase/server';
import { loadRoundSummaries } from '@/lib/load-rounds';
import { ScorecardClient } from './scorecard-client';

export default async function CardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rounds = await loadRoundSummaries(user.id);
  return <ScorecardClient rounds={rounds} />;
}
