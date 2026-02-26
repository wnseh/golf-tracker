'use client';

import { useReducer, useRef, useCallback, useMemo, useState } from 'react';
import type { Round, HoleData, HoleFormState, TeeRoutine, StgShot, PuttCard as PuttCardType, UserClub, InputMode } from '@/lib/types';
import { emptyHoleFormState, emptyStgShot, emptyPuttCard, WEATHER_ICONS, MODE_OPTIONS, MODE_LABELS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { ModeProvider } from '@/lib/mode-context';

import { HoleNav } from '@/components/input/hole-nav';
import { ScoreInput } from '@/components/input/score-input';
import { TeeShot } from '@/components/input/tee-shot';
import { GroundShotSection } from '@/components/input/ground-shot';
import { PuttingSection } from '@/components/input/putting';
import { NotesSection } from '@/components/input/notes-section';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { MiniToggle } from '@/components/ui/mini-toggle';
import { FunMode } from '@/components/input/fun-mode';
import { CasualTeeShot } from '@/components/input/casual/casual-tee-shot';
import { CasualGroundSection } from '@/components/input/casual/casual-ground-shot';
import { CasualPuttingSection } from '@/components/input/casual/casual-putting';

/* ── Reducer ─────────────────────────────────────────────── */

type Action =
  | { type: 'SET_ALL'; state: HoleFormState }
  | { type: 'SET_PAR'; par: number }
  | { type: 'SET_SCORE'; score: number }
  | { type: 'SET_TEE_CLUB'; value: string }
  | { type: 'SET_TEE_CARRY'; value: string }
  | { type: 'PATCH_TEE_ROUTINE'; patch: Partial<TeeRoutine> }
  | { type: 'SET_STG_SHOTS'; shots: StgShot[] }
  | { type: 'SET_PUTT_CARDS'; putts: PuttCardType[] }
  | { type: 'SET_NOTES'; value: string }
  | { type: 'SET_SHOTS_TO_GREEN'; count: number }
  | { type: 'SET_PUTTS_COUNT'; count: number };

function reducer(state: HoleFormState, action: Action): HoleFormState {
  switch (action.type) {
    case 'SET_ALL':
      return action.state;
    case 'SET_PAR':
      return { ...state, par: action.par, score: state.score === state.par ? action.par : state.score };
    case 'SET_SCORE':
      return { ...state, score: action.score };
    case 'SET_TEE_CLUB':
      return { ...state, teeClub: action.value };
    case 'SET_TEE_CARRY':
      return { ...state, teeCarry: action.value };
    case 'PATCH_TEE_ROUTINE':
      return { ...state, teeRoutine: { ...state.teeRoutine, ...action.patch } };
    case 'SET_STG_SHOTS':
      return { ...state, stgShots: action.shots, shotsToGreenOverride: null };
    case 'SET_PUTT_CARDS':
      return { ...state, puttCards: action.putts, puttsOverride: undefined };
    case 'SET_NOTES':
      return { ...state, notes: action.value };
    case 'SET_SHOTS_TO_GREEN': {
      const target = Math.max(1, action.count);
      const targetStg = target - 1; // tee shot counts as 1
      const current = [...state.stgShots];
      while (current.length < targetStg) current.push(emptyStgShot());
      while (current.length > targetStg) current.pop();
      return { ...state, stgShots: current, shotsToGreenOverride: target };
    }
    case 'SET_PUTTS_COUNT': {
      const target = Math.max(0, action.count);
      const current = [...state.puttCards];
      while (current.length < target) current.push(emptyPuttCard());
      while (current.length > target) current.pop();
      return { ...state, puttCards: current, puttsOverride: target };
    }
  }
}

/* ── Helpers ─────────────────────────────────────────────── */

function holeDataToFormState(h: HoleData): HoleFormState {
  return {
    par: h.par,
    score: h.score,
    teeClub: '',
    teeCarry: '',
    teeRoutine: h.teeRoutine,
    stgShots: h.stgShots,
    puttCards: h.puttCards,
    notes: h.notes,
    shotsToGreenOverride: null,
  };
}

const curveLabels: Record<string, string> = {
  'duck-hook': 'D-Hook', hook: 'Hook', draw: 'Draw',
  straight: 'Str', fade: 'Fade', slice: 'Slice', shank: 'Shank',
};

const startLineLabels: Record<string, string> = {
  pull: 'Pull', straight: 'Str', push: 'Push',
};

function teeShotStatus(state: HoleFormState): string {
  const r = state.teeRoutine;
  const parts: string[] = [];
  if (r.landing) parts.push(r.landing);
  if (r.actualCarry) parts.push(`${r.actualCarry}m`);
  if (r.resultStartLine && r.resultStartLine !== 'straight') {
    parts.push(startLineLabels[r.resultStartLine] ?? r.resultStartLine);
  }
  if (r.resultCurve && r.resultCurve !== 'straight') {
    parts.push(curveLabels[r.resultCurve] ?? r.resultCurve);
  }
  if (!parts.length && r.resultCurve === 'straight' && r.resultStartLine === 'straight') {
    // Only show 'Str' if landing or carry present too
  }
  return parts.join(' ') || '';
}

function stgShotStatus(shots: StgShot[]): string {
  if (shots.length === 0) return '';
  const counts: Record<string, number> = {};
  for (const s of shots) {
    const label = s.intent.toUpperCase();
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ');
}

function puttStatus(putts: PuttCardType[]): string {
  if (putts.length === 0) return '';
  const made = putts.filter((p) => p.outcome === 'made').length;
  const missed = putts.filter((p) => p.outcome === 'missed').length;
  const parts = [`${putts.length} putt${putts.length > 1 ? 's' : ''}`];
  if (made || missed) parts.push(`${made} made / ${missed} missed`);
  return parts.join(' · ');
}

function computeShotsToGreen(state: HoleFormState): number {
  if (state.shotsToGreenOverride != null) return state.shotsToGreenOverride;
  return 1 + state.stgShots.length; // tee shot + ground shots
}

function computeGIR(par: number, shotsToGreen: number): boolean {
  return shotsToGreen <= par - 2;
}

function computePutts(state: HoleFormState): number {
  if (state.puttsOverride != null) return state.puttsOverride;
  return state.puttCards.length;
}

/* ── Component ───────────────────────────────────────────── */

interface HoleInputProps {
  round: Round;
  savedHoles: HoleData[];
  userClubs: UserClub[];
}

const PAR_OPTIONS = ['3', '4', '5'] as const;

export function HoleInput({ round, savedHoles, userClubs }: HoleInputProps) {
  const [activeHole, setActiveHole] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mode, setModeState] = useState<InputMode>(round.inputMode);

  const setMode = useCallback(async (m: InputMode) => {
    setModeState(m);
    const supabase = createClient();
    await supabase.from('rounds').update({ input_mode: m }).eq('id', round.id);
  }, [round.id]);

  // Build initial state from first hole (saved or empty)
  const firstSaved = savedHoles.find((h) => h.holeNum === 1);
  const initialState = useMemo(() => {
    if (firstSaved) return holeDataToFormState(firstSaved);
    const empty = emptyHoleFormState();
    // DR auto-select for par >= 4
    if (empty.par >= 4) {
      const dr = userClubs.find((c) => c.clubName === 'DR');
      if (dr) {
        empty.teeClub = 'DR';
        empty.teeCarry = dr.totalM ? String(dr.totalM) : String(dr.carryM);
      }
    }
    return empty;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);

  // Cache for hole states (so switching back restores data)
  const cacheRef = useRef<Map<number, HoleFormState>>(new Map());

  // Build saved-hole lookup for nav display
  const savedMap = useMemo(() => {
    const map = new Map<number, { score: number; par: number }>();
    for (const h of savedHoles) {
      map.set(h.holeNum, { score: h.score, par: h.par });
    }
    return map;
  }, [savedHoles]);

  // Merge cached saves into the nav display
  const navMap = useMemo(() => {
    const m = new Map(savedMap);
    for (const [num] of cacheRef.current) {
      if (!m.has(num)) {
        // Only show if it looks like the user entered something
      }
    }
    return m;
  }, [savedMap, saving]); // re-derive after save

  const switchHole = useCallback((targetHole: number) => {
    // Snapshot current
    cacheRef.current.set(activeHole, { ...state });

    // Load target: cache → server data → empty
    const cached = cacheRef.current.get(targetHole);
    const serverData = savedHoles.find((h) => h.holeNum === targetHole);

    let next: HoleFormState;
    if (cached) {
      next = cached;
    } else if (serverData) {
      next = holeDataToFormState(serverData);
    } else {
      next = emptyHoleFormState();
      // DR auto-select for new empty holes (par >= 4)
      if (next.par >= 4) {
        const dr = userClubs.find((c) => c.clubName === 'DR');
        if (dr) {
          next.teeClub = 'DR';
          next.teeCarry = dr.totalM ? String(dr.totalM) : String(dr.carryM);
        }
      }
    }

    dispatch({ type: 'SET_ALL', state: next });
    setActiveHole(targetHole);
  }, [activeHole, state, savedHoles, userClubs]);

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Auto-derive putt outcome: last putt = made, others = missed
      const puttCardsWithOutcome = state.puttCards.map((p, i) => ({
        ...p,
        outcome: i === state.puttCards.length - 1 ? 'made' as const : 'missed' as const,
      }));

      const { error } = await supabase
        .from('holes')
        .upsert(
          {
            round_id: round.id,
            user_id: user.id,
            hole_num: activeHole,
            par: state.par,
            score: state.score,
            tee_routine: state.teeRoutine as unknown as Record<string, unknown>,
            stg_shots: state.stgShots as unknown as Record<string, unknown>[],
            putt_cards: puttCardsWithOutcome as unknown as Record<string, unknown>[],
            notes: state.notes,
            saved_at: new Date().toISOString(),
          },
          { onConflict: 'round_id,hole_num' },
        );

      if (error) {
        setToast('Save failed');
        setTimeout(() => setToast(null), 2000);
        return;
      }

      // Update saved map for nav display
      savedMap.set(activeHole, { score: state.score, par: state.par });
      cacheRef.current.set(activeHole, { ...state });

      // Auto-advance
      if (activeHole < round.holes) {
        setToast('Saved!');
        setTimeout(() => {
          setToast(null);
          switchHole(activeHole + 1);
        }, 400);
      } else {
        setToast('Round complete!');
        setTimeout(() => setToast(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const shotsToGreen = computeShotsToGreen(state);
  const gir = computeGIR(state.par, shotsToGreen);
  const putts = computePutts(state);

  // Round header info parts
  const headerParts: string[] = [
    new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }),
    `${round.tee} tee`,
    `${round.holes}H`,
    `Speed ${round.greenSpeed.toFixed(1)}`,
  ];
  if (round.weather) {
    const wIcon = WEATHER_ICONS[round.weather];
    const tempStr = round.temperature != null ? ` ${round.temperature}°C` : '';
    headerParts.push(`${wIcon}${tempStr}`);
  }

  return (
    <ModeProvider value={{ mode, setMode }}>
      <div className="space-y-4">
        {/* Round header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">{round.course}</h2>
            <p className="text-sm text-text2">
              {headerParts.join(' · ')}
            </p>
          </div>
          {/* Mode toggle */}
          <div className="shrink-0 ml-3">
            <MiniToggle
              options={MODE_OPTIONS}
              labels={MODE_LABELS}
              value={mode}
              onChange={(v) => setMode(v as InputMode)}
            />
          </div>
        </div>

        {/* Hole nav */}
        <HoleNav
          totalHoles={round.holes}
          activeHole={activeHole}
          savedHoles={navMap}
          onSelect={switchHole}
        />

        {/* Par selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text2 font-medium">PAR</span>
          <MiniToggle
            options={PAR_OPTIONS}
            value={String(state.par)}
            onChange={(v) => dispatch({ type: 'SET_PAR', par: parseInt(v) })}
          />
        </div>

        {mode === 'fun' ? (
          <FunMode
            par={state.par}
            score={state.score}
            notes={state.notes}
            onScoreChange={(v) => dispatch({ type: 'SET_SCORE', score: v })}
            onNotesChange={(v) => dispatch({ type: 'SET_NOTES', value: v })}
          />
        ) : mode === 'casual' ? (
          <>
            {/* Score */}
            <CollapsibleSection icon="🏌️" iconColor="accent" title="Score" defaultOpen>
              <ScoreInput
                par={state.par}
                score={state.score}
                shotsToGreen={shotsToGreen}
                putts={putts}
                onChange={(v) => dispatch({ type: 'SET_SCORE', score: v })}
                onShotsToGreenChange={(v) => dispatch({ type: 'SET_SHOTS_TO_GREEN', count: v })}
                onPuttsChange={(v) => dispatch({ type: 'SET_PUTTS_COUNT', count: v })}
                variant="casual"
              />
            </CollapsibleSection>

            {/* Casual Tee Shot */}
            <CollapsibleSection icon="🎯" iconColor="blue" title="Tee Shot" status={teeShotStatus(state)}>
              <CasualTeeShot
                teeClub={state.teeClub}
                teeCarry={state.teeCarry}
                routine={state.teeRoutine}
                par={state.par}
                userClubs={userClubs}
                onClubChange={(v) => dispatch({ type: 'SET_TEE_CLUB', value: v })}
                onCarryChange={(v) => dispatch({ type: 'SET_TEE_CARRY', value: v })}
                onRoutineChange={(patch) => dispatch({ type: 'PATCH_TEE_ROUTINE', patch })}
              />
            </CollapsibleSection>

            {/* Casual Ground Shots */}
            <CollapsibleSection icon="⛳" iconColor="yellow" title="Ground Shots" status={stgShotStatus(state.stgShots)}>
              <CasualGroundSection
                shots={state.stgShots}
                userClubs={userClubs}
                onShotsChange={(shots) => dispatch({ type: 'SET_STG_SHOTS', shots })}
              />
            </CollapsibleSection>

            {/* Casual Putting */}
            <CollapsibleSection icon="🕳️" iconColor="accent" title="Putting" status={puttStatus(state.puttCards)}>
              <CasualPuttingSection
                putts={state.puttCards}
                onPuttsChange={(putts) => dispatch({ type: 'SET_PUTT_CARDS', putts })}
              />
            </CollapsibleSection>

            {/* Notes */}
            <CollapsibleSection icon="📝" iconColor="purple" title="Notes">
              <NotesSection
                value={state.notes}
                onChange={(v) => dispatch({ type: 'SET_NOTES', value: v })}
              />
            </CollapsibleSection>
          </>
        ) : (
          <>
            {/* Score */}
            <CollapsibleSection icon="🏌️" iconColor="accent" title="Score" defaultOpen>
              <ScoreInput
                par={state.par}
                score={state.score}
                shotsToGreen={shotsToGreen}
                gir={gir}
                putts={putts}
                onChange={(v) => dispatch({ type: 'SET_SCORE', score: v })}
                onShotsToGreenChange={(v) => dispatch({ type: 'SET_SHOTS_TO_GREEN', count: v })}
                onPuttsChange={(v) => dispatch({ type: 'SET_PUTTS_COUNT', count: v })}
                variant="serious"
              />
            </CollapsibleSection>

            {/* Tee Shot */}
            <CollapsibleSection icon="🎯" iconColor="blue" title="Tee Shot" status={teeShotStatus(state)}>
              <TeeShot
                teeClub={state.teeClub}
                teeCarry={state.teeCarry}
                routine={state.teeRoutine}
                par={state.par}
                userClubs={userClubs}
                onClubChange={(v) => dispatch({ type: 'SET_TEE_CLUB', value: v })}
                onCarryChange={(v) => dispatch({ type: 'SET_TEE_CARRY', value: v })}
                onRoutineChange={(patch) => dispatch({ type: 'PATCH_TEE_ROUTINE', patch })}
              />
            </CollapsibleSection>

            {/* Ground Shots */}
            <CollapsibleSection icon="⛳" iconColor="yellow" title="Ground Shots" status={stgShotStatus(state.stgShots)}>
              <GroundShotSection
                shots={state.stgShots}
                userClubs={userClubs}
                onShotsChange={(shots) => dispatch({ type: 'SET_STG_SHOTS', shots })}
              />
            </CollapsibleSection>

            {/* Putting */}
            <CollapsibleSection icon="🕳️" iconColor="accent" title="Putting" status={puttStatus(state.puttCards)}>
              <PuttingSection
                putts={state.puttCards}
                onPuttsChange={(putts) => dispatch({ type: 'SET_PUTT_CARDS', putts })}
              />
            </CollapsibleSection>

            {/* Notes */}
            <CollapsibleSection icon="📝" iconColor="purple" title="Notes">
              <NotesSection
                value={state.notes}
                onChange={(v) => dispatch({ type: 'SET_NOTES', value: v })}
              />
            </CollapsibleSection>
          </>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : `Save Hole ${activeHole}`}
        </button>

        {/* Toast — positioned above bottom nav */}
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-surface2 border border-border px-4 py-2.5 text-sm font-medium text-text shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </ModeProvider>
  );
}
