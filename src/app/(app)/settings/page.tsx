import { createClient } from '@/lib/supabase/server';
import type { UserClub } from '@/lib/types';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clubRows } = await supabase
    .from('user_clubs')
    .select('*')
    .eq('user_id', user!.id)
    .order('sort_order', { ascending: true });

  const clubs: UserClub[] = (clubRows ?? []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    clubName: c.club_name,
    carryM: Number(c.carry_m),
    totalM: Number(c.total_m),
    sortOrder: c.sort_order,
  }));

  return <SettingsClient initialClubs={clubs} userId={user!.id} />;
}
