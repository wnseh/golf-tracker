/**
 * esg.ts — Pure eSG (Estimated Strokes Gained) computation library.
 * No Supabase imports. Used by server components.
 *
 * IMPORTANT: Always label outputs as "Estimated" — never use "SG" alone.
 */

import type { TeeRoutine, StgShot, PuttCard } from './types';

/* ── Types ──────────────────────────────────────────────────────────────── */

export type BaselineBucket = '0-5' | '6-10' | '11-15' | '16-20' | '21-25' | '26+';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

/** Map key: `${baseline_bucket}|${domain}|${key}` */
export type ExpectedStrokesMap = Map<string, number>;

export interface RoundInput {
  id: string;
  course: string;
  date: string;
  holesPlanned: number;
  handicap: number | null;
  inputMode: string;
  holes: HoleInput[];
}

export interface HoleInput {
  par: number;
  score: number;
  teeRoutine: TeeRoutine | null;
  stgShots: StgShot[];
  puttCards: PuttCard[];
}

export interface RoundMetricsData {
  roundId: string;
  date: string;
  course: string;
  userId: string;
  computedAt: string;

  baselineBucket: BaselineBucket;
  baselineConfidence: ConfidenceLevel;
  baselineSource: 'round_handicap' | 'skill_index' | 'default';

  holesPlayed: number;
  scoreTotal: number;
  scorePer18: number;

  puttsTotal: number | null;
  puttsPer18: number | null;

  girCount: number | null;
  girDen: number | null;
  girRate: number | null;

  teePenaltyCount: number | null;
  teeTroubleCount: number | null;
  teeDen: number | null;

  aroundDen: number | null;
  leaveOn: number | null;
  leave02: number | null;
  leave25: number | null;
  leave5p: number | null;
  leavePen: number | null;

  puttDen: number | null;
  putt01: number | null;
  putt12: number | null;
  putt25: number | null;
  putt58: number | null;
  putt8p: number | null;

  esgPutt: number | null;
  aroundCost: number | null;
  esgTee: number | null;
  esgTotal: number | null;

  coveragePutt: number;
  coverageAround: number;
  coverageTee: number;
  coverageOverall: number;

  confidencePutt: ConfidenceLevel;
  confidenceAround: ConfidenceLevel;
  confidenceTee: ConfidenceLevel;
}

export interface LeakItem {
  id: 'tee-penalty' | 'putting' | 'around';
  name: string;
  lossPerRound: number;
  sampleRounds: number;
  totalSamples: number;
  coverage: number;
  confidence: ConfidenceLevel;
  action: string;
}

export interface SkillIndexResult {
  skillIndex: number;
  baselineBucket: BaselineBucket;
  confidence: ConfidenceLevel;
  nRounds: number;
  holesEquiv: number;
  adjScoreMean: number;
  putterPer18: number | null;
  girPer18: number | null;
  penPer18: number | null;
  coverageOverall: number;
}

/* ── Expected Strokes Map ────────────────────────────────────────────────── */

interface ExpectedStrokesRow {
  baseline_bucket: string;
  domain: string;
  key: string;
  expected: number;
}

export function buildExpectedMap(rows: ExpectedStrokesRow[]): ExpectedStrokesMap {
  const map: ExpectedStrokesMap = new Map();
  for (const row of rows) {
    map.set(`${row.baseline_bucket}|${row.domain}|${row.key}`, row.expected);
  }
  return map;
}

function lookupExpected(
  map: ExpectedStrokesMap,
  bucket: BaselineBucket,
  domain: string,
  key: string,
): number | null {
  const v = map.get(`${bucket}|${domain}|${key}`);
  return v !== undefined ? v : null;
}

/* ── Baseline Bucket ─────────────────────────────────────────────────────── */

function handicapToBucket(hcp: number): BaselineBucket {
  if (hcp <= 5) return '0-5';
  if (hcp <= 10) return '6-10';
  if (hcp <= 15) return '11-15';
  if (hcp <= 20) return '16-20';
  if (hcp <= 25) return '21-25';
  return '26+';
}

function skillIndexToBucket(si: number): BaselineBucket {
  const clamped = Math.max(0, Math.min(30, si));
  if (clamped <= 5) return '0-5';
  if (clamped <= 10) return '6-10';
  if (clamped <= 15) return '11-15';
  if (clamped <= 20) return '16-20';
  if (clamped <= 25) return '21-25';
  return '26+';
}

export function computeBaselineBucket(
  handicap: number | null,
  latestSnapshot: { baseline_bucket: string; confidence: string } | null,
): {
  bucket: BaselineBucket;
  confidence: ConfidenceLevel;
  source: 'round_handicap' | 'skill_index' | 'default';
} {
  if (handicap !== null && handicap >= 0) {
    return {
      bucket: handicapToBucket(handicap),
      confidence: 'High',
      source: 'round_handicap',
    };
  }
  if (latestSnapshot) {
    const bucket = latestSnapshot.baseline_bucket as BaselineBucket;
    const conf = (latestSnapshot.confidence.charAt(0).toUpperCase() +
      latestSnapshot.confidence.slice(1).toLowerCase()) as ConfidenceLevel;
    return { bucket, confidence: conf, source: 'skill_index' };
  }
  return { bucket: '11-15', confidence: 'Low', source: 'default' };
}

/* ── Skill Index ─────────────────────────────────────────────────────────── */

export function computeSkillIndex(rounds: RoundInput[]): SkillIndexResult {
  const DEFAULT: SkillIndexResult = {
    skillIndex: 15,
    baselineBucket: '11-15',
    confidence: 'Low',
    nRounds: 0,
    holesEquiv: 0,
    adjScoreMean: 90,
    putterPer18: null,
    girPer18: null,
    penPer18: null,
    coverageOverall: 0,
  };

  // Filter: rounds with holesPlanned > 0 and some scored holes
  const valid = rounds
    .filter((r) => r.holesPlanned > 0 && r.holes.some((h) => h.score > 0))
    .slice(0, 10);

  if (valid.length < 4) return DEFAULT;

  const adjScores = valid.map((r) => {
    const scoreTotal = r.holes.reduce((s, h) => s + h.score, 0);
    return scoreTotal * (18 / r.holesPlanned);
  });

  let adjScoreMean: number;
  if (valid.length >= 8) {
    const sorted = [...adjScores].sort((a, b) => a - b);
    // Remove top 2 (best) and bottom 2 (worst) — "top" in golf = lowest score
    const trimmed = sorted.slice(2, sorted.length - 2);
    adjScoreMean = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
  } else {
    const sorted = [...adjScores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    adjScoreMean =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
  }

  // Ancillary metrics
  const puttsPerRound: number[] = [];
  const girPerRound: number[] = [];
  const penPerRound: number[] = [];

  for (const r of valid) {
    const holesWithPutts = r.holes.filter((h) => h.puttCards.length > 0);
    if (holesWithPutts.length > 0) {
      const pTotal = r.holes.reduce((s, h) => s + h.puttCards.length, 0);
      puttsPerRound.push(pTotal * (18 / r.holesPlanned));
    }

    const holesWithStg = r.holes.filter((h) => h.stgShots.length > 0);
    if (holesWithStg.length > 0) {
      let girCount = 0;
      for (const h of r.holes) {
        const hasGir = h.stgShots.some((s) => s.result === 'GIR');
        const byCount = h.stgShots.length > 0 && h.stgShots.length <= h.par - 2;
        if (hasGir || byCount) girCount++;
      }
      girPerRound.push(girCount * (18 / r.holesPlanned));
    }

    // Tee penalty from landing
    let pen = 0;
    for (const h of r.holes) {
      if (h.teeRoutine?.landing === 'OB' || h.teeRoutine?.landing === 'HZ') pen++;
    }
    penPerRound.push(pen * (18 / r.holesPlanned));
  }

  const putterPer18 =
    puttsPerRound.length > 0
      ? puttsPerRound.reduce((s, v) => s + v, 0) / puttsPerRound.length
      : null;
  const girPer18 =
    girPerRound.length > 0
      ? girPerRound.reduce((s, v) => s + v, 0) / girPerRound.length
      : null;
  const penPer18 =
    penPerRound.length > 0
      ? penPerRound.reduce((s, v) => s + v, 0) / penPerRound.length
      : null;

  // SkillIndex: Base = AdjScoreMean - 72, clamped 0-30
  let si = Math.max(0, Math.min(30, adjScoreMean - 72));

  if (putterPer18 !== null) {
    if (putterPer18 >= 36) si += 2;
    else if (putterPer18 <= 30) si -= 1;
  }
  if (girPer18 !== null) {
    if (girPer18 >= 10) si -= 2;
    else if (girPer18 <= 4) si += 1;
  }
  if (penPer18 !== null) {
    if (penPer18 >= 2) si += 2;
    else if (penPer18 === 0) si -= 0.5;
  }

  si = Math.max(0, Math.min(30, si));

  // Coverage
  const covScore = valid.length / 10;
  const covPutt = puttsPerRound.length / valid.length;
  const covGir = girPerRound.length / valid.length;
  const covPen = penPerRound.length / valid.length;
  const coverageOverall = 0.5 * covScore + 0.2 * covPutt + 0.2 * covGir + 0.1 * covPen;

  // Confidence
  const has18share = valid.filter((r) => r.holesPlanned === 18).length / valid.length >= 0.6;
  let confidence: ConfidenceLevel;
  if (valid.length >= 8 && coverageOverall >= 0.7 && has18share) {
    confidence = 'High';
  } else if (valid.length >= 4 || coverageOverall >= 0.4) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  const holesEquiv = valid.reduce((s, r) => s + r.holesPlanned, 0);

  return {
    skillIndex: si,
    baselineBucket: skillIndexToBucket(si),
    confidence,
    nRounds: valid.length,
    holesEquiv,
    adjScoreMean,
    putterPer18,
    girPer18,
    penPer18,
    coverageOverall,
  };
}

/* ── Confidence Helper ───────────────────────────────────────────────────── */

export function getConfidence(
  den: number,
  minHigh: number,
  minMed: number,
  covHigh: number,
  covMed: number,
  cov: number,
): ConfidenceLevel {
  if (den >= minHigh && cov >= covHigh) return 'High';
  if (den >= minMed || cov >= covMed) return 'Medium';
  return 'Low';
}

/* ── Round Metrics Computation ───────────────────────────────────────────── */

export function computeRoundMetrics(
  round: RoundInput,
  userId: string,
  expectedMap: ExpectedStrokesMap,
  baselineBucket: BaselineBucket,
  baselineSource: 'round_handicap' | 'skill_index' | 'default',
  baselineConfidence: ConfidenceLevel,
): RoundMetricsData {
  const holes = round.holes;
  const holesPlayed = holes.length;
  const scoreTotal = holes.reduce((s, h) => s + h.score, 0);
  const scorePer18 = holesPlayed > 0 ? scoreTotal * (18 / holesPlayed) : scoreTotal;

  /* ── Putting metrics ── */
  let puttsTotal = 0;
  let puttsHoles = 0;
  let puttDen = 0;
  let putt01 = 0, putt12 = 0, putt25 = 0, putt58 = 0, putt8p = 0;
  let esgPuttSum = 0;
  let esgPuttDen = 0;

  for (const h of holes) {
    if (h.puttCards.length > 0) {
      puttsTotal += h.puttCards.length;
      puttsHoles++;
    }
    for (const p of h.puttCards) {
      if (p.distBucket) {
        puttDen++;
        if (p.distBucket === '0-1m') putt01++;
        else if (p.distBucket === '1-2m') putt12++;
        else if (p.distBucket === '2-5m') putt25++;
        else if (p.distBucket === '5-8m') putt58++;
        else if (p.distBucket === '8m+') putt8p++;

        const ePutt = lookupExpected(expectedMap, baselineBucket, 'PUTT', `putt:${p.distBucket}`);
        if (ePutt !== null) {
          esgPuttSum += ePutt;
          esgPuttDen++;
        }
      }
    }
  }

  const puttsResult = puttsHoles > 0 ? puttsTotal : null;
  const puttsPer18 = puttsResult !== null && holesPlayed > 0
    ? puttsResult * (18 / holesPlayed)
    : null;

  // eSG_putt = Σ(E_putt) - actual_putts (only if we have expected values for all tracked putts)
  const esgPutt = puttDen > 0 ? esgPuttSum - puttsTotal : null;

  // Putting coverage: putt cards with distBucket / total putt cards
  const totalPuttCards = holes.reduce((s, h) => s + h.puttCards.length, 0);
  const coveragePutt = totalPuttCards > 0 ? puttDen / totalPuttCards : 0;

  const confidencePutt = getConfidence(puttDen, 20, 10, 0.7, 0.4, coveragePutt);

  /* ── GIR metrics ── */
  let girCount = 0;
  let girDen = 0;
  for (const h of holes) {
    if (h.stgShots.length > 0) {
      girDen++;
      const hasGir = h.stgShots.some((s) => s.result === 'GIR');
      const byCount = h.stgShots.length <= h.par - 2;
      if (hasGir || byCount) girCount++;
    }
  }
  const girCountResult = girDen > 0 ? girCount : null;
  const girDenResult = girDen > 0 ? girDen : null;
  const girRate = girDen > 0 ? girCount / girDen : null;

  /* ── Tee metrics ── */
  let teePenaltyCount = 0;
  let teeTroubleCount = 0;
  let teeDen = 0;
  for (const h of holes) {
    if (h.teeRoutine) {
      teeDen++;
      const landing = h.teeRoutine.landing;
      if (landing === 'OB' || landing === 'HZ') teePenaltyCount++;
      else if (landing === 'BK') teeTroubleCount++;
    }
  }

  const esgTee = teeDen > 0 ? -(teePenaltyCount * 1.5 + teeTroubleCount * 0.5) : null;
  const coverageTee = holesPlayed > 0 ? teeDen / holesPlayed : 0;

  const confidenceTee: ConfidenceLevel =
    teeDen >= holesPlayed * 0.8 ? 'High' :
    teeDen >= holesPlayed * 0.5 ? 'Medium' : 'Low';

  /* ── Around / Approach / ARG metrics ── */
  let aroundDen = 0;
  let leaveOn = 0, leave02 = 0, leave25 = 0, leave5p = 0, leavePen = 0;
  let aroundCostSum = 0;

  const relevantShots = holes.flatMap((h) =>
    h.stgShots.filter(
      (s) => s.intent === 'approach' || s.intent === 'arg' || s.intent === 'recovery',
    ),
  );

  for (const shot of relevantShots) {
    if (shot.leaveDistBucket) {
      aroundDen++;
      if (shot.leaveDistBucket === 'ON') leaveOn++;
      else if (shot.leaveDistBucket === '0-2m') leave02++;
      else if (shot.leaveDistBucket === '2-5m') leave25++;
      else if (shot.leaveDistBucket === '5m+') leave5p++;
      else if (shot.leaveDistBucket === 'PEN') leavePen++;

      const eAround = lookupExpected(
        expectedMap,
        baselineBucket,
        'AROUND',
        `leave:${shot.leaveDistBucket}`,
      );
      if (eAround !== null) aroundCostSum += eAround;
    }
  }

  const aroundCost = aroundDen > 0 ? aroundCostSum : null;

  // Coverage: shots with leaveDistBucket / total shots in scope
  const coverageAround = relevantShots.length > 0 ? aroundDen / relevantShots.length : 0;

  const confidenceAround = getConfidence(aroundDen, 12, 6, 0.7, 0.4, coverageAround);

  /* ── eSG total ── */
  const esgComponents = [esgPutt, aroundCost !== null ? -aroundCostSum : null, esgTee]
    .filter((v) => v !== null) as number[];
  const esgTotal = esgComponents.length > 0
    ? esgComponents.reduce((s, v) => s + v, 0)
    : null;

  /* ── Overall coverage ── */
  const coverageOverall =
    0.5 * 1 + // score always present
    0.2 * coveragePutt +
    0.2 * coverageAround +
    0.1 * coverageTee;

  return {
    roundId: round.id,
    date: round.date,
    course: round.course,
    userId,
    computedAt: new Date().toISOString(),

    baselineBucket,
    baselineConfidence,
    baselineSource,

    holesPlayed,
    scoreTotal,
    scorePer18,

    puttsTotal: puttsResult,
    puttsPer18,

    girCount: girCountResult,
    girDen: girDenResult,
    girRate,

    teePenaltyCount: teeDen > 0 ? teePenaltyCount : null,
    teeTroubleCount: teeDen > 0 ? teeTroubleCount : null,
    teeDen: teeDen > 0 ? teeDen : null,

    aroundDen: aroundDen > 0 ? aroundDen : null,
    leaveOn: aroundDen > 0 ? leaveOn : null,
    leave02: aroundDen > 0 ? leave02 : null,
    leave25: aroundDen > 0 ? leave25 : null,
    leave5p: aroundDen > 0 ? leave5p : null,
    leavePen: aroundDen > 0 ? leavePen : null,

    puttDen: puttDen > 0 ? puttDen : null,
    putt01: puttDen > 0 ? putt01 : null,
    putt12: puttDen > 0 ? putt12 : null,
    putt25: puttDen > 0 ? putt25 : null,
    putt58: puttDen > 0 ? putt58 : null,
    putt8p: puttDen > 0 ? putt8p : null,

    esgPutt,
    aroundCost,
    esgTee,
    esgTotal,

    coveragePutt,
    coverageAround,
    coverageTee,
    coverageOverall,

    confidencePutt,
    confidenceAround,
    confidenceTee,
  };
}

/* ── Leak Ranking ────────────────────────────────────────────────────────── */

export function rankLeaks(metrics: RoundMetricsData[]): LeakItem[] {
  if (metrics.length === 0) return [];

  const leaks: LeakItem[] = [];

  /* ── Tee Penalty ── */
  const teeMetrics = metrics.filter(
    (m) => m.teeDen !== null && m.teeDen > 0 && m.esgTee !== null,
  );
  if (teeMetrics.length > 0) {
    const avgTeeLoss = teeMetrics.reduce((s, m) => s + Math.abs(m.esgTee!), 0) / teeMetrics.length;
    const avgCov = teeMetrics.reduce((s, m) => s + m.coverageTee, 0) / teeMetrics.length;
    const totalPenalties = teeMetrics.reduce((s, m) => s + (m.teePenaltyCount ?? 0), 0);

    // Only rank if there are actual penalties
    if (totalPenalties > 0) {
      const confidence = pickWorstConfidence(teeMetrics.map((m) => m.confidenceTee));
      leaks.push({
        id: 'tee-penalty',
        name: 'Tee Penalty',
        lossPerRound: avgTeeLoss,
        sampleRounds: teeMetrics.length,
        totalSamples: totalPenalties,
        coverage: avgCov,
        confidence,
        action:
          '티샷 OB·해저드를 줄이세요. 클럽 1개 다운으로 페어웨이 안착률을 높이세요.',
      });
    }
  }

  /* ── Putting ── */
  const puttMetrics = metrics.filter(
    (m) => m.puttDen !== null && m.puttDen > 0 && m.esgPutt !== null,
  );
  if (puttMetrics.length > 0) {
    const avgPuttLoss = puttMetrics.reduce((s, m) => s + m.esgPutt!, 0) / puttMetrics.length;

    // Determine worst bucket across all rounds
    const total8p = puttMetrics.reduce((s, m) => s + (m.putt8p ?? 0), 0);
    const total12 = puttMetrics.reduce((s, m) => s + (m.putt12 ?? 0), 0);
    const totalDen = puttMetrics.reduce((s, m) => s + (m.puttDen ?? 0), 0);

    let action: string;
    if (totalDen > 0 && total8p / totalDen > 0.25) {
      action = '롱퍼트(8m+) 거리 조절 연습으로 3퍼트를 줄이세요. 스트로크 템포보다 거리감이 핵심입니다.';
    } else if (totalDen > 0 && total12 / totalDen > 0.25) {
      action = '숏퍼트(1-2m) 루틴 일관성을 높이세요. 셋업 반복 연습이 효과적입니다.';
    } else {
      action = '퍼팅 거리 조절 연습을 통해 기대 퍼트 수를 줄이세요.';
    }

    const avgCov = puttMetrics.reduce((s, m) => s + m.coveragePutt, 0) / puttMetrics.length;
    const confidence = pickWorstConfidence(puttMetrics.map((m) => m.confidencePutt));

    leaks.push({
      id: 'putting',
      name: 'Putting',
      lossPerRound: avgPuttLoss,
      sampleRounds: puttMetrics.length,
      totalSamples: totalDen,
      coverage: avgCov,
      confidence,
      action,
    });
  }

  /* ── Around the Green ── */
  const aroundMetrics = metrics.filter(
    (m) => m.aroundDen !== null && m.aroundDen > 0 && m.aroundCost !== null,
  );
  if (aroundMetrics.length > 0) {
    const avgAroundCost = aroundMetrics.reduce((s, m) => s + m.aroundCost!, 0) / aroundMetrics.length;
    const avgCov = aroundMetrics.reduce((s, m) => s + m.coverageAround, 0) / aroundMetrics.length;
    const totalDen = aroundMetrics.reduce((s, m) => s + (m.aroundDen ?? 0), 0);
    const confidence = pickWorstConfidence(aroundMetrics.map((m) => m.confidenceAround));

    leaks.push({
      id: 'around',
      name: 'Around the Green',
      lossPerRound: avgAroundCost,
      sampleRounds: aroundMetrics.length,
      totalSamples: totalDen,
      coverage: avgCov,
      confidence,
      action:
        '그린 주변 5m 이내로 남기는 컨트롤 샷을 집중 연습하세요. 거리보다 정확성이 핵심입니다.',
    });
  }

  // Sort: tee-penalty/putting by absolute loss desc; around by cost desc
  leaks.sort((a, b) => {
    const aLoss = a.id === 'around' ? a.lossPerRound : Math.abs(a.lossPerRound);
    const bLoss = b.id === 'around' ? b.lossPerRound : Math.abs(b.lossPerRound);
    return bLoss - aLoss;
  });

  return leaks.slice(0, 2);
}

function pickWorstConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.includes('Low')) return 'Low';
  if (levels.includes('Medium')) return 'Medium';
  return 'High';
}
