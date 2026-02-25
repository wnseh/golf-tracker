import { createClient } from '@/lib/supabase/server';
import { NewRoundButton } from './new-round-button';
import { RoundList } from './round-list';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, course, date, tee, holes, handicap, rating')
    .order('date', { ascending: false });

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
