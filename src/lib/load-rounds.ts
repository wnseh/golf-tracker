/**
 * load-rounds.ts — 서버 전용. 유저의 라운드 + 홀을 읽어 stat/SG를 계산한 요약을 돌려준다.
 * Card / Analysis 페이지가 공용으로 사용.
 */

import { createClient } from './supabase/server';
import { logError } from './log';
import type { Shot, HoleLenBucket } from './types';
import { holeLenMid } from './constants';
import { holeStats, roundStats, isLedgerComplete, type HoleStats, type RoundStats } from './stats';
import { holeSG, roundSG, type RoundSG } from './sg';

export interface HoleRow extends HoleStats {
  holeNum: number;
  notes: string | null;
  sgTotal: number | null;   // 원장 완성 홀만
}

export interface RoundSummary {
  id:           string;
  course:       string;
  date:         string;
  tee:          string | null;
  holesPlanned: number;
  holes:        HoleRow[];
  stats:        RoundStats;
  sg:           RoundSG | null;
}

interface RawRound {
  id: string; course: string; date: string; tee: string | null; holes: number;
}
interface RawHole {
  round_id: string; hole_num: number; par: number; score: number;
  hole_len_bucket: string | null; shots: Shot[] | null; notes: string | null;
}

export async function loadRoundSummaries(userId: string): Promise<RoundSummary[]> {
  const supabase = await createClient();

  const [roundsRes, holesRes] = await Promise.all([
    supabase
      .from('rounds')
      .select('id, course, date, tee, holes')
      .eq('user_id', userId)
      .order('date', { ascending: false }),
    supabase
      .from('holes')
      .select('round_id, hole_num, par, score, hole_len_bucket, shots, notes')
      .eq('user_id', userId),
  ]);

  // 부분 데이터로 stat/SG를 내면 "미기록은 N/A" 규칙을 어기고 틀린 숫자가 나온다 → 실패는 실패로 (error.tsx)
  if (roundsRes.error) {
    logError('load-rounds.rounds', roundsRes.error, { userId });
    throw new Error('라운드를 불러오지 못했습니다');
  }
  if (holesRes.error) {
    logError('load-rounds.holes', holesRes.error, { userId });
    throw new Error('홀 데이터를 불러오지 못했습니다');
  }
  const rounds = (roundsRes.data ?? []) as RawRound[];
  const holes = (holesRes.data ?? []) as RawHole[];

  const byRound = new Map<string, RawHole[]>();
  for (const h of holes) {
    const arr = byRound.get(h.round_id) ?? [];
    arr.push(h);
    byRound.set(h.round_id, arr);
  }

  return rounds.map((r) => {
    const raw = (byRound.get(r.id) ?? [])
      .filter((h) => h.hole_num <= r.holes)          // 홀 수를 줄인 라운드의 초과 홀 무시
      .sort((a, b) => a.hole_num - b.hole_num);

    const holeRows: HoleRow[] = [];
    const holeSgs = [];

    for (const h of raw) {
      const st = holeStats(h.par, h.score, h.shots);
      let sgTotal: number | null = null;
      if (isLedgerComplete(h.shots)) {
        const sg = holeSG(h.par, holeLenMid(h.hole_len_bucket as HoleLenBucket | null), h.shots);
        holeSgs.push(sg);
        sgTotal = sg.total;
      }
      holeRows.push({ ...st, holeNum: h.hole_num, notes: h.notes, sgTotal });
    }

    return {
      id: r.id,
      course: r.course,
      date: r.date,
      tee: r.tee,
      holesPlanned: r.holes,
      holes: holeRows,
      stats: roundStats(holeRows, r.holes),
      sg: roundSG(holeSgs),
    };
  });
}
