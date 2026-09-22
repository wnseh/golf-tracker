'use client';

import { useState } from 'react';
import type { Shot, Lie, DistBucket, StartLie } from '@/lib/types';
import { LIE_OPTIONS, LIE_LABELS, distBucketsFor } from '@/lib/constants';

interface ShotLedgerProps {
  shots: Shot[];
  onAdd: (shot: Shot) => void;
  onRemoveLast: () => void;
  onTogglePen: (index: number) => void;
  onToggleStrike: (index: number) => void;
  /** 샷별 SG vs Tour (sg.ts holeSG). 홀 길이 미입력이면 첫 샷은 null. 없으면 표시 안 함. */
  shotSg?: (number | null)[];
}

function signed(v: number, digits = 2) {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

/** 샷 i의 치기 전 라이 */
function startLieOf(shots: Shot[], i: number): StartLie {
  return i === 0 ? 'TEE' : (shots[i - 1].lie as StartLie);
}

/* 라이별 색상 — Tailwind 동적 클래스 금지, 정적 매핑 */
const lieActiveClass: Record<Lie, string> = {
  FW:    'border-accent bg-accent-dim text-accent',
  RO:    'border-yellow bg-yellow-dim text-yellow',
  SA:    'border-yellow bg-yellow-dim text-yellow',
  TR:    'border-red bg-red-dim text-red',
  GR:    'border-blue bg-blue-dim text-blue',
  HOLED: 'border-accent bg-accent text-bg',
};
const lieTextClass: Record<Lie | StartLie, string> = {
  TEE: 'text-text2', FW: 'text-accent', RO: 'text-yellow', SA: 'text-yellow',
  TR: 'text-red', GR: 'text-blue', HOLED: 'text-accent',
};
const idleClass = 'border-border bg-surface3 text-text2 hover:border-border2';

function distLabel(b: DistBucket): string {
  return b.endsWith('+') ? `${b.slice(0, -1)}m+` : `${b}m`;
}

export function ShotLedger({ shots, onAdd, onRemoveLast, onTogglePen, onToggleStrike, shotSg }: ShotLedgerProps) {
  const [pendingLie, setPendingLie] = useState<Lie | null>(null);
  const complete = shots.length > 0 && shots[shots.length - 1].lie === 'HOLED';

  // 다음 샷의 컨택 기본값: 퍼트(그린에서 치는 샷)는 기록 안 함, 나머지는 ok로 시작
  const nextStrike = startLieOf(shots, shots.length) === 'GR' ? null : 'ok';

  function pickLie(lie: Lie) {
    if (lie === 'HOLED') {
      onAdd({ lie: 'HOLED', dist: null, pen: false, strike: nextStrike });
      setPendingLie(null);
      return;
    }
    setPendingLie(lie === pendingLie ? null : lie);
  }

  function pickDist(dist: DistBucket) {
    if (!pendingLie) return;
    onAdd({ lie: pendingLie, dist, pen: false, strike: nextStrike });
    setPendingLie(null);
  }

  function removeLast() {
    setPendingLie(null);
    onRemoveLast();
  }

  return (
    <div className="space-y-3">
      {/* 기록된 샷 */}
      {shots.length > 0 && (
        <div className="space-y-1.5">
          {shots.map((s, i) => {
            const start = startLieOf(shots, i);
            const isLast = i === shots.length - 1;
            const isPutt = start === 'GR';
            return (
              <div
                key={i}
                data-testid="shot-row"
                data-lie={s.lie}
                data-dist={s.dist ?? ''}
                data-pen={s.pen ? 'true' : 'false'}
                data-strike={s.strike ?? ''}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface3 px-2.5 py-2 text-sm"
              >
                <span className="w-5 font-mono text-xs text-text3">{i + 1}</span>
                <span className={`text-xs ${lieTextClass[start]}`}>{LIE_LABELS[start]}</span>
                <span className="text-text3 text-xs">→</span>
                <span className={`font-medium ${lieTextClass[s.lie]}`}>{LIE_LABELS[s.lie]}</span>
                {s.dist && <span className="font-mono text-xs text-text2 whitespace-nowrap">{distLabel(s.dist)}</span>}
                <span className="flex-1" />
                {shotSg && (
                  <span
                    data-testid={`shot-sg-${i}`}
                    title="이 샷의 Strokes Gained vs Tour"
                    className={`font-mono text-[11px] w-11 shrink-0 text-right ${
                      shotSg[i] === null || shotSg[i] === undefined ? 'text-text3' : shotSg[i]! >= 0 ? 'text-accent' : 'text-red'
                    }`}
                  >
                    {shotSg[i] === null || shotSg[i] === undefined ? '–' : signed(shotSg[i]!)}
                  </span>
                )}
                {!isPutt && (
                  <button
                    type="button"
                    data-testid={`strike-toggle-${i}`}
                    onClick={() => onToggleStrike(i)}
                    aria-pressed={s.strike === 'miss'}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 transition ${
                      s.strike === 'miss' ? 'border-yellow bg-yellow-dim text-yellow' : 'border-border text-text3 hover:border-border2'
                    }`}
                  >
                    미스
                  </button>
                )}
                <button
                  type="button"
                  data-testid={`pen-toggle-${i}`}
                  onClick={() => onTogglePen(i)}
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 transition ${
                    s.pen ? 'border-red bg-red-dim text-red' : 'border-border text-text3 hover:border-border2'
                  }`}
                >
                  +1 벌타
                </button>
                {isLast && (
                  <button
                    type="button"
                    onClick={removeLast}
                    data-testid="remove-last-shot"
                    className="ml-1 text-text3 hover:text-red text-sm"
                    aria-label="마지막 샷 삭제"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 다음 샷 입력 */}
      {!complete && (
        <div data-testid="shot-entry" className="rounded-xl border border-dashed border-border p-3 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-text3 font-medium">
            샷 {shots.length + 1} · 친 후 공 위치
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LIE_OPTIONS.map((lie) => (
              <button
                key={lie}
                type="button"
                data-testid={`lie-${lie}`}
                onClick={() => pickLie(lie)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  pendingLie === lie ? lieActiveClass[lie] : idleClass
                }`}
              >
                {LIE_LABELS[lie]}
              </button>
            ))}
          </div>

          {pendingLie && pendingLie !== 'HOLED' && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">
                홀까지 남은 거리
              </p>
              <div className="flex flex-wrap gap-1.5">
                {distBucketsFor(pendingLie).map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-testid={`dist-${d}`}
                    onClick={() => pickDist(d)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition ${idleClass}`}
                  >
                    {distLabel(d)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
