'use client';

export type Period = 'all' | 'year' | '3months' | 'month';

export const PERIOD_LABELS: Record<Period, string> = {
  all: '전체', year: '올해', '3months': '3개월', month: '이번달',
};
export const PERIOD_ORDER: Period[] = ['all', 'year', '3months', 'month'];

export function getPeriodCutoff(period: Period): Date | null {
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

export function PeriodFilter({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERIOD_ORDER.map((p) => (
        <button
          key={p}
          type="button"
          data-testid={`period-${p}`}
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
