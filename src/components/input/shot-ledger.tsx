'use client';

import { useState } from 'react';
import type { Shot, Lie, DistBucket, StartLie } from '@/lib/types';
import { LIE_OPTIONS, LIE_LABELS, distBucketsFor } from '@/lib/constants';
import { startPositions, penaltyStrokes, isObReplay } from '@/lib/ledger';

interface ShotLedgerProps {
  shots: Shot[];
  onAdd: (shot: Shot) => void;
  onRemoveLast: () => void;
  onTogglePen: (index: number) => void;
  onToggleStrike: (index: number) => void;
  /** 파4·5에서만 전달. 티에서 친 샷 줄(OB 다시 치기 후 포함)에 드라이버 토글을 보인다. */
  onToggleDriver?: (index: number) => void;
  /** 샷별 SG vs Tour (sg.ts holeSG). 홀 길이 미입력이면 첫 샷은 null. 없으면 표시 안 함. */
  shotSg?: (number | null)[];
}

function signed(v: number, digits = 2) {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

/* 라이별 색상 — Tailwind 동적 클래스 금지, 정적 매핑 */
const lieActiveClass: Record<Lie, string> = {
  FW:    'border-accent bg-accent-dim text-accent',
  RO:    'border-yellow bg-yellow-dim text-yellow',
  SA:    'border-yellow bg-yellow-dim text-yellow',
  TR:    'border-red bg-red-dim text-red',
  GR:    'border-blue bg-blue-dim text-blue',
  HZ:    'border-red bg-red-dim text-red',
  OB:    'border-red bg-red text-bg',
  HOLED: 'border-accent bg-accent text-bg',
};
const lieTextClass: Record<Lie | StartLie, string> = {
  TEE: 'text-text2', FW: 'text-accent', RO: 'text-yellow', SA: 'text-yellow',
  TR: 'text-red', GR: 'text-blue', HZ: 'text-red', OB: 'text-red', HOLED: 'text-accent',
};
const idleClass = 'border-border bg-surface3 text-text2 hover:border-border2';

function distLabel(b: DistBucket): string {
  return b.endsWith('+') ? `${b.slice(0, -1)}m+` : `${b}m`;
}

export function ShotLedger({ shots, onAdd, onRemoveLast, onTogglePen, onToggleStrike, onToggleDriver, shotSg }: ShotLedgerProps) {
  const [pendingLie, setPendingLie] = useState<Lie | null>(null);
  // OB를 고른 뒤 "특설티·드롭"을 골랐는지 (다시 치기는 바로 추가되므로 상태 없음)
  const [obDrop, setObDrop] = useState(false);
  const complete = shots.length > 0 && shots[shots.length - 1].lie === 'HOLED';

  // 샷별 치기 전 라이 (HZ 드롭·OB 다시 치기 반영). 마지막 항목 = 다음에 입력할 샷의 출발
  const starts = startPositions(shots, null);
  const startLieOf = (i: number): StartLie => starts[i]?.lie ?? 'TEE';
  const nextStart = startLieOf(shots.length);

  // 다음 샷의 컨택 기본값: 퍼트(그린에서 치는 샷)는 기록 안 함, 나머지는 ok로 시작
  const nextStrike = nextStart === 'GR' ? null : 'ok';

  function reset() {
    setPendingLie(null);
    setObDrop(false);
  }

  function pickLie(lie: Lie) {
    if (lie === 'HOLED') {
      onAdd({ lie: 'HOLED', dist: null, pen: false, strike: nextStrike });
      reset();
      return;
    }
    setObDrop(false);
    setPendingLie(lie === pendingLie ? null : lie);
  }

  function pickObReplay() {
    onAdd({ lie: 'OB', dist: null, pen: false, strike: nextStrike });
    reset();
  }

  function pickDist(dist: DistBucket) {
    if (!pendingLie) return;
    onAdd({ lie: pendingLie, dist, pen: false, strike: nextStrike });
    reset();
  }

  function removeLast() {
    reset();
    onRemoveLast();
  }

  const showDist = pendingLie !== null && pendingLie !== 'HOLED' && (pendingLie !== 'OB' || obDrop);
  const distTitle =
    pendingLie === 'HZ' ? '드롭 지점에서 남은 거리'
    : pendingLie === 'OB' ? (nextStart === 'TEE' ? '특설티에서 남은 거리' : '드롭 지점에서 남은 거리')
    : '홀까지 남은 거리';

  return (
    <div className="space-y-3">
      {/* 기록된 샷 */}
      {shots.length > 0 && (
        <div className="space-y-1.5">
          {shots.map((s, i) => {
            const start = startLieOf(i);
            const isLast = i === shots.length - 1;
            const isPutt = start === 'GR';
            const autoPen = s.lie === 'HZ' || s.lie === 'OB' ? penaltyStrokes({ ...s, pen: false }) : 0;
            return (
              <div
                key={i}
                data-testid="shot-row"
                data-lie={s.lie}
                data-dist={s.dist ?? ''}
                data-pen={s.pen ? 'true' : 'false'}
                data-strike={s.strike ?? ''}
                className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-border bg-surface3 px-2.5 py-2 text-sm"
              >
                {/* 위치 (왼쪽) — 폭이 모자라면 오른쪽 컨트롤 묶음이 다음 줄로 내려간다 */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 font-mono text-xs text-text3">{i + 1}</span>
                  {start === 'TEE' && onToggleDriver ? (
                    <button
                      type="button"
                      data-testid="driver-toggle"
                      data-driver={s.driver === true ? 'true' : s.driver === false ? 'false' : ''}
                      onClick={() => onToggleDriver(i)}
                      aria-pressed={s.driver === true}
                      title="티샷 클럽: 드라이버 ↔ 끊어감(우드·유틸·아이언)"
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 transition ${
                        s.driver === true ? 'border-blue bg-blue-dim text-blue'
                        : s.driver === false ? 'border-purple bg-purple-dim text-purple'
                        : 'border-border text-text3 hover:border-border2'
                      }`}
                    >
                      {s.driver === true ? '드라이버' : s.driver === false ? '끊어감' : 'Tee'}
                    </button>
                  ) : (
                    <span className={`text-xs ${lieTextClass[start]}`}>{LIE_LABELS[start]}</span>
                  )}
                  <span className="text-text3 text-xs">→</span>
                  <span className={`font-medium ${lieTextClass[s.lie]}`}>{LIE_LABELS[s.lie]}</span>
                  {isObReplay(s) && <span className="text-[10px] text-text3 whitespace-nowrap">다시 침</span>}
                  {s.dist && <span className="font-mono text-xs text-text2 whitespace-nowrap">{distLabel(s.dist)}</span>}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
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
                  {autoPen > 0 ? (
                    <span
                      data-testid={`auto-pen-${i}`}
                      className="rounded-md border border-red bg-red-dim px-1.5 py-0.5 text-[10px] font-semibold text-red whitespace-nowrap shrink-0"
                    >
                      +{autoPen} 벌타
                    </span>
                  ) : (
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
                  )}
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

          {pendingLie === 'OB' && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">
                OB 처리
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  data-testid="ob-replay"
                  onClick={pickObReplay}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${idleClass}`}
                >
                  다시 치기 (+1)
                </button>
                <button
                  type="button"
                  data-testid="ob-drop"
                  onClick={() => setObDrop(!obDrop)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    obDrop ? lieActiveClass.HZ : idleClass
                  }`}
                >
                  {nextStart === 'TEE' ? '특설티 (+2)' : '드롭 (+2)'}
                </button>
              </div>
            </div>
          )}

          {showDist && pendingLie && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">
                {distTitle}
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
