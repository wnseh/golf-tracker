'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RoundMetricsData, LeakItem, BaselineBucket, ConfidenceLevel } from '@/lib/esg';
import { rankLeaks } from '@/lib/esg';
import type { AnalysisPageData } from './page';

/* ── Types ────────────────────────────────────────────────────────────── */

type Period = 'all' | 'year' | '3months' | 'month';

interface PeriodSummary {
  roundCount: number;
  avgScore: number | null;
  avgPutts: number | null;
  girRate: number | null;
  girNum: number;
  girDen: number;
  puttsCoverage: number | null;
  girCoverage: number | null;
}

interface TrendPoint {
  date: string;         // short label e.g. "2/27"
  fullDate: string;     // for tooltip e.g. "2026.02.27"
  course: string;
  scorePer18: number;
  puttsPer18: number | null;
}

/* ── Constants ────────────────────────────────────────────────────────── */

const PERIOD_LABELS: Record<Period, string> = {
  all: '전체',
  year: '올해',
  '3months': '3개월',
  month: '이번달',
};
const PERIOD_ORDER: Period[] = ['all', 'year', '3months', 'month'];

const confidenceColors: Record<ConfidenceLevel, string> = {
  High: 'text-accent',
  Medium: 'text-yellow',
  Low: 'text-red',
};

const confidenceBg: Record<ConfidenceLevel, string> = {
  High: 'bg-accent-dim',
  Medium: 'bg-yellow-dim',
  Low: 'bg-red-dim',
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

function getPeriodCutoff(period: Period): Date | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  if (period === '3months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function fmtShortDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtFullDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ── Sub-components ───────────────────────────────────────────────────── */

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
  const fmtScore = summary.avgScore != null ? summary.avgScore.toFixed(1) : 'N/A';
  const fmtPutts = summary.avgPutts != null ? summary.avgPutts.toFixed(1) : 'N/A';
  const fmtGir =
    summary.girRate != null ? `${(summary.girRate * 100).toFixed(0)}%` : 'N/A';

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="pr-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text3">Avg Score</p>
          <p className="mt-1 text-xl font-mono font-semibold text-text">{fmtScore}</p>
          <p className="mt-0.5 text-[10px] text-text3">{summary.roundCount}라운드</p>
        </div>
        <div className="px-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text3">Avg Putts</p>
          <p className="mt-1 text-xl font-mono font-semibold text-text">{fmtPutts}</p>
          <p className="mt-0.5 text-[10px] text-text3">
            {summary.puttsCoverage != null
              ? `${Math.round(summary.puttsCoverage * 100)}% 커버리지`
              : '데이터 없음'}
          </p>
        </div>
        <div className="pl-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text3">GIR</p>
          <p className="mt-1 text-xl font-mono font-semibold text-text">{fmtGir}</p>
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

function BaselineChip({
  bucket,
  confidence,
  source,
}: {
  bucket: BaselineBucket;
  confidence: ConfidenceLevel;
  source: 'round_handicap' | 'skill_index' | 'default';
}) {
  const sourceLabel =
    source === 'round_handicap'
      ? '핸디캡 기반'
      : source === 'skill_index'
      ? 'SkillIndex 기반'
      : '기본값';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-border ${confidenceBg[confidence]}`}>
        <span className="text-text2">Baseline:</span>
        <span className="font-mono font-semibold text-text">{bucket}</span>
        <span className="text-text3">·</span>
        <span className={confidenceColors[confidence]}>Confidence: {confidence}</span>
      </span>
      <span className="text-[10px] text-text3">{sourceLabel}</span>
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  labelMap?: Record<string, string>; // date → courseName
  unit?: string;
}

function ChartTooltip({ active, payload, label, labelMap, unit }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const course = label && labelMap ? labelMap[label] : '';
  const val = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border bg-surface2 px-3 py-2 text-xs shadow-lg">
      {course && <p className="font-medium text-text mb-0.5 truncate max-w-[140px]">{course}</p>}
      {label && <p className="text-text3">{label}</p>}
      {val !== undefined && (
        <p className="font-mono text-accent mt-1">
          {val.toFixed(1)}{unit ?? ''}
        </p>
      )}
    </div>
  );
}

function ScoreTrend({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return null;
  const recent = data.slice(-12);
  const labelMap = Object.fromEntries(recent.map((d) => [d.date, d.course]));

  return (
    <div>
      <p className="text-xs font-medium text-text2 mb-2">Score per 18 holes</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#555555' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#555555' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<ChartTooltip labelMap={labelMap} unit=" 타" />} />
          <Line
            type="monotone"
            dataKey="scorePer18"
            stroke="#4ade80"
            strokeWidth={2}
            dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#4ade80' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PuttsTrend({ data }: { data: TrendPoint[] }) {
  const puttData = data.filter((d) => d.puttsPer18 !== null);
  if (puttData.length < 2) return null;
  const recent = puttData.slice(-12);
  const labelMap = Object.fromEntries(recent.map((d) => [d.date, d.course]));

  return (
    <div>
      <p className="text-xs font-medium text-text2 mb-2">Putts per 18 holes</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#555555' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#555555' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<ChartTooltip labelMap={labelMap} unit=" 퍼트" />} />
          <Line
            type="monotone"
            dataKey="puttsPer18"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#60a5fa' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeakCard({ leak, rank }: { leak: LeakItem; rank: number }) {
  const isPositiveLoss = leak.id === 'around'
    ? leak.lossPerRound > 0
    : leak.lossPerRound < 0;

  const displayLoss = leak.id === 'around'
    ? leak.lossPerRound.toFixed(2)
    : Math.abs(leak.lossPerRound).toFixed(2);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text3">
            Biggest Leak #{rank}
          </span>
          <span
            className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${confidenceBg[leak.confidence]} ${confidenceColors[leak.confidence]}`}
          >
            {leak.confidence}
          </span>
        </div>
        {leak.confidence === 'Low' && (
          <span className="text-[10px] text-yellow bg-yellow-dim rounded px-1.5 py-0.5">
            데이터 부족
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-lg font-semibold text-text">{leak.name}</p>

      {/* Loss */}
      <div>
        <p className="text-sm text-text2">
          <span className="font-mono font-bold text-red text-base">{displayLoss}</span>
          {' '}
          {leak.id === 'around'
            ? 'estimated strokes cost / round'
            : 'estimated strokes lost / round'}
        </p>
        {leak.id === 'putting' && (
          <p className="text-[10px] text-text3 mt-0.5">
            Estimated · 기대 퍼트 − 실제 퍼트 ({leak.lossPerRound > 0 ? '+' : ''}{leak.lossPerRound.toFixed(2)})
          </p>
        )}
      </div>

      {/* Meta */}
      <p className="text-[10px] text-text3">
        {leak.sampleRounds}라운드 ·{' '}
        샘플 {leak.totalSamples}개 ·{' '}
        Coverage {Math.round(leak.coverage * 100)}%
      </p>

      {/* Action */}
      <div className="rounded-lg bg-surface2 border border-border p-3">
        <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-1">
          Action
        </p>
        <p className="text-sm text-text2 leading-relaxed">{leak.action}</p>
      </div>

      {/* Low confidence warning */}
      {leak.confidence === 'Low' && (
        <p className="text-[10px] text-yellow leading-relaxed">
          더 많이 기록할수록 분석이 정확해집니다. 대강/진지 모드로 샷을 기록하세요.
        </p>
      )}
    </div>
  );
}

/* ── Main Client Component ───────────────────────────────────────────── */

export function AnalysisClient({ data }: { data: AnalysisPageData }) {
  const { allMetrics, baselineBucket, baselineConfidence, baselineSource } = data;

  const [period, setPeriod] = useState<Period>('all');

  /* ── Period filter ── */

  const filteredMetrics = useMemo<RoundMetricsData[]>(() => {
    const cutoff = getPeriodCutoff(period);
    if (!cutoff) return allMetrics;
    return allMetrics.filter((m) => new Date(m.date) >= cutoff);
  }, [allMetrics, period]);

  /* ── Period summary ── */

  const periodSummary = useMemo<PeriodSummary>(() => {
    const roundCount = filteredMetrics.length;
    if (roundCount === 0) {
      return {
        roundCount: 0,
        avgScore: null,
        avgPutts: null,
        girRate: null,
        girNum: 0,
        girDen: 0,
        puttsCoverage: null,
        girCoverage: null,
      };
    }

    const avgScore =
      filteredMetrics.reduce((s, m) => s + m.scorePer18, 0) / roundCount;

    const puttsRounds = filteredMetrics.filter((m) => m.puttsTotal !== null);
    const avgPutts =
      puttsRounds.length > 0
        ? puttsRounds.reduce((s, m) => s + m.puttsPer18!, 0) / puttsRounds.length
        : null;

    const girNum = filteredMetrics.reduce((s, m) => s + (m.girCount ?? 0), 0);
    const girDen = filteredMetrics.reduce((s, m) => s + (m.girDen ?? 0), 0);
    const girRate = girDen > 0 ? girNum / girDen : null;

    const girRoundsWithData = filteredMetrics.filter((m) => (m.girDen ?? 0) > 0);
    const puttsCoverage = puttsRounds.length / roundCount;
    const girCoverage = roundCount > 0 ? girRoundsWithData.length / roundCount : null;

    return { roundCount, avgScore, avgPutts, girRate, girNum, girDen, puttsCoverage, girCoverage };
  }, [filteredMetrics]);

  /* ── Trend data (date-ascending, 12 most recent) ── */

  const trendData = useMemo<TrendPoint[]>(() => {
    const sorted = [...filteredMetrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return sorted.map((m) => ({
      date: fmtShortDate(m.date),
      fullDate: fmtFullDate(m.date),
      course: m.course,
      scorePer18: m.scorePer18,
      puttsPer18: m.puttsPer18,
    }));
  }, [filteredMetrics]);

  /* ── Leaks (recalculate for filtered period) ── */

  const periodLeaks = useMemo<LeakItem[]>(() => rankLeaks(filteredMetrics), [filteredMetrics]);

  /* ── Empty states ── */

  if (allMetrics.length === 0) {
    return (
      <div className="px-4 py-6 space-y-4 pb-24">
        <h1 className="text-lg font-bold">Analysis</h1>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text2">라운드 기록이 없습니다</p>
          <p className="mt-1 text-sm text-text3">홈에서 새 라운드를 시작하세요</p>
        </div>
      </div>
    );
  }

  if (allMetrics.length < 3) {
    return (
      <div className="px-4 py-6 space-y-4 pb-24">
        <h1 className="text-lg font-bold">Analysis</h1>
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-text2 font-medium">분석에 최소 3라운드가 필요합니다</p>
          <p className="mt-1 text-sm text-text3">현재 {allMetrics.length}라운드</p>
          <p className="mt-3 text-xs text-text3 leading-relaxed max-w-xs mx-auto">
            더 많은 라운드를 기록하면 트렌드 차트와 Biggest Leak 분석이 활성화됩니다
          </p>
        </div>
      </div>
    );
  }

  /* ── Main render ── */

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      <h1 className="text-lg font-bold">Analysis</h1>

      {/* Period filter */}
      <PeriodFilter period={period} onChange={setPeriod} />

      {/* Summary KPIs */}
      <SummaryCards summary={periodSummary} />

      {/* Baseline chip */}
      <BaselineChip
        bucket={baselineBucket}
        confidence={baselineConfidence}
        source={baselineSource}
      />

      {/* Trend section */}
      {filteredMetrics.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-5">
          <p className="text-sm font-semibold text-text">Trend</p>
          <ScoreTrend data={trendData} />
          <PuttsTrend data={trendData} />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text3">이 기간에 라운드가 없습니다</p>
        </div>
      )}

      {/* Leak section */}
      {filteredMetrics.length >= 3 ? (
        periodLeaks.length > 0 ? (
          <div className="space-y-3">
            {periodLeaks.map((leak, i) => (
              <LeakCard key={leak.id} leak={leak} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-text2 text-sm font-medium">eSG 계산 데이터가 부족합니다</p>
            <p className="mt-2 text-xs text-text3 leading-relaxed max-w-xs mx-auto">
              대강/진지 모드로 샷을 기록하면 Biggest Leak 분석이 가능해집니다
            </p>
          </div>
        )
      ) : filteredMetrics.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-5 text-center">
          <p className="text-sm text-text3">
            이 기간에 라운드가 {filteredMetrics.length}개뿐입니다.<br />
            Leak 분석에 최소 3라운드가 필요합니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
