'use client';

import { useReducer, useRef, useCallback, useMemo, useState, useEffect } from 'react';
import type { Round, HoleData, HoleFormState, Shot, HoleLenBucket } from '@/lib/types';
import { emptyHoleFormState, HOLE_LEN_BUCKETS, WEATHER_ICONS, holeLenMid } from '@/lib/constants';
import { isLedgerComplete, derivedScore, holeStats } from '@/lib/stats';
import { holeSG } from '@/lib/sg';
import { createClient } from '@/lib/supabase/client';
import { withRetry, DEFAULT_RETRY_DELAYS } from '@/lib/retry';
import { SupabaseSaveError, classifySupabaseError, isRetryableKind, shouldKeepLocally, saveErrorMessage } from '@/lib/save-errors';
import { readPending, addPending, removePending, getBrowserStorage, type PendingHole } from '@/lib/pending-holes';
import { logError, logWarn, describeError, isSessionMissing } from '@/lib/log';

import { HoleNav } from '@/components/input/hole-nav';
import { ShotLedger } from '@/components/input/shot-ledger';
import { ScoreInput, vsParLabel, vsParColor } from '@/components/input/score-input';
import { NotesSection } from '@/components/input/notes-section';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { MiniToggle } from '@/components/ui/mini-toggle';

/* ── Reducer ─────────────────────────────────────────────── */

type Action =
  | { type: 'SET_ALL'; state: HoleFormState }
  | { type: 'SET_PAR'; par: number }
  | { type: 'SET_HOLE_LEN'; value: HoleLenBucket | null }
  | { type: 'ADD_SHOT'; shot: Shot }
  | { type: 'REMOVE_LAST_SHOT' }
  | { type: 'TOGGLE_PEN'; index: number }
  | { type: 'TOGGLE_STRIKE'; index: number }
  | { type: 'SET_SCORE_ONLY'; value: boolean }
  | { type: 'SET_SCORE'; score: number }
  | { type: 'SET_NOTES'; value: string };

function withLedgerScore(state: HoleFormState, shots: Shot[]): HoleFormState {
  // 원장 모드에서는 스코어를 항상 원장에서 파생 (미완성이면 진행 중 타수)
  return { ...state, shots, score: shots.length > 0 ? derivedScore(shots) : state.par };
}

function reducer(state: HoleFormState, action: Action): HoleFormState {
  switch (action.type) {
    case 'SET_ALL':
      return action.state;
    case 'SET_PAR': {
      const score = state.scoreOnly && state.score === state.par ? action.par : state.score;
      return { ...state, par: action.par, holeLen: null, score };
    }
    case 'SET_HOLE_LEN':
      return { ...state, holeLen: action.value };
    case 'ADD_SHOT':
      return withLedgerScore(state, [...state.shots, action.shot]);
    case 'REMOVE_LAST_SHOT':
      return withLedgerScore(state, state.shots.slice(0, -1));
    case 'TOGGLE_PEN':
      return withLedgerScore(
        state,
        state.shots.map((s, i) => (i === action.index ? { ...s, pen: !s.pen } : s)),
      );
    case 'TOGGLE_STRIKE':
      // ok ↔ miss. 미기록(null, 이전 데이터)은 miss로 시작해 ok로 갈 수 있게 한다. 스코어엔 영향 없음.
      return {
        ...state,
        shots: state.shots.map((s, i) =>
          i === action.index ? { ...s, strike: s.strike === 'miss' ? 'ok' : 'miss' } : s),
      };
    case 'SET_SCORE_ONLY':
      return { ...state, scoreOnly: action.value };
    case 'SET_SCORE':
      return { ...state, score: action.score };
    case 'SET_NOTES':
      return { ...state, notes: action.value };
  }
}

/* ── Helpers ─────────────────────────────────────────────── */

function holeDataToFormState(h: HoleData): HoleFormState {
  return {
    par: h.par,
    score: h.score,
    holeLen: h.holeLen,
    shots: h.shots ?? [],
    scoreOnly: h.shots === null,
    notes: h.notes,
  };
}

function formStatesEqual(a: HoleFormState, b: HoleFormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 원장 모드면 스코어를 원장에서 파생하고 shots를 정규화한 "저장 상태" */
function toSavedState(s: HoleFormState): HoleFormState {
  const score = s.scoreOnly ? s.score : derivedScore(s.shots);
  return { ...s, score, shots: s.scoreOnly ? [] : s.shots };
}

/** holes 테이블 행 */
function toRow(roundId: string, userId: string, holeNum: number, s: HoleFormState) {
  const saved = toSavedState(s);
  return {
    round_id: roundId,
    user_id: userId,
    hole_num: holeNum,
    par: saved.par,
    score: saved.score,
    hole_len_bucket: saved.holeLen,
    shots: (s.scoreOnly ? null : saved.shots) as unknown as Record<string, unknown>[] | null,
    notes: saved.notes,
    saved_at: new Date().toISOString(),
  };
}

const SAVE_RETRIES = 3;

/* ── Component ───────────────────────────────────────────── */

interface HoleInputProps {
  round: Round;
  savedHoles: HoleData[];
}

const PAR_OPTIONS = ['3', '4', '5'] as const;

export function HoleInput({ round, savedHoles }: HoleInputProps) {
  const [activeHole, setActiveHole] = useState(1);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState<{ attempt: number; max: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 저장에 실패해 이 기기에 보관 중인 홀 (초기엔 빈 값 — 서버 렌더와 맞추고 마운트 후 localStorage에서 복원)
  const [pending, setPending] = useState<Map<number, PendingHole>>(() => new Map());

  // 서버에서 받은 홀 → 저장 상태 맵 (저장 성공 시 갱신)
  const [savedMap, setSavedMap] = useState<Map<number, HoleFormState>>(() => {
    const m = new Map<number, HoleFormState>();
    for (const h of savedHoles) m.set(h.holeNum, holeDataToFormState(h));
    return m;
  });

  const initialState = useMemo(
    () => savedMap.get(1) ?? emptyHoleFormState(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [state, dispatch] = useReducer(reducer, initialState);

  // 홀 전환 시 미저장 편집 보존
  const cacheRef = useRef<Map<number, HoleFormState>>(new Map());
  const [dirtyTick, setDirtyTick] = useState(0); // 캐시 변경을 렌더에 반영

  const navSaved = useMemo(() => {
    const m = new Map<number, { score: number; par: number }>();
    for (const [num, s] of savedMap) m.set(num, { score: s.score, par: s.par });
    return m;
  }, [savedMap]);

  const dirtyHoles = useMemo(() => {
    const set = new Set<number>();
    for (const [num, s] of cacheRef.current) {
      const saved = savedMap.get(num);
      const baseline = saved ?? emptyHoleFormState(s.par);
      if (!formStatesEqual(s, baseline)) set.add(num);
    }
    // 현재 홀도 비교
    const savedCur = savedMap.get(activeHole);
    const baselineCur = savedCur ?? emptyHoleFormState(state.par);
    if (!formStatesEqual(state, baselineCur)) set.add(activeHole);
    else set.delete(activeHole);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMap, state, activeHole, dirtyTick]);

  // 마운트 시 이 기기에 보관된 미저장 홀 복원. 활성 홀(1)은 폼에, 나머지는 캐시에 → switchHole이 캐시를 우선하므로 그대로 뜬다.
  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) return;
    const list = readPending(storage, round.id);
    if (list.length === 0) return;
    for (const p of list) {
      if (p.holeNum === activeHole) dispatch({ type: 'SET_ALL', state: p.state });
      else cacheRef.current.set(p.holeNum, p.state);
    }
    setPending(new Map(list.map((p) => [p.holeNum, p])));
    setDirtyTick((t) => t + 1);
    logWarn('hole-save.pending-restored', `${list.length} holes`, { roundId: round.id, holes: list.map((p) => p.holeNum) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingHoles = useMemo(() => new Set(pending.keys()), [pending]);
  const pendingOthers = pending.size - (pending.has(activeHole) ? 1 : 0);

  const switchHole = useCallback((targetHole: number) => {
    if (targetHole === activeHole) return;
    cacheRef.current.set(activeHole, state);
    setDirtyTick((t) => t + 1);

    const next =
      cacheRef.current.get(targetHole) ??
      savedMap.get(targetHole) ??
      emptyHoleFormState();

    dispatch({ type: 'SET_ALL', state: next });
    setActiveHole(targetHole);
  }, [activeHole, state, savedMap]);

  const ledgerComplete = isLedgerComplete(state.shots);
  const stats = holeStats(state.par, state.score, state.scoreOnly ? null : state.shots);
  // 샷별 SG (진행 중에도 계산 — 마지막 샷까지의 위치만으로 값이 나온다). 계산은 sg.ts.
  const liveSg = useMemo(
    () => (!state.scoreOnly && state.shots.length > 0 ? holeSG(state.par, holeLenMid(state.holeLen), state.shots) : null),
    [state.scoreOnly, state.shots, state.par, state.holeLen],
  );

  function showToast(msg: string, ms = 2000) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  /** 현재 홀을 이 기기에 보관하고 네비에 표시 */
  function keepLocally(holeNum: number, savedState: HoleFormState): boolean {
    const storage = getBrowserStorage();
    const ok = storage !== null && addPending(storage, round.id, holeNum, savedState);
    if (ok) {
      setPending((prev) => new Map(prev).set(holeNum, { holeNum, state: savedState, savedAt: new Date().toISOString() }));
      cacheRef.current.set(holeNum, savedState);
      setDirtyTick((t) => t + 1);
    }
    return ok;
  }

  /** 저장 성공한 홀들을 savedMap/캐시에 반영하고 대기열에서 제거 */
  function commitSaved(entries: Array<[number, HoleFormState]>) {
    setSavedMap((prev) => {
      const next = new Map(prev);
      for (const [n, s] of entries) next.set(n, s);
      return next;
    });
    for (const [n, s] of entries) cacheRef.current.set(n, s);
    const storage = getBrowserStorage();
    if (storage) removePending(storage, round.id, entries.map(([n]) => n));
    setPending((prev) => {
      const next = new Map(prev);
      for (const [n] of entries) next.delete(n);
      return next;
    });
    setDirtyTick((t) => t + 1);
  }

  /**
   * 저장: 대기 홀 + 현재 홀을 한 번의 배치 upsert로. 실패하면 재시도 3회(500ms·1s·2s) →
   * 그래도 안 되면 이 기기에 보관하고 다음 저장 때 다시 합쳐서 시도한다.
   */
  async function handleSave() {
    if (!state.scoreOnly && !ledgerComplete) {
      showToast('홀아웃(In)까지 입력하거나 "스코어만 입력"으로 전환하세요');
      return;
    }

    setSaving(true);
    setRetrying(null);
    const savedState = toSavedState(state);
    const flush = [...pending.values()].filter((p) => p.holeNum !== activeHole);
    const ctx = { roundId: round.id, holeNum: activeHole, pending: flush.map((p) => p.holeNum) };

    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        if (authErr && !isSessionMissing(authErr)) logError('hole-save.auth', authErr, ctx);
        const kept = keepLocally(activeHole, savedState);
        showToast(kept ? '로그인이 만료됐습니다. 입력은 이 기기에 보관했습니다' : '로그인이 만료됐습니다. 다시 로그인해 주세요', 3500);
        return;
      }

      const upsertRows = async (rows: ReturnType<typeof toRow>[]) => {
        const { error, status } = await supabase.from('holes').upsert(rows, { onConflict: 'round_id,hole_num' });
        if (error) throw new SupabaseSaveError(error, status);
      };
      const rowsFor = (entries: Array<[number, HoleFormState]>) => entries.map(([n, s]) => toRow(round.id, user.id, n, s));

      const batch: Array<[number, HoleFormState]> = [
        ...flush.map((p): [number, HoleFormState] => [p.holeNum, p.state]),
        [activeHole, state],
      ];

      try {
        await withRetry(() => upsertRows(rowsFor(batch)), {
          retries: SAVE_RETRIES,
          delays: DEFAULT_RETRY_DELAYS,
          isRetryable: (e) => isRetryableKind(classifySupabaseError(e)),
          onRetry: (attempt, e) => {
            setRetrying({ attempt, max: SAVE_RETRIES });
            logWarn('hole-save.retry', `attempt ${attempt}/${SAVE_RETRIES}`, { ...ctx, ...describeError(e) });
          },
        });
      } catch (e) {
        const kind = classifySupabaseError(e);
        logError('hole-save.failed', e, { ...ctx, kind, retried: isRetryableKind(kind) });

        // 대기 홀 쪽 데이터 오류가 배치 전체를 막은 경우: 현재 홀만 한 번 더 (재시도 없음)
        if (!isRetryableKind(kind) && flush.length > 0) {
          try {
            await upsertRows(rowsFor([[activeHole, state]]));
            commitSaved([[activeHole, savedState]]);
            showToast(`저장됨 · 미저장 ${flush.length}홀은 ${saveErrorMessage(kind)}`, 3500);
            return;
          } catch (e2) {
            logError('hole-save.failed-single', e2, ctx);
          }
        }

        if (shouldKeepLocally(kind)) {
          const kept = keepLocally(activeHole, savedState);
          showToast(
            kept
              ? `${saveErrorMessage(kind)} · 이 기기에 보관했습니다. 다음 저장 때 다시 시도합니다`
              : `${saveErrorMessage(kind)} · 보관도 실패했습니다. 화면을 닫지 마세요`,
            3500,
          );
        } else {
          showToast(saveErrorMessage(kind), 3000);
        }
        return;
      }

      commitSaved(batch.map(([n, s]): [number, HoleFormState] => [n, toSavedState(s)]));

      if (activeHole < round.holes) {
        showToast(flush.length > 0 ? `저장됨 (미저장 ${flush.length}홀 포함)` : '저장됨', flush.length > 0 ? 1500 : 400);
        setTimeout(() => switchHole(activeHole + 1), 400);
      } else {
        showToast(flush.length > 0 ? `라운드 완료! (미저장 ${flush.length}홀 포함)` : '라운드 완료!', 3000);
      }
    } catch (e) {
      // 예상 밖 throw (버그, 브라우저 예외). 입력은 보관해 둔다.
      logError('hole-save.unexpected', e, ctx);
      const kept = keepLocally(activeHole, savedState);
      showToast(kept ? '저장에 실패했습니다 · 이 기기에 보관했습니다' : '저장에 실패했습니다', 3500);
    } finally {
      setSaving(false);
      setRetrying(null);
    }
  }

  const headerParts: string[] = [
    new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }),
    `${round.tee} tee`,
    `${round.holes}H`,
  ];
  if (round.weather) {
    const tempStr = round.temperature != null ? ` ${round.temperature}°C` : '';
    headerParts.push(`${WEATHER_ICONS[round.weather]}${tempStr}`);
  }

  const diff = state.score - state.par;
  const holeLenOptions = HOLE_LEN_BUCKETS[state.par] ?? [];

  return (
    <div className="space-y-4">
      {/* 라운드 헤더 */}
      <div>
        <h2 data-testid="round-course" className="text-lg font-bold">{round.course}</h2>
        <p className="text-sm text-text2">{headerParts.join(' · ')}</p>
      </div>

      <HoleNav
        totalHoles={round.holes}
        activeHole={activeHole}
        savedHoles={navSaved}
        dirtyHoles={dirtyHoles}
        pendingHoles={pendingHoles}
        onSelect={switchHole}
      />

      {/* 파 + 홀 길이 */}
      <div className="rounded-xl border border-border bg-surface2 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-14 text-xs text-text2 font-medium">PAR</span>
          <MiniToggle
            options={PAR_OPTIONS}
            value={String(state.par)}
            onChange={(v) => dispatch({ type: 'SET_PAR', par: parseInt(v) })}
            testIdPrefix="par"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-14 text-xs text-text2 font-medium">길이(m)</span>
          <MiniToggle
            options={holeLenOptions.map((o) => o.key)}
            labels={Object.fromEntries(holeLenOptions.map((o) => [o.key, o.label]))}
            value={state.holeLen}
            onChange={(v) => dispatch({ type: 'SET_HOLE_LEN', value: v as HoleLenBucket })}
            color="blue"
            testIdPrefix="holelen"
          />
        </div>
      </div>

      {/* 스코어 요약 / 스코어만 입력 토글 */}
      <div className="rounded-xl border border-border bg-surface2 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Score</span>
          <button
            type="button"
            data-testid="score-only-toggle"
            data-active={state.scoreOnly ? 'true' : 'false'}
            onClick={() => dispatch({ type: 'SET_SCORE_ONLY', value: !state.scoreOnly })}
            className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${
              state.scoreOnly
                ? 'border-yellow bg-yellow-dim text-yellow'
                : 'border-border text-text3 hover:border-border2'
            }`}
          >
            {state.scoreOnly ? '스코어만 입력 중' : '스코어만 입력'}
          </button>
        </div>

        {state.scoreOnly ? (
          <ScoreInput
            par={state.par}
            score={state.score}
            onChange={(v) => dispatch({ type: 'SET_SCORE', score: v })}
          />
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span data-testid="hole-score" className="font-mono text-4xl font-medium">{state.shots.length > 0 ? state.score : '–'}</span>
              <p data-testid="hole-score-label" className={`text-[10px] font-semibold mt-0.5 ${state.shots.length > 0 ? vsParColor(diff) : 'text-text3'}`}>
                {state.shots.length === 0 ? '샷을 입력하세요' : ledgerComplete ? vsParLabel(diff) : '진행 중'}
              </p>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-1.5 text-center">
              <Stat label="FIR" value={stats.fir === null ? (state.par === 3 ? '–' : '?') : stats.fir ? '✓' : '✗'} tone={stats.fir} />
              <Stat label="GIR" value={stats.gir === null ? '?' : stats.gir ? '✓' : '✗'} tone={stats.gir} />
              <Stat label="Putts" value={stats.putts === null ? '?' : String(stats.putts)} />
              <Stat label="Pen" value={String(state.shots.filter((s) => s.pen).length)} tone={state.shots.some((s) => s.pen) ? false : null} />
              <Stat label="Miss" value={String(state.shots.filter((s) => s.strike === 'miss').length)} tone={state.shots.some((s) => s.strike === 'miss') ? false : null} />
            </div>
          </div>
        )}
      </div>

      {/* 샷 원장 */}
      {!state.scoreOnly && (
        <div className="rounded-xl border border-border bg-surface2 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm font-semibold">Shots</p>
            {liveSg && liveSg.counted > 0 && (
              <p className="text-[11px] text-text3">
                SG vs Tour{' '}
                <span data-testid="hole-sg-total" className={`font-mono font-semibold ${liveSg.total >= 0 ? 'text-accent' : 'text-red'}`}>
                  {liveSg.total > 0 ? '+' : ''}{liveSg.total.toFixed(2)}
                </span>
                {!ledgerComplete && ' · 진행 중'}
                {liveSg.skipped > 0 && ' · 홀 길이 없음: 티샷 제외'}
              </p>
            )}
          </div>
          <ShotLedger
            key={activeHole}
            shots={state.shots}
            onAdd={(shot) => dispatch({ type: 'ADD_SHOT', shot })}
            onRemoveLast={() => dispatch({ type: 'REMOVE_LAST_SHOT' })}
            onTogglePen={(i) => dispatch({ type: 'TOGGLE_PEN', index: i })}
            onToggleStrike={(i) => dispatch({ type: 'TOGGLE_STRIKE', index: i })}
            shotSg={liveSg ? liveSg.shots.map((x) => x.value) : undefined}
          />
        </div>
      )}

      {/* 노트 */}
      <CollapsibleSection icon="📝" iconColor="purple" title="Notes" status={state.notes ? '…' : undefined}>
        <NotesSection value={state.notes} onChange={(v) => dispatch({ type: 'SET_NOTES', value: v })} />
      </CollapsibleSection>

      {/* 미저장 보관 안내 */}
      {pending.size > 0 && (
        <div
          data-testid="pending-notice"
          data-count={pending.size}
          className="rounded-lg border border-yellow bg-yellow-dim px-3 py-2 text-xs text-yellow leading-relaxed"
        >
          미저장 {pending.size}홀 ({[...pending.keys()].sort((a, b) => a - b).join(', ')}번) · 이 기기에 보관 중.
          다음 저장 때 함께 저장합니다
        </div>
      )}

      {/* 저장 */}
      <button
        type="button"
        data-testid="save-hole"
        onClick={handleSave}
        disabled={saving}
        data-saving={saving ? 'true' : 'false'}
        data-retrying={retrying ? 'true' : 'false'}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
      >
        {retrying ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span data-testid="save-retrying" className="h-4 w-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />
            재시도 중 ({retrying.attempt}/{retrying.max})
          </span>
        ) : saving ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />
            저장 중
          </span>
        ) : pendingOthers > 0 ? (
          `Save Hole ${activeHole} (+미저장 ${pendingOthers}홀)`
        ) : (
          `Save Hole ${activeHole}`
        )}
      </button>

      {toast && (
        <div data-testid="toast" className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-lg bg-surface2 border border-border px-4 py-2.5 text-sm font-medium text-text shadow-lg text-center">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: boolean | null }) {
  const color = tone === true ? 'text-accent' : tone === false ? 'text-red' : 'text-text2';
  return (
    <div className="rounded-lg bg-surface3 py-1.5" data-testid={`stat-${label.toLowerCase()}`}>
      <p className="text-[9px] uppercase tracking-wide text-text3">{label}</p>
      <p data-testid={`stat-${label.toLowerCase()}-value`} className={`font-mono text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}
