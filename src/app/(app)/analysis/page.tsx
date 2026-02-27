import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { TeeRoutine, StgShot, PuttCard } from '@/lib/types';
import {
  buildExpectedMap,
  computeSkillIndex,
  computeBaselineBucket,
  computeRoundMetrics,
  rankLeaks,
  type RoundInput,
  type HoleInput,
  type RoundMetricsData,
  type LeakItem,
  type BaselineBucket,
  type ConfidenceLevel,
} from '@/lib/esg';
import { AnalysisClient } from './analysis-client';

/* ── Raw DB row types ──────────────────────────────────────────────────── */

export interface RawRound {
  id: string;
  user_id: string;
  course: string;
  date: string;
  holes: number;
  handicap: number | null;
  input_mode: string;
  created_at: string;
  updated_at: string | null;
}

export interface RawHole {
  id: string;
  round_id: string;
  hole_num: number;
  par: number;
  score: number;
  tee_routine: TeeRoutine | null;
  stg_shots: StgShot[] | null;
  putt_cards: PuttCard[] | null;
  notes: string | null;
}

export interface RawExpectedStroke {
  baseline_bucket: string;
  domain: string;
  key: string;
  expected: number;
}

export interface RawSkillSnapshot {
  baseline_bucket: string;
  confidence: string;
  computed_at: string;
}

export interface RawRoundMetrics {
  round_id: string;
  computed_at: string;
}

/* ── Exported page data type (consumed by client) ──────────────────────── */

export interface AnalysisPageData {
  allMetrics: RoundMetricsData[];
  leaks: LeakItem[];
  baselineBucket: BaselineBucket;
  baselineConfidence: ConfidenceLevel;
  baselineSource: 'round_handicap' | 'skill_index' | 'default';
}

/* ── Helper: convert raw DB rows to RoundInput ─────────────────────────── */

function toRoundInput(raw: RawRound, rawHoles: RawHole[]): RoundInput {
  const holes: HoleInput[] = rawHoles.map((h) => ({
    par: h.par,
    score: h.score,
    teeRoutine: h.tee_routine,
    stgShots: (h.stg_shots as StgShot[] | null) ?? [],
    puttCards: (h.putt_cards as PuttCard[] | null) ?? [],
  }));
  return {
    id: raw.id,
    course: raw.course,
    date: raw.date,
    holesPlanned: raw.holes,
    handicap: raw.handicap,
    inputMode: raw.input_mode,
    holes,
  };
}

/* ── Server Component ──────────────────────────────────────────────────── */

export default async function AnalysisPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  /* ── Fetch data ── */

  const [roundsRes, holesRes, expectedRes, snapshotRes, existingMetricsRes] =
    await Promise.all([
      supabase
        .from('rounds')
        .select('id, user_id, course, date, holes, handicap, input_mode, created_at, updated_at')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),

      supabase
        .from('holes')
        .select('id, round_id, hole_num, par, score, tee_routine, stg_shots, putt_cards, notes')
        .eq('user_id', user.id),

      supabase.from('expected_strokes').select('baseline_bucket, domain, key, expected'),

      supabase
        .from('skill_index_snapshots')
        .select('baseline_bucket, confidence, computed_at')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(1),

      supabase
        .from('round_metrics')
        .select('round_id, computed_at')
        .eq('user_id', user.id),
    ]);

  const rounds = (roundsRes.data ?? []) as RawRound[];
  const holes = (holesRes.data ?? []) as RawHole[];
  const expectedRows = (expectedRes.data ?? []) as RawExpectedStroke[];
  const latestSnapshot = (snapshotRes.data?.[0] ?? null) as RawSkillSnapshot | null;
  const existingMetrics = (existingMetricsRes.data ?? []) as RawRoundMetrics[];

  /* ── Build maps ── */

  const expectedMap = buildExpectedMap(expectedRows);

  const holeMap = new Map<string, RawHole[]>();
  for (const h of holes) {
    const arr = holeMap.get(h.round_id) ?? [];
    arr.push(h);
    holeMap.set(h.round_id, arr);
  }

  // Map: round_id → computed_at
  const metricsComputedAt = new Map<string, string>();
  for (const m of existingMetrics) {
    metricsComputedAt.set(m.round_id, m.computed_at);
  }

  /* ── Compute SkillIndex → maybe upsert snapshot ── */

  const roundInputsForSkill = rounds.map((r) =>
    toRoundInput(r, holeMap.get(r.id) ?? []),
  );
  const skillResult = computeSkillIndex(roundInputsForSkill);

  // Upsert skill_index_snapshots if no snapshot or older than 1 day
  const oneDayMs = 24 * 60 * 60 * 1000;
  const snapshotStale =
    !latestSnapshot ||
    Date.now() - new Date(latestSnapshot.computed_at).getTime() > oneDayMs;

  if (snapshotStale && skillResult.nRounds >= 4) {
    await supabase.from('skill_index_snapshots').insert({
      user_id: user.id,
      computed_at: skillResult.nRounds > 0 ? new Date().toISOString() : undefined,
      n_rounds: skillResult.nRounds,
      holes_equiv: skillResult.holesEquiv,
      adj_score_mean: skillResult.adjScoreMean,
      putts_per18: skillResult.putterPer18,
      gir_per18: skillResult.girPer18,
      penalty_per18: skillResult.penPer18,
      skill_index: skillResult.skillIndex,
      baseline_bucket: skillResult.baselineBucket,
      coverage_overall: skillResult.coverageOverall,
      confidence: skillResult.confidence.toLowerCase(),
    });
  }

  /* ── Compute round_metrics with stale check ── */

  const toUpsert: object[] = [];
  const allMetrics: RoundMetricsData[] = [];

  for (const rawRound of rounds) {
    const rawHoles = holeMap.get(rawRound.id) ?? [];
    if (rawHoles.length === 0) continue; // no holes recorded → skip

    const roundInput = toRoundInput(rawRound, rawHoles);

    // Stale check: recompute if no metrics OR rounds.updated_at > metrics.computed_at
    const existingComputedAt = metricsComputedAt.get(rawRound.id);
    const roundUpdatedAt = rawRound.updated_at ?? rawRound.created_at;
    const isStale =
      !existingComputedAt ||
      new Date(roundUpdatedAt) > new Date(existingComputedAt);

    // Determine baseline for this round
    const { bucket, confidence, source } = computeBaselineBucket(
      rawRound.handicap,
      latestSnapshot,
    );

    let metrics: RoundMetricsData;
    if (isStale) {
      metrics = computeRoundMetrics(roundInput, user.id, expectedMap, bucket, source, confidence);

      // Prepare upsert row (snake_case for Supabase)
      toUpsert.push({
        round_id: rawRound.id,
        user_id: user.id,
        computed_at: metrics.computedAt,
        baseline_bucket: metrics.baselineBucket,
        baseline_confidence: metrics.baselineConfidence,
        baseline_source: metrics.baselineSource,
        holes_played: metrics.holesPlayed,
        score_total: metrics.scoreTotal,
        score_per18: metrics.scorePer18,
        putts_total: metrics.puttsTotal,
        putts_per18: metrics.puttsPer18,
        gir_count: metrics.girCount,
        gir_den: metrics.girDen,
        gir_rate: metrics.girRate,
        tee_penalty_count: metrics.teePenaltyCount,
        tee_trouble_count: metrics.teeTroubleCount,
        tee_den: metrics.teeDen,
        around_den: metrics.aroundDen,
        leave_on: metrics.leaveOn,
        leave_02: metrics.leave02,
        leave_25: metrics.leave25,
        leave_5p: metrics.leave5p,
        leave_pen: metrics.leavePen,
        putt_den: metrics.puttDen,
        putt_01: metrics.putt01,
        putt_12: metrics.putt12,
        putt_25: metrics.putt25,
        putt_58: metrics.putt58,
        putt_8p: metrics.putt8p,
        esg_putt: metrics.esgPutt,
        around_cost: metrics.aroundCost,
        esg_tee: metrics.esgTee,
        esg_total: metrics.esgTotal,
        coverage_putt: metrics.coveragePutt,
        coverage_around: metrics.coverageAround,
        coverage_tee: metrics.coverageTee,
        coverage_overall: metrics.coverageOverall,
        confidence_putt: metrics.confidencePutt,
        confidence_around: metrics.confidenceAround,
        confidence_tee: metrics.confidenceTee,
      });
    } else {
      // Use existing (not stale) — still compute in-memory for this request
      metrics = computeRoundMetrics(roundInput, user.id, expectedMap, bucket, source, confidence);
    }

    allMetrics.push(metrics);
  }

  // Bulk upsert stale metrics
  if (toUpsert.length > 0) {
    await supabase
      .from('round_metrics')
      .upsert(toUpsert, { onConflict: 'round_id' });
  }

  /* ── Rank leaks over ALL metrics ── */

  const leaks = rankLeaks(allMetrics);

  // Overall baseline for display: use latest round's handicap or skill_index snapshot
  const latestRound = rounds[0] ?? null;
  const { bucket: baselineBucket, confidence: baselineConfidence, source: baselineSource } =
    computeBaselineBucket(latestRound?.handicap ?? null, latestSnapshot);

  /* ── Render ── */

  const pageData: AnalysisPageData = {
    allMetrics,
    leaks,
    baselineBucket,
    baselineConfidence,
    baselineSource,
  };

  return <AnalysisClient data={pageData} />;
}
