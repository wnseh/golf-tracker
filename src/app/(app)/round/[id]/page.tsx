import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/log';
import type { Round, HoleData, Shot, HoleLenBucket } from '@/lib/types';
import { HoleInput } from './hole-input';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoundPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();   // DB 호출 없이 404 (22P02 방지)

  const supabase = await createClient();

  // maybeSingle: 0행은 error가 아니라 null → "없음(404)"과 "DB 실패(error.tsx)"를 가른다
  const { data: roundRow, error: roundErr } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (roundErr) {
    logError('round-page.round', roundErr, { roundId: id });
    throw new Error('라운드를 불러오지 못했습니다');
  }
  if (!roundRow) notFound();   // 없거나 RLS로 안 보임 (남의 라운드도 404, 존재를 노출하지 않음)

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

  const { data: holeRows, error: holesErr } = await supabase
    .from('holes')
    .select('*')
    .eq('round_id', id)
    .order('hole_num', { ascending: true });

  // 홀 로드 실패를 빈 목록으로 넘기면 사용자가 빈 홀을 다시 입력해 서버 데이터를 덮어쓸 수 있다 → 반드시 실패로
  if (holesErr) {
    logError('round-page.holes', holesErr, { roundId: id });
    throw new Error('홀 데이터를 불러오지 못했습니다');
  }

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
