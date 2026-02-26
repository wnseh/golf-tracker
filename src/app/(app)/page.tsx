import { createClient } from '@/lib/supabase/server';
import type { InputMode } from '@/lib/types';
import { NewRoundButton } from './new-round-button';
import { RoundList } from './round-list';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, course, date, tee, holes, handicap, rating, green_speed, weather, temperature, input_mode')
    .order('date', { ascending: false });

  // Fetch user settings for default mode
  let defaultMode: InputMode = 'serious';
  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('default_mode')
      .eq('user_id', user.id)
      .single();
    if (settings?.default_mode) {
      defaultMode = settings.default_mode as InputMode;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">My Rounds</h2>
        <NewRoundButton defaultMode={defaultMode} />
      </div>

      <RoundList rounds={rounds ?? []} />
    </div>
  );
}
