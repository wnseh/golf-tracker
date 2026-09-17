'use client';

import type { PeriodStats } from '@/lib/stats';

function pct(hit: number, den: number): string {
  return den > 0 ? `${Math.round((hit / den) * 100)}%` : 'N/A';
}
function num(v: number | null, digits = 1): string {
  return v !== null ? v.toFixed(digits) : 'N/A';
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div data-testid={`tile-${id}`} className="rounded-lg bg-surface2 border border-border px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-text3">{label}</p>
      <p data-testid={`tile-${id}-value`} className="mt-0.5 text-lg font-mono font-semibold text-text">{value}</p>
      <p className="mt-0.5 text-[10px] text-text3">{sub}</p>
    </div>
  );
}

/** Elliott의 기본 5개 stat + 스코어. 분모와 coverage를 항상 같이 보여준다. */
export function ElliottTiles({ stats }: { stats: PeriodStats }) {
  const s = stats;
  const cov = s.ledgerCoverage !== null ? `원장 ${Math.round(s.ledgerCoverage * 100)}%` : '원장 없음';
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile label="Score" value={num(s.avgScore)} sub={`${s.rounds}라운드 · 18홀 환산`} />
      <Tile label="FIR" value={pct(s.fir.hit, s.fir.den)} sub={s.fir.den > 0 ? `${s.fir.hit}/${s.fir.den} 홀` : cov} />
      <Tile label="GIR" value={pct(s.gir.hit, s.gir.den)} sub={s.gir.den > 0 ? `${s.gir.hit}/${s.gir.den} 홀` : cov} />
      <Tile label="Putts" value={num(s.avgPutts)} sub={s.avgPutts !== null ? `${s.roundsComplete}라운드 · 18홀 환산` : cov} />
      <Tile label="Up & Down" value={pct(s.scramble.hit, s.scramble.den)} sub={s.scramble.den > 0 ? `${s.scramble.hit}/${s.scramble.den} GIR 미스` : cov} />
      <Tile label="Penalty" value={num(s.avgPenalties)} sub={s.avgPenalties !== null ? '라운드당 · 18홀 환산' : cov} />
    </div>
  );
}
