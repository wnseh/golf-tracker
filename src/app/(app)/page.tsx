import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/log';
import { NewRoundButton } from './new-round-button';
import { RoundList } from './round-list';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: rounds, error } = await supabase
    .from('rounds')
    .select('id, course, date, tee, holes, handicap, rating, weather, temperature')
    .order('date', { ascending: false });

  if (error) {
    logError('home.rounds', error);
    throw new Error('라운드 목록을 불러오지 못했습니다');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">My Rounds</h2>
        <NewRoundButton />
      </div>

      <RoundList rounds={rounds ?? []} />
    </div>
  );
}
