import { createClient } from '@/lib/supabase/server';
import { ScorecardClient } from './scorecard-client';

export interface RawRound {
  id: string;
  course: string;
  date: string;
  tee: string | null;
  holes: number;
  input_mode: string | null;
  handicap: number | null;
}

export interface RawHole {
  id: string;
  round_id: string;
  hole_num: number;
  par: number;
  score: number;
  stg_shots: unknown;
  putt_cards: unknown;
  notes: string | null;
}

export default async function CardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: roundRows } = await supabase
    .from('rounds')
    .select('id, course, date, tee, holes, input_mode, handicap')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  const rounds: RawRound[] = roundRows ?? [];
  const roundIds = rounds.map((r) => r.id);

  let holes: RawHole[] = [];
  if (roundIds.length > 0) {
    const { data: holeRows } = await supabase
      .from('holes')
      .select('id, round_id, hole_num, par, score, stg_shots, putt_cards, notes')
      .in('round_id', roundIds);
    holes = holeRows ?? [];
  }

  return <ScorecardClient rounds={rounds} holes={holes} />;
}
