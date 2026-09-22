'use client';

import { useEffect } from 'react';
import { SG_CATEGORY_LABELS } from '@/lib/sg';
import {
  selectInsights, insightSources, SG_GUIDE, SG_TOTAL_GUIDE,
  type InsightContext, type InsightScope, type Insight,
} from '@/lib/insights';

/* Tailwind 동적 클래스 금지 — 정적 매핑 */
const TONE_DOT: Record<Insight['tone'], string> = {
  info: 'bg-blue',
  warn: 'bg-yellow',
  good: 'bg-accent',
};
const TONE_LABEL: Record<Insight['tone'], string> = {
  info: '참고',
  warn: '주의',
  good: '강점',
};

function signed(v: number, digits = 2) {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

interface Props {
  scope:   InsightScope;
  ctx:     InsightContext;
  onClose: () => void;
}

/** SG 카테고리(또는 전체) 해설 모달: 무엇을 재나 → 읽는 법 → 내 상황 → 출처 */
export function SgInsightModal({ scope, ctx, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const guide = scope === 'total' ? SG_TOTAL_GUIDE : SG_GUIDE[scope];
  const label = scope === 'total' ? 'Strokes Gained 전체' : SG_CATEGORY_LABELS[scope];
  const value = scope === 'total' ? ctx.total : ctx.byCat[scope];
  const insights = selectInsights(ctx, scope);
  const sources = insightSources(guide.source, insights);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        data-testid="sg-insight-modal"
        data-scope={scope}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-surface max-h-[88vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-text3">
              <span className={`font-mono font-semibold ${value >= 0 ? 'text-accent' : 'text-red'}`}>{signed(value)}</span>
              {' '}vs Tour / 라운드 · {ctx.rounds}라운드 · 18홀 환산
            </p>
          </div>
          <button
            type="button"
            data-testid="sg-insight-close"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:bg-surface2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <section>
            <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-1">무엇을 재나</p>
            <p className="text-sm text-text2 leading-relaxed">{guide.what}</p>
          </section>

          <section>
            <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-1">읽는 법</p>
            <p className="text-sm text-text2 leading-relaxed">{guide.reading}</p>
          </section>

          <section>
            <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-2">내 상황</p>
            {insights.length === 0 ? (
              <p data-testid="sg-insight-empty" className="text-sm text-text3">특별히 짚을 점이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {insights.map((i) => (
                  <li
                    key={i.id}
                    data-testid="sg-insight-item"
                    data-insight-id={i.id}
                    data-tone={i.tone}
                    className="rounded-lg bg-surface2 border border-border p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${TONE_DOT[i.tone]}`} />
                      <span className="text-[10px] text-text3">{TONE_LABEL[i.tone]}</span>
                      <span className="text-sm font-semibold text-text">{i.title}</span>
                    </div>
                    <p className="text-sm text-text2 leading-relaxed">{i.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-1">출처</p>
            <ul className="space-y-0.5">
              {sources.map((s) => (
                <li key={s} className="text-[10px] text-text3 leading-relaxed">· {s}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
