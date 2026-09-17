import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Round, HoleData, Shot, HoleLenBucket } from '@/lib/types';
import { HoleInput } from './hole-input';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoundPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

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
    weather: roundRow.weather ?? null,
    temperature: roundRow.temperature != null ? Number(roundRow.temperature) : null,
    roundTime: roundRow.round_time ?? null,
    createdAt: roundRow.created_at,
  };

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
    holeLen: (h.hole_len_bucket as HoleLenBucket | null) ?? null,
    shots: (h.shots as Shot[] | null) ?? null,
    notes: h.notes ?? '',
    savedAt: h.saved_at,
  }));

  return <HoleInput round={round} savedHoles={savedHoles} />;
}
