'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { RoundSummary } from '@/lib/load-rounds';
import { periodStats, type PeriodStats, type Ratio } from '@/lib/stats';
import { averageSG, sumStrike, SG_CATEGORIES, SG_CATEGORY_LABELS, type SgCategory, type RoundSG } from '@/lib/sg';
import { PeriodFilter, getPeriodCutoff, PERIOD_LABELS, type Period } from '@/components/stats/period-filter';
import { RoundVsPeriod } from '@/components/stats/round-vs-period';
import { ElliottTiles } from '@/components/stats/elliott-tiles';
import { SG_GUIDE, type InsightContext, type InsightScope } from '@/lib/insights';
import { SgInsightModal } from './sg-insight-modal';

/* ── 색상: recharts는 CSS 변수를 못 읽어 globals.css 토큰을 하드코딩 ── */
const C = {
  accent: '#4ade80', blue: '#60a5fa', yellow: '#fbbf24', purple: '#a78bfa', red: '#f87171',
  grid: '#2a2a2a', tick: '#555555', ref: '#a0a0a0',
};
const SG_COLOR: Record<SgCategory, string> = {
  tee: C.blue, approach: C.yellow, short: C.purple, putt: C.accent,
};

/* ── 타입 ──────────────────────────────────────────────────── */

interface TrendPoint {
  date: string;
  course: string;
  score: number;
  riccio: number | null;
  putts: number | null;
}

/* ── 서브 컴포넌트 ────────────────────────────────────────── */

function fmtShort(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function signed(v: number, digits = 1) {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

/** ⓘ 버튼 — SG 해설 모달을 연다 */
function InfoButton({ scope, onInfo, label }: { scope: InsightScope; onInfo: (s: InsightScope) => void; label: string }) {
  return (
    <button
      type="button"
      data-testid={`sg-info-${scope}`}
      onClick={() => onInfo(scope)}
      aria-label={`${label} 해설`}
      className="w-5 h-5 rounded-full border border-border text-text3 text-[10px] font-semibold leading-none flex items-center justify-center hover:text-text hover:border-text3"
    >
      i
    </button>
  );
}

function RiccioCard({ stats }: { stats: PeriodStats }) {
  const r = stats.riccio;
  if (!r || stats.avgScore === null) {
    return (
      <div data-testid="riccio-card" data-state="empty" className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">Riccio&apos;s Rule</p>
        <p className="mt-1 text-xs text-text3">GIR이 기록된 홀이 없어 기대 스코어를 계산할 수 없습니다.</p>
      </div>
    );
  }
  const gap = stats.avgScore - r.expScore;
  const puttGap = r.putts18 !== null ? r.putts18 - r.expPutts : null;

  let reading: string;
  if (Math.abs(gap) < 1.5) reading = 'GIR 수준에 맞는 스코어입니다. 스코어를 더 줄이려면 GIR 자체를 올려야 합니다.';
  else if (gap > 0) reading = 'GIR에 비해 스코어가 높습니다. 숏게임·퍼팅에서 타수가 새고 있을 가능성이 큽니다.';
  else reading = 'GIR에 비해 스코어가 낮습니다. 숏게임·퍼팅이 강점입니다. 티투그린을 올리면 더 내려갑니다.';

  return (
    <div data-testid="riccio-card" data-state="ready" className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Riccio&apos;s Rule</p>
        <p className="text-[10px] text-text3">Score ≈ 95 − 2 × GIR</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text3">GIR / 18홀</p>
          <p data-testid="riccio-gir18" className="font-mono text-lg font-semibold">{r.gir18.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text3">기대 스코어</p>
          <p data-testid="riccio-exp-score" className="font-mono text-lg font-semibold">{r.expScore.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text3">실제 − 기대</p>
          <p data-testid="riccio-gap" className={`font-mono text-lg font-semibold ${gap > 0 ? 'text-red' : 'text-accent'}`}>{signed(gap)}</p>
        </div>
      </div>
      <p className="text-xs text-text2 leading-relaxed">{reading}</p>
      {puttGap !== null && r.putts18 !== null && (
        <p className="text-[10px] text-text3">
          퍼트: 실제 {r.putts18.toFixed(1)} vs GIR 기준 기대 {r.expPutts.toFixed(1)} ({signed(puttGap)}) · Putts ≈ 37 − ⅔ × GIR
        </p>
      )}
    </div>
  );
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey: string; payload: TrendPoint }>;
  label?: string;
}

function TrendTooltip({ active, payload }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface2 px-3 py-2 text-xs shadow-lg space-y-0.5">
      <p className="font-medium text-text truncate max-w-[160px]">{p.course}</p>
      <p className="text-text3">{p.date}</p>
      <p className="font-mono text-text">스코어 {p.score.toFixed(1)}</p>
      {p.riccio !== null && <p className="font-mono text-text2">Riccio 기대 {p.riccio.toFixed(1)}</p>}
    </div>
  );
}

function ScoreTrend({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return null;
  const recent = data.slice(-12);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-text2">Score per 18 holes</p>
        <div className="flex items-center gap-3 text-[10px] text-text3">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5" style={{ background: C.accent }} />실제</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dashed" style={{ borderColor: C.ref }} />Riccio 기대</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.tick }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: C.tick }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<TrendTooltip />} />
          <Line type="monotone" dataKey="riccio" stroke={C.ref} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2} dot={{ r: 3, fill: C.accent, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PuttsTrend({ data }: { data: TrendPoint[] }) {
  const pts = data.filter((d) => d.putts !== null);
  if (pts.length < 2) return null;
  const recent = pts.slice(-12);
  return (
    <div>
      <p className="text-xs font-medium text-text2 mb-2">Putts per 18 holes</p>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.tick }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: C.tick }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<TrendTooltip />} />
          <Line type="monotone" dataKey="putts" stroke={C.blue} strokeWidth={2} dot={{ r: 3, fill: C.blue, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SgBarPoint { cat: SgCategory; label: string; value: number }

function SgBarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SgBarPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface2 px-3 py-2 text-xs shadow-lg">
      <p className="text-text">{p.label}</p>
      <p className="font-mono text-text2">{signed(p.value, 2)} / 라운드</p>
    </div>
  );
}

function SgCard({ sgRounds, mishits, onInfo }: { sgRounds: RoundSG[]; mishits: Ratio; onInfo: (s: InsightScope) => void }) {
  const avg = averageSG(sgRounds);
  if (!avg) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">Strokes Gained vs Tour</p>
        <p className="mt-1 text-xs text-text3">샷 원장이 완성된 홀이 있는 라운드가 없습니다.</p>
      </div>
    );
  }
  const data: SgBarPoint[] = SG_CATEGORIES.map((c) => ({ cat: c, label: SG_CATEGORY_LABELS[c], value: avg.byCat[c] }));
  const holes = sgRounds.reduce((s, r) => s + r.holesCounted, 0);

  return (
    <div data-testid="sg-card" className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Strokes Gained vs Tour</p>
          <InfoButton scope="total" onInfo={onInfo} label="Strokes Gained 전체" />
        </div>
        <p className={`font-mono text-sm font-semibold ${avg.total >= 0 ? 'text-accent' : 'text-red'}`}>{signed(avg.total)} / 라운드</p>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.tick }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: C.tick }} tickLine={false} axisLine={false} />
          <ReferenceLine y={0} stroke={C.ref} />
          <Tooltip content={<SgBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.cat} fill={SG_COLOR[d.cat]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-4 gap-1 text-center">
        {data.map((d) => (
          <button
            key={d.cat}
            type="button"
            data-testid={`sg-info-${d.cat}`}
            onClick={() => onInfo(d.cat)}
            aria-label={`${d.label} 해설`}
            className="rounded-lg py-1 hover:bg-surface2"
          >
            <p className="text-[10px] text-text3">{d.label} <span className="text-text3/60">ⓘ</span></p>
            <p className={`font-mono text-xs font-semibold ${d.value >= 0 ? 'text-accent' : 'text-red'}`}>{signed(d.value, 2)}</p>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-text3 leading-relaxed">
        PGA Tour 평균 대비 (Broadie 기준표). 값은 대부분 음수이니 카테고리 간 상대 비교로 읽으세요.
        {' '}{avg.rounds}라운드 · 원장 {holes}홀 · 18홀 환산.
      </p>
      <p data-testid="sg-mishits" className="text-[10px] text-text3">
        미스 컨택 {mishits.den > 0 ? `${mishits.hit}/${mishits.den} 샷 (${Math.round((mishits.hit / mishits.den) * 100)}%)` : 'N/A'} · 퍼트 제외
      </p>
    </div>
  );
}

function LeakCards({ sgRounds, onInfo }: { sgRounds: RoundSG[]; onInfo: (s: InsightScope) => void }) {
  const avg = averageSG(sgRounds);
  if (!avg) return null;
  const ranked = SG_CATEGORIES
    .map((c) => ({ cat: c, value: avg.byCat[c] }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 2);
  return (
    <div className="space-y-3">
      {ranked.map((l, i) => (
        <div key={l.cat} data-testid="leak-card" data-category={l.cat} className="rounded-xl border border-border bg-surface p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text3">Biggest Leak #{i + 1}</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SG_COLOR[l.cat] }} />
          </div>
          <p className="text-lg font-semibold text-text">{SG_CATEGORY_LABELS[l.cat]}</p>
          <p className="text-sm text-text2">
            <span className={`font-mono font-bold text-base ${l.value >= 0 ? 'text-accent' : 'text-red'}`}>{signed(l.value, 2)}</span>
            {' '}strokes vs Tour / round
          </p>
          <div className="rounded-lg bg-surface2 border border-border p-3">
            <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-1">Action</p>
            <p className="text-sm text-text2 leading-relaxed">{SG_GUIDE[l.cat].action}</p>
          </div>
          <button
            type="button"
            data-testid="leak-detail"
            onClick={() => onInfo(l.cat)}
            className="text-xs text-blue hover:underline"
          >
            읽는 법과 내 상황 보기 →
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── 메인 ─────────────────────────────────────────────────── */

const MIN_ROUNDS_FOR_SG = 3;

export function AnalysisClient({ rounds }: { rounds: RoundSummary[] }) {
  const [period, setPeriod] = useState<Period>('all');

  const played = useMemo(() => rounds.filter((r) => r.stats.holesPlayed > 0), [rounds]);

  const filtered = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    if (!cutoff) return played;
    return played.filter((r) => new Date(r.date) >= cutoff);
  }, [played, period]);

  const stats = useMemo(() => periodStats(filtered.map((r) => r.stats)), [filtered]);

  const trend = useMemo<TrendPoint[]>(() =>
    [...filtered]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: fmtShort(r.date),
        course: r.course,
        score: r.stats.scorePer18,
        riccio: r.stats.riccio?.expScore ?? null,
        putts: r.stats.puttsPer18,
      })),
    [filtered]);

  const sgRounds = useMemo(() => filtered.map((r) => r.sg).filter((s): s is RoundSG => s !== null), [filtered]);

  // Round vs 기간: 기본은 기간 내 최근 라운드
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const rvpRounds = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filtered]);
  const rvpRound = rvpRounds.find((r) => r.id === selectedRoundId) ?? rvpRounds[0] ?? null;
  const sgPeriodAvg = useMemo(() => averageSG(sgRounds)?.total ?? null, [sgRounds]);

  const [insightScope, setInsightScope] = useState<InsightScope | null>(null);
  const closeInsight = useCallback(() => setInsightScope(null), []);

  // 해설 모달 입력: SG 평균 + Elliott/Riccio. 계산은 전부 lib에서, 여기선 모으기만.
  const insightCtx = useMemo<InsightContext | null>(() => {
    const avg = averageSG(sgRounds);
    if (!avg) return null;
    return {
      byCat: avg.byCat,
      total: avg.total,
      rounds: avg.rounds,
      holes: sgRounds.reduce((s, r) => s + r.holesCounted, 0),
      fir: stats.fir,
      gir: stats.gir,
      scramble: stats.scramble,
      threePutts: stats.threePutts,
      avgPutts: stats.avgPutts,
      avgPenalties: stats.avgPenalties,
      avgDoubles: stats.avgDoubles,
      mishits: stats.mishits,
      strike: sumStrike(sgRounds),
      riccio: stats.riccio,
    };
  }, [sgRounds, stats]);

  if (played.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold">Analysis</h1>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text2">라운드 기록이 없습니다</p>
          <p className="mt-1 text-sm text-text3">홈에서 새 라운드를 시작하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Analysis</h1>
      <PeriodFilter period={period} onChange={setPeriod} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text3">이 기간에 라운드가 없습니다</p>
        </div>
      ) : (
        <>
          <ElliottTiles stats={stats} />
          {rvpRound && (
            <RoundVsPeriod
              rounds={rvpRounds}
              selectedId={rvpRound.id}
              onSelect={setSelectedRoundId}
              period={stats}
              periodLabel={PERIOD_LABELS[period]}
              sgRound={rvpRound.sg?.totalPer18 ?? null}
              sgPeriod={sgPeriodAvg}
            />
          )}
          <RiccioCard stats={stats} />

          <div data-testid="trend-card" className="rounded-xl border border-border bg-surface p-4 space-y-5">
            <p className="text-sm font-semibold text-text">Trend</p>
            <ScoreTrend data={trend} />
            <PuttsTrend data={trend} />
          </div>

          {sgRounds.length >= MIN_ROUNDS_FOR_SG ? (
            <>
              <SgCard sgRounds={sgRounds} mishits={stats.mishits} onInfo={setInsightScope} />
              <LeakCards sgRounds={sgRounds} onInfo={setInsightScope} />
              {insightScope && insightCtx && (
                <SgInsightModal scope={insightScope} ctx={insightCtx} onClose={closeInsight} />
              )}
            </>
          ) : (
            <div data-testid="sg-needs-more" className="rounded-xl border border-border bg-surface p-5 text-center">
              <p className="text-sm text-text2 font-medium">Strokes Gained 분석에 원장 라운드 {MIN_ROUNDS_FOR_SG}개가 필요합니다</p>
              <p className="mt-1 text-xs text-text3">현재 {sgRounds.length}라운드 · 홀마다 샷 원장을 홀아웃까지 입력하면 집계됩니다</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
