'use client';

import type { RoundSummary } from '@/lib/load-rounds';
import type { PeriodStats, Ratio } from '@/lib/stats';

/**
 * 라운드 하나 vs 기간 평균을 stat별로 나란히 보여준다 (Shot Scope의 Round / Season 비교 형태).
 * 계산은 전부 stats.ts / sg.ts 결과를 그대로 쓰고, 여기선 고르고 그리기만 한다.
 */

interface Row {
  key:     string;
  label:   string;
  round:   string;          // 표시 문자열 (N/A 포함)
  period:  string;
  bar?:    { round: number | null; period: number | null };   // 0~1, 비율 stat만
  better?: 'higher' | 'lower';
  diff?:   number | null;   // round − period (숫자 stat). 비율은 %p
}

function pct(r: Ratio): number | null {
  return r.den > 0 ? r.hit / r.den : null;
}
function pctText(r: Ratio): string {
  const p = pct(r);
  return p === null ? 'N/A' : `${Math.round(p * 100)}%`;
}
function num(v: number | null, digits = 1): string {
  return v === null ? 'N/A' : v.toFixed(digits);
}
function signed(v: number, digits = 1): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

function buildRows(round: RoundSummary, period: PeriodStats): Row[] {
  const s = round.stats;
  const ratio = (key: string, label: string, r: Ratio, p: Ratio, better: Row['better']): Row => {
    const rv = pct(r), pv = pct(p);
    return {
      key, label, round: pctText(r), period: pctText(p),
      bar: { round: rv, period: pv }, better,
      diff: rv !== null && pv !== null ? (rv - pv) * 100 : null,
    };
  };
  const number = (key: string, label: string, rv: number | null, pv: number | null, better: Row['better'], digits = 1): Row => ({
    key, label, round: num(rv, digits), period: num(pv, digits), better,
    diff: rv !== null && pv !== null ? rv - pv : null,
  });

  return [
    number('score', 'Score', s.holesPlayed > 0 ? s.scorePer18 : null, period.avgScore, 'lower'),
    ratio('fir', 'FIR', s.fir, period.fir, 'higher'),
    ratio('gir', 'GIR', s.gir, period.gir, 'higher'),
    number('putts', 'Putts', s.puttsPer18, period.avgPutts, 'lower'),
    ratio('scramble', 'Up & Down', s.scramble, period.scramble, 'higher'),
    number('penalty', 'Penalty', s.penaltiesPer18, period.avgPenalties, 'lower'),
    number('doubles', 'Double+', s.doublesPer18, period.avgDoubles, 'lower'),
  ];
}

function diffClass(row: Row): string {
  if (row.diff === null || row.diff === undefined || row.better === undefined) return 'text-text3';
  if (Math.abs(row.diff) < 1e-9) return 'text-text3';
  const good = row.better === 'higher' ? row.diff > 0 : row.diff < 0;
  return good ? 'text-accent' : 'text-red';
}

interface Props {
  rounds:       RoundSummary[];      // 기간 안의 라운드 (최근순)
  selectedId:   string;
  onSelect:     (id: string) => void;
  period:       PeriodStats;
  periodLabel:  string;
  sgRound:      number | null;       // 선택 라운드 SG 18홀 환산
  sgPeriod:     number | null;       // 기간 평균 SG
}

export function RoundVsPeriod({ rounds, selectedId, onSelect, period, periodLabel, sgRound, sgPeriod }: Props) {
  const round = rounds.find((r) => r.id === selectedId) ?? rounds[0];
  if (!round) return null;
  const rows = buildRows(round, period);
  const dateStr = new Date(round.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

  return (
    <div data-testid="round-vs-period" className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Round vs {periodLabel}</p>
        <select
          data-testid="rvp-select"
          value={round.id}
          onChange={(e) => onSelect(e.target.value)}
          className="max-w-[55%] rounded-lg border border-border bg-surface2 px-2 py-1 text-xs text-text2 focus:border-accent focus:outline-none"
        >
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {new Date(r.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} · {r.course}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1.5 items-center text-xs">
        <span />
        <span className="text-[10px] uppercase tracking-wide text-text3 text-right">{dateStr}</span>
        <span className="text-[10px] uppercase tracking-wide text-text3 text-right">{periodLabel}</span>
        <span className="text-[10px] uppercase tracking-wide text-text3 text-right">Δ</span>

        {rows.map((row) => (
          <RowView key={row.key} row={row} />
        ))}

        {/* SG: 원장 라운드에만 */}
        <span className="text-text2">SG vs Tour</span>
        <span data-testid="rvp-round-sg" className="font-mono text-right text-text">{sgRound === null ? 'N/A' : signed(sgRound)}</span>
        <span data-testid="rvp-period-sg" className="font-mono text-right text-text2">{sgPeriod === null ? 'N/A' : signed(sgPeriod)}</span>
        <span className={`font-mono text-right ${sgRound !== null && sgPeriod !== null ? (sgRound - sgPeriod > 0 ? 'text-accent' : sgRound - sgPeriod < 0 ? 'text-red' : 'text-text3') : 'text-text3'}`}>
          {sgRound !== null && sgPeriod !== null ? signed(sgRound - sgPeriod) : '—'}
        </span>
      </div>

      <p className="text-[10px] text-text3 leading-relaxed">
        라운드 값은 18홀 환산. 기간 값은 {period.rounds}라운드 평균(비율은 합산). N/A는 미기록.
      </p>
    </div>
  );
}

function RowView({ row }: { row: Row }) {
  const dc = diffClass(row);
  const diffText =
    row.diff === null || row.diff === undefined ? '—'
    : row.bar ? `${signed(row.diff, 0)}%p`
    : signed(row.diff);
  return (
    <>
      <span className="text-text2" data-testid={`rvp-row-${row.key}`}>
        {row.label}
        {row.bar && (
          <span className="mt-0.5 block space-y-0.5">
            <Bar value={row.bar.round} cls="bg-accent" />
            <Bar value={row.bar.period} cls="bg-text3" />
          </span>
        )}
      </span>
      <span data-testid={`rvp-round-${row.key}`} className="font-mono text-right text-text self-start">{row.round}</span>
      <span data-testid={`rvp-period-${row.key}`} className="font-mono text-right text-text2 self-start">{row.period}</span>
      <span className={`font-mono text-right self-start ${dc}`}>{diffText}</span>
    </>
  );
}

function Bar({ value, cls }: { value: number | null; cls: string }) {
  return (
    <span className="block h-1 w-full max-w-[120px] rounded bg-surface2 overflow-hidden">
      <span className={`block h-full rounded ${cls}`} style={{ width: `${Math.round((value ?? 0) * 100)}%` }} />
    </span>
  );
}
