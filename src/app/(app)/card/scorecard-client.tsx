'use client';

import { useState, useMemo } from 'react';
import type { RoundSummary, HoleRow } from '@/lib/load-rounds';
import { periodStats } from '@/lib/stats';
import { PeriodFilter, getPeriodCutoff, type Period } from '@/components/stats/period-filter';
import { ElliottTiles } from '@/components/stats/elliott-tiles';

/* ── helpers ──────────────────────────────────────────────── */

function scoreDiffClass(diff: number): string {
  if (diff <= -2) return 'text-blue';
  if (diff === -1) return 'text-yellow';
  if (diff === 0) return 'text-text2';
  if (diff === 1) return 'text-text';
  return 'text-red';
}
function scoreDiffLabel(diff: number): string {
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : String(diff);
}
function yn(v: boolean | null) {
  if (v === null) return <span className="text-text3">—</span>;
  return v ? <span className="text-accent">✓</span> : <span className="text-red">✗</span>;
}
function n(v: number | null) {
  return v === null ? <span className="text-text3">—</span> : <span className="text-text2">{v}</span>;
}

/* ── hole table ───────────────────────────────────────────── */

function HoleTable({ holes }: { holes: HoleRow[] }) {
  if (holes.length === 0) {
    return <p className="py-3 text-center text-sm text-text3">홀 데이터가 기록되지 않았습니다</p>;
  }
  const th = 'pb-2 text-center text-xs font-medium text-text3';
  return (
    <div className="overflow-x-auto">
      <table data-testid="hole-table" className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={`${th} text-left w-8`}>H#</th>
            <th className={`${th} w-8`}>Par</th>
            <th className={th}>Score</th>
            <th className={`${th} w-8`}>FIR</th>
            <th className={`${th} w-8`}>GIR</th>
            <th className={`${th} w-10`}>Putt</th>
            <th className={`${th} w-8`}>Pen</th>
            <th className={`${th} w-12`}>SG</th>
          </tr>
        </thead>
        <tbody>
          {holes.map((h) => {
            const diff = h.score - h.par;
            const c = scoreDiffClass(diff);
            return (
              <tr key={h.holeNum} data-testid="hole-table-row" data-hole={h.holeNum} className="border-b border-border last:border-0">
                <td className="py-2 text-xs text-text3">{h.holeNum}</td>
                <td className="py-2 text-center text-xs text-text2">{h.par}</td>
                <td className="py-2 text-center">
                  <span className={`font-mono font-semibold ${c}`}>{h.score}</span>
                  <span className={`ml-1 text-xs ${c}`}>({scoreDiffLabel(diff)})</span>
                </td>
                <td className="py-2 text-center text-xs">{yn(h.fir)}</td>
                <td className="py-2 text-center text-xs">{yn(h.gir)}</td>
                <td className="py-2 text-center text-xs">{n(h.putts)}</td>
                <td className="py-2 text-center text-xs">{n(h.penalties)}</td>
                <td className="py-2 text-center text-xs font-mono">
                  {h.sgTotal === null
                    ? <span className="text-text3">—</span>
                    : <span className={h.sgTotal >= 0 ? 'text-accent' : 'text-red'}>{h.sgTotal > 0 ? '+' : ''}{h.sgTotal.toFixed(1)}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── round card ───────────────────────────────────────────── */

function RoundCard({ round }: { round: RoundSummary }) {
  const [expanded, setExpanded] = useState(false);
  const s = round.stats;
  const dateStr = new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });

  const parts: string[] = [];
  if (s.putts.holes > 0) parts.push(`${s.putts.total}putts`);
  if (s.gir.den > 0) parts.push(`GIR ${Math.round((s.gir.hit / s.gir.den) * 100)}%`);
  if (round.sg) parts.push(`SG ${round.sg.totalPer18 > 0 ? '+' : ''}${round.sg.totalPer18.toFixed(1)}`);

  return (
    <div data-testid="card-round" data-course={round.course} className="rounded-xl border border-border bg-surface overflow-hidden">
      <button type="button" data-testid="card-round-toggle" onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left transition hover:bg-surface2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{round.course}</p>
            <p className="mt-0.5 text-sm text-text2">
              {dateStr}
              {round.tee && ` · ${round.tee} tee`}
              {' · '}{s.holesPlayed}/{round.holesPlanned} 홀
              {s.holesPlayed > 0 && s.holesComplete < s.holesPlayed && ` · 원장 ${s.holesComplete}홀`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-mono font-semibold text-text">{s.holesPlayed > 0 ? s.scoreTotal : '—'}</p>
            <p className="mt-0.5 text-xs text-text3">{parts.length > 0 ? parts.join(' · ') : 'N/A'}</p>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <svg width="16" height="16" viewBox="0 0 16 16" className={`text-text3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
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

/* ── main ─────────────────────────────────────────────────── */

export function ScorecardClient({ rounds }: { rounds: RoundSummary[] }) {
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    if (!cutoff) return rounds;
    return rounds.filter((r) => new Date(r.date) >= cutoff);
  }, [rounds, period]);

  const stats = useMemo(() => periodStats(filtered.map((r) => r.stats)), [filtered]);

  if (rounds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold">Scorecard</h1>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text2">라운드 기록이 없습니다</p>
          <p className="mt-1 text-sm text-text3">홈에서 새 라운드를 시작하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Scorecard</h1>
      <PeriodFilter period={period} onChange={setPeriod} />
      <ElliottTiles stats={stats} />
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-text2 text-sm">이 기간에 라운드가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <RoundCard key={r.id} round={r} />)}
        </div>
      )}
    </div>
  );
}
