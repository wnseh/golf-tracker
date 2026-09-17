'use client';

import { useReducer, useRef, useCallback, useMemo, useState } from 'react';
import type { Round, HoleData, HoleFormState, Shot, HoleLenBucket } from '@/lib/types';
import { emptyHoleFormState, HOLE_LEN_BUCKETS, WEATHER_ICONS } from '@/lib/constants';
import { isLedgerComplete, derivedScore, holeStats } from '@/lib/stats';
import { createClient } from '@/lib/supabase/client';

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

/* ── Component ───────────────────────────────────────────── */

interface HoleInputProps {
  round: Round;
  savedHoles: HoleData[];
}

const PAR_OPTIONS = ['3', '4', '5'] as const;

export function HoleInput({ round, savedHoles }: HoleInputProps) {
  const [activeHole, setActiveHole] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  function showToast(msg: string, ms = 2000) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  async function handleSave() {
    if (!state.scoreOnly && !ledgerComplete) {
      showToast('홀아웃(In)까지 입력하거나 "스코어만 입력"으로 전환하세요');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('로그인이 필요합니다');
        return;
      }

      const score = state.scoreOnly ? state.score : derivedScore(state.shots);
      const shots = state.scoreOnly ? null : state.shots;

      const { error } = await supabase
        .from('holes')
        .upsert(
          {
            round_id: round.id,
            user_id: user.id,
            hole_num: activeHole,
            par: state.par,
            score,
            hole_len_bucket: state.holeLen,
            shots: shots as unknown as Record<string, unknown>[] | null,
            notes: state.notes,
            saved_at: new Date().toISOString(),
          },
          { onConflict: 'round_id,hole_num' },
        );

      if (error) {
        showToast('저장 실패');
        return;
      }

      const savedState: HoleFormState = { ...state, score, shots: shots ?? [] };
      setSavedMap((prev) => new Map(prev).set(activeHole, savedState));
      cacheRef.current.set(activeHole, savedState);

      if (activeHole < round.holes) {
        showToast('저장됨', 400);
        setTimeout(() => switchHole(activeHole + 1), 400);
      } else {
        showToast('라운드 완료!', 3000);
      }
    } finally {
      setSaving(false);
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
            <div className="flex-1 grid grid-cols-4 gap-2 text-center">
              <Stat label="FIR" value={stats.fir === null ? (state.par === 3 ? '–' : '?') : stats.fir ? '✓' : '✗'} tone={stats.fir} />
              <Stat label="GIR" value={stats.gir === null ? '?' : stats.gir ? '✓' : '✗'} tone={stats.gir} />
              <Stat label="Putts" value={stats.putts === null ? '?' : String(stats.putts)} />
              <Stat label="Pen" value={String(state.shots.filter((s) => s.pen).length)} tone={state.shots.some((s) => s.pen) ? false : null} />
            </div>
          </div>
        )}
      </div>

      {/* 샷 원장 */}
      {!state.scoreOnly && (
        <div className="rounded-xl border border-border bg-surface2 p-4">
          <p className="text-sm font-semibold mb-3">Shots</p>
          <ShotLedger
            key={activeHole}
            shots={state.shots}
            onAdd={(shot) => dispatch({ type: 'ADD_SHOT', shot })}
            onRemoveLast={() => dispatch({ type: 'REMOVE_LAST_SHOT' })}
            onTogglePen={(i) => dispatch({ type: 'TOGGLE_PEN', index: i })}
          />
        </div>
      )}

      {/* 노트 */}
      <CollapsibleSection icon="📝" iconColor="purple" title="Notes" status={state.notes ? '…' : undefined}>
        <NotesSection value={state.notes} onChange={(v) => dispatch({ type: 'SET_NOTES', value: v })} />
      </CollapsibleSection>

      {/* 저장 */}
      <button
        type="button"
        data-testid="save-hole"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving...' : `Save Hole ${activeHole}`}
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
