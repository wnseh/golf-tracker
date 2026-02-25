import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Round, HoleData, UserClub } from '@/lib/types';
import { migrateTeeRoutine, migrateStgShot, migratePuttCard } from '@/lib/migration';
import { HoleInput } from './hole-input';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoundPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch round
  const { data: roundRow, error: roundErr } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .single();

  if (roundErr || !roundRow) notFound();

  const round: Round = {
    id: roundRow.id,
    userId: roundRow.user_id,
    course: roundRow.course,
    date: roundRow.date,
    tee: roundRow.tee,
    handicap: roundRow.handicap,
    rating: roundRow.rating,
    holes: roundRow.holes,
    createdAt: roundRow.created_at,
  };

  // Fetch saved holes
  const { data: holeRows } = await supabase
    .from('holes')
    .select('*')
    .eq('round_id', id)
    .order('hole_num', { ascending: true });

  const savedHoles: HoleData[] = (holeRows ?? []).map((h) => ({
    id: h.id,
    roundId: h.round_id,
    holeNum: h.hole_num,
    par: h.par,
    score: h.score,
    teeRoutine: migrateTeeRoutine((h.tee_routine ?? {}) as Record<string, unknown>),
    stgShots: ((h.stg_shots ?? []) as Record<string, unknown>[]).map(migrateStgShot),
    puttCards: ((h.putt_cards ?? []) as Record<string, unknown>[]).map(migratePuttCard),
    notes: h.notes ?? '',
    savedAt: h.saved_at,
  }));

  // Fetch user clubs
  const { data: clubRows } = await supabase
    .from('user_clubs')
    .select('*')
    .eq('user_id', round.userId)
    .order('sort_order', { ascending: true });

  const userClubs: UserClub[] = (clubRows ?? []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    clubName: c.club_name,
    carryM: Number(c.carry_m),
    totalM: Number(c.total_m),
    sortOrder: c.sort_order,
  }));

  return <HoleInput round={round} savedHoles={savedHoles} userClubs={userClubs} />;
}
