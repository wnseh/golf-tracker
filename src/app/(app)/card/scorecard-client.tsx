'use client';

import { useState, useMemo } from 'react';
import type { InputMode, StgShot, PuttCard } from '@/lib/types';
import { MODE_LABELS } from '@/lib/constants';
import type { RawRound, RawHole } from './page';

/* ── Types ────────────────────────────────────────────────── */

type Period = 'all' | 'year' | '3months' | 'month';

interface HoleSummary {
  holeNum: number;
  par: number;
  score: number;
  putts: number | null;
  gir: boolean | null;
  notes: string | null;
}

interface RoundData {
  id: string;
  course: string;
  date: string;
  tee: string | null;
  holesPlanned: number;
  holesRecorded: number;
  mode: InputMode;
  scoreTotal: number;
  puttsTotal: number | null;
  puttsHoles: number;
  girCount: number | null;
  girDen: number;
  holes: HoleSummary[];
}

interface PeriodSummary {
  roundCount: number;
  holesCount: number;
  avgScore: number | null;
  avgPutts: number | null;
  girRate: number | null;
  girNum: number;
  girDen: number;
  puttsCoverage: number | null;
  girCoverage: number | null;
}

/* ── Constants ────────────────────────────────────────────── */

const PERIOD_LABELS: Record<Period, string> = {
  all: '전체',
  year: '올해',
  '3months': '3개월',
  month: '이번달',
};

const PERIOD_ORDER: Period[] = ['all', 'year', '3months', 'month'];

const modeBadgeClass: Record<InputMode, string> = {
  fun: 'bg-accent-dim text-accent',
  casual: 'bg-yellow-dim text-yellow',
  serious: 'bg-blue-dim text-blue',
};

/* ── Computation ──────────────────────────────────────────── */

function computeHoleSummary(rawHole: RawHole): HoleSummary {
  const stgShots = ((rawHole.stg_shots as StgShot[] | null) ?? []);
  const puttCards = ((rawHole.putt_cards as PuttCard[] | null) ?? []);

  // putts: if no putt cards → null (not recorded)
  const putts = puttCards.length > 0 ? puttCards.length : null;

  // GIR:
  // - stg_shots empty → null (unknown)
  // - any shot with result === 'GIR' → true
  // - else: stg_shots.length <= par - 2
  let gir: boolean | null = null;
  if (stgShots.length > 0) {
    const hasGirResult = stgShots.some((s) => s.result === 'GIR');
    gir = hasGirResult || stgShots.length <= rawHole.par - 2;
  }

  return {
    holeNum: rawHole.hole_num,
    par: rawHole.par,
    score: rawHole.score,
    putts,
    gir,
    notes: rawHole.notes,
  };
}

function computeRoundData(round: RawRound, holes: RawHole[]): RoundData {
  const sorted = [...holes].sort((a, b) => a.hole_num - b.hole_num);
  const holeSummaries = sorted.map(computeHoleSummary);

  const scoreTotal = holeSummaries.reduce((sum, h) => sum + h.score, 0);

  const puttsHoles = holeSummaries.filter((h) => h.putts !== null).length;
  const puttsTotal =
    puttsHoles > 0
      ? holeSummaries.reduce((sum, h) => sum + (h.putts ?? 0), 0)
      : null;

  const girsWithData = holeSummaries.filter((h) => h.gir !== null);
  const girDen = girsWithData.length;
  const girCount = girDen > 0 ? girsWithData.filter((h) => h.gir === true).length : null;

  return {
    id: round.id,
    course: round.course,
    date: round.date,
    tee: round.tee,
    holesPlanned: round.holes,
    holesRecorded: holes.length,
    mode: ((round.input_mode as InputMode) ?? 'serious'),
    scoreTotal,
    puttsTotal,
    puttsHoles,
    girCount,
    girDen,
    holes: holeSummaries,
  };
}

function getPeriodCutoff(period: Period): Date | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  if (period === '3months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function computePeriodSummary(rounds: RoundData[]): PeriodSummary {
  const roundCount = rounds.length;
  const holesCount = rounds.reduce((sum, r) => sum + r.holesRecorded, 0);

  const playedRounds = rounds.filter((r) => r.holesRecorded > 0);

  const avgScore =
    playedRounds.length > 0
      ? playedRounds.reduce(
          (sum, r) => sum + r.scoreTotal * (18 / r.holesPlanned),
          0,
        ) / playedRounds.length
      : null;

  const puttsRounds = playedRounds.filter((r) => r.puttsTotal !== null);
  const avgPutts =
    puttsRounds.length > 0
      ? puttsRounds.reduce(
          (sum, r) => sum + (r.puttsTotal as number) * (18 / r.holesPlanned),
          0,
        ) / puttsRounds.length
      : null;

  const girNum = rounds.reduce((sum, r) => sum + (r.girCount ?? 0), 0);
  const girDen = rounds.reduce((sum, r) => sum + r.girDen, 0);
  const girRate = girDen > 0 ? girNum / girDen : null;

  const puttsCoverage =
    playedRounds.length > 0 ? puttsRounds.length / playedRounds.length : null;

  const girRoundsWithData = playedRounds.filter((r) => r.girDen > 0);
  const girCoverage =
    playedRounds.length > 0
      ? girRoundsWithData.length / playedRounds.length
      : null;

  return {
    roundCount,
    holesCount,
    avgScore,
    avgPutts,
    girRate,
    girNum,
    girDen,
    puttsCoverage,
    girCoverage,
  };
}

/* ── Score diff helpers ──────────────────────────────────── */

function getScoreDiffClass(diff: number): string {
  if (diff <= -2) return 'text-blue';
  if (diff === -1) return 'text-yellow';
  if (diff === 0) return 'text-text2';
  if (diff === 1) return 'text-text';
  return 'text-red';
}

function getScoreDiffLabel(diff: number): string {
  if (diff === 0) return 'E';
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

/* ── Sub-components ──────────────────────────────────────── */

function PeriodFilter({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERIOD_ORDER.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            period === p
              ? 'bg-accent text-bg'
              : 'bg-surface2 text-text2 hover:bg-surface border border-border'
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function SummaryCards({ summary }: { summary: PeriodSummary }) {
  const fmtScore =
    summary.avgScore != null ? summary.avgScore.toFixed(1) : 'N/A';
  const fmtPutts =
    summary.avgPutts != null ? summary.avgPutts.toFixed(1) : 'N/A';
  const fmtGir =
    summary.girRate != null
      ? `${(summary.girRate * 100).toFixed(0)}%`
      : 'N/A';

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Avg Score */}
        <div className="pr-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text3">
            Avg Score
          </p>
          <p className="mt-1 text-xl font-mono font-semibold text-text">
            {fmtScore}
          </p>
          <p className="mt-0.5 text-[10px] text-text3">
            {summary.roundCount}라운드
          </p>
        </div>

        {/* Avg Putts */}
        <div className="px-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text3">
            Avg Putts
          </p>
          <p className="mt-1 text-xl font-mono font-semibold text-text">
            {fmtPutts}
          </p>
          <p className="mt-0.5 text-[10px] text-text3">
            {summary.puttsCoverage != null
              ? `${Math.round(summary.puttsCoverage * 100)}% 커버리지`
              : '데이터 없음'}
          </p>
        </div>

        {/* GIR */}
        <div className="pl-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text3">GIR</p>
          <p className="mt-1 text-xl font-mono font-semibold text-text">
            {fmtGir}
          </p>
          <p className="mt-0.5 text-[10px] text-text3">
            {summary.girDen > 0
              ? `${summary.girNum}/${summary.girDen} 홀`
              : '데이터 없음'}
          </p>
        </div>
      </div>
    </div>
  );
}

function HoleTable({ holes }: { holes: HoleSummary[] }) {
  if (holes.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-text3">
        홀 데이터가 기록되지 않았습니다
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left text-xs font-medium text-text3 w-8">
              H#
            </th>
            <th className="pb-2 text-center text-xs font-medium text-text3 w-10">
              Par
            </th>
            <th className="pb-2 text-center text-xs font-medium text-text3">
              Score
            </th>
            <th className="pb-2 text-center text-xs font-medium text-text3 w-12">
              Putts
            </th>
            <th className="pb-2 text-center text-xs font-medium text-text3 w-10">
              GIR
            </th>
            <th className="pb-2 text-left text-xs font-medium text-text3">
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {holes.map((hole) => {
            const diff = hole.score - hole.par;
            const colorClass = getScoreDiffClass(diff);
            return (
              <tr key={hole.holeNum} className="border-b border-border last:border-0">
                <td className="py-2 text-xs text-text3">{hole.holeNum}</td>
                <td className="py-2 text-center text-xs text-text2">
                  {hole.par}
                </td>
                <td className="py-2 text-center">
                  <span className={`font-mono font-semibold ${colorClass}`}>
                    {hole.score}
                  </span>
                  <span className={`ml-1 text-xs ${colorClass}`}>
                    ({getScoreDiffLabel(diff)})
                  </span>
                </td>
                <td className="py-2 text-center text-xs">
                  {hole.putts !== null ? (
                    <span className="text-text2">{hole.putts}</span>
                  ) : (
                    <span className="text-text3">—</span>
                  )}
                </td>
                <td className="py-2 text-center text-xs">
                  {hole.gir === null ? (
                    <span className="text-text3">—</span>
                  ) : hole.gir ? (
                    <span className="text-accent">✓</span>
                  ) : (
                    <span className="text-red">✗</span>
                  )}
                </td>
                <td className="py-2 text-left">
                  <span className="block max-w-[100px] truncate text-xs text-text3">
                    {hole.notes ?? ''}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RoundCard({ round }: { round: RoundData }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = new Date(round.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const girStr =
    round.girCount !== null && round.girDen > 0
      ? `GIR ${Math.round((round.girCount / round.girDen) * 100)}%`
      : null;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left transition hover:bg-surface2"
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{round.course}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${modeBadgeClass[round.mode]}`}
              >
                {MODE_LABELS[round.mode]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-text2">
              {dateStr}
              {round.tee && ` · ${round.tee} tee`}
              {' · '}
              {round.holesRecorded}/{round.holesPlanned} 홀
            </p>
          </div>

          {/* Right: score + stats */}
          <div className="shrink-0 text-right">
            <p className="text-xl font-mono font-semibold text-text">
              {round.holesRecorded > 0 ? round.scoreTotal : '—'}
            </p>
            <p className="mt-0.5 text-xs text-text3">
              {round.puttsTotal !== null && (
                <span>{round.puttsTotal}putts</span>
              )}
              {round.puttsTotal !== null && girStr && <span> · </span>}
              {girStr && <span>{girStr}</span>}
              {round.puttsTotal === null && !girStr && (
                <span>N/A</span>
              )}
            </p>
          </div>
        </div>

        {/* Chevron */}
        <div className="mt-2 flex justify-end">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className={`text-text3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-surface2 px-4 py-3">
          <HoleTable holes={round.holes} />
        </div>
      )}
    </div>
  );
}

/* ── Main Client Component ───────────────────────────────── */

interface ScorecardClientProps {
  rounds: RawRound[];
  holes: RawHole[];
}

export function ScorecardClient({ rounds, holes }: ScorecardClientProps) {
  const [period, setPeriod] = useState<Period>('all');

  // Build hole map: round_id → RawHole[]
  const holeMap = useMemo(() => {
    const map = new Map<string, RawHole[]>();
    for (const hole of holes) {
      const arr = map.get(hole.round_id) ?? [];
      arr.push(hole);
      map.set(hole.round_id, arr);
    }
    return map;
  }, [holes]);

  // Compute per-round data
  const allRoundData = useMemo(
    () =>
      rounds.map((r) => computeRoundData(r, holeMap.get(r.id) ?? [])),
    [rounds, holeMap],
  );

  // Apply period filter
  const filteredRounds = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    if (!cutoff) return allRoundData;
    return allRoundData.filter(
      (r) => new Date(r.date) >= cutoff,
    );
  }, [allRoundData, period]);

  // Compute period summary
  const periodSummary = useMemo(
    () => computePeriodSummary(filteredRounds),
    [filteredRounds],
  );

  /* ── Empty states ───────────────────────────────────────── */

  if (rounds.length === 0) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold">Scorecard</h1>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text2">라운드 기록이 없습니다</p>
          <p className="mt-1 text-sm text-text3">
            홈에서 새 라운드를 시작하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 pb-24">
      <h1 className="text-lg font-bold">Scorecard</h1>

      {/* Period Filter */}
      <PeriodFilter period={period} onChange={setPeriod} />

      {/* Summary KPIs */}
      <SummaryCards summary={periodSummary} />

      {/* Round List */}
      {filteredRounds.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-text2 text-sm">이 기간에 라운드가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      )}
    </div>
  );
}
