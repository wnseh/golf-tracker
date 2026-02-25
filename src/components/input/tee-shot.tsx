'use client';

import type { TeeRoutine, WindStr, WindDir, TrajVal, StartLineVal, CurveVal, FeelVal, UserClub } from '@/lib/types';
import { TEE_CLUBS, WIND_STRENGTHS, TRAJECTORIES, FEEL_OPTIONS, LANDING_OPTIONS, LEARN_TYPES } from '@/lib/constants';
import { RoutineBlock } from '@/components/ui/routine-block';
import { MiniToggle } from '@/components/ui/mini-toggle';
import { WindGrid } from '@/components/ui/wind-grid';
import { ShapeGrid } from '@/components/ui/shape-grid';
import { StarRating } from '@/components/ui/star-rating';

interface TeeShotProps {
  teeClub: string;
  teeCarry: string;
  routine: TeeRoutine;
  par: number;
  userClubs: UserClub[];
  onClubChange: (v: string) => void;
  onCarryChange: (v: string) => void;
  onRoutineChange: (patch: Partial<TeeRoutine>) => void;
}

export function TeeShot({
  teeClub, teeCarry, routine, par, userClubs,
  onClubChange, onCarryChange, onRoutineChange,
}: TeeShotProps) {
  // Build club list
  let clubList: string[];
  if (userClubs.length > 0) {
    if (par === 3) {
      // Par 3: all clubs except PT
      clubList = userClubs.filter((c) => c.clubName !== 'PT').map((c) => c.clubName);
    } else {
      // Par 4/5: tee-shot clubs only (long clubs)
      const teeSet = new Set<string>(TEE_CLUBS);
      clubList = userClubs.filter((c) => teeSet.has(c.clubName)).map((c) => c.clubName);
      // Ensure at least the user's clubs that are in TEE_CLUBS
      if (clubList.length === 0) {
        clubList = userClubs.map((c) => c.clubName);
      }
    }
  } else {
    if (par === 3) {
      clubList = [...TEE_CLUBS, '6I', '7I', '8I', '9I', 'PW'];
    } else {
      clubList = [...TEE_CLUBS];
    }
  }

  return (
    <div className="space-y-3">
      {/* PRE-SHOT */}
      <RoutineBlock type="pre" title="Decide & Visualize" defaultOpen>
        {/* WIND */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Wind</p>
        <div className="space-y-2 mb-4">
          <div>
            <label className="text-xs text-text2 mb-1 block">Strength</label>
            <MiniToggle
              options={WIND_STRENGTHS}
              value={routine.windStr}
              onChange={(v) => onRoutineChange({ windStr: v })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Direction</label>
            <WindGrid
              value={routine.windDir}
              onChange={(v) => onRoutineChange({ windDir: v })}
            />
          </div>
        </div>

        {/* CLUB & DISTANCE */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Club & Distance</p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-text2 mb-1 block">Club</label>
            <select
              value={teeClub}
              onChange={(e) => onClubChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="">—</option>
              {clubList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-text2 mb-1 block">Target (m)</label>
            <input
              type="number"
              value={teeCarry}
              onChange={(e) => onCarryChange(e.target.value)}
              placeholder="260"
              className="w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* TARGET SHOT */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Target Shot</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-text2 mb-1 block">Trajectory</label>
            <MiniToggle
              options={TRAJECTORIES}
              value={routine.targetTraj}
              onChange={(v) => onRoutineChange({ targetTraj: v })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Shape</label>
            <ShapeGrid
              startLine={routine.targetStartLine}
              curve={routine.targetCurve}
              onStartLineChange={(v) => onRoutineChange({ targetStartLine: v })}
              onCurveChange={(v) => onRoutineChange({ targetCurve: v })}
            />
          </div>
        </div>
      </RoutineBlock>

      {/* POST-SHOT */}
      <RoutineBlock type="post" title="Result & Learn">
        {/* LANDING */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Landing</p>
        <MiniToggle
          options={LANDING_OPTIONS}
          value={routine.landing}
          onChange={(v) => onRoutineChange({ landing: v })}
        />
        <div className="mt-2">
          <label className="text-xs text-text2 mb-1 block">Actual Carry (m)</label>
          <input
            type="number"
            value={routine.actualCarry ?? ''}
            onChange={(e) => onRoutineChange({ actualCarry: e.target.value || null })}
            placeholder="255"
            className="w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none"
          />
        </div>

        {/* ACTUAL SHOT */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Actual Shot</p>
        <div className="space-y-2 mb-4">
          <div>
            <label className="text-xs text-text2 mb-1 block">Trajectory</label>
            <MiniToggle
              options={TRAJECTORIES}
              value={routine.resultTraj}
              onChange={(v) => onRoutineChange({ resultTraj: v })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Shape</label>
            <ShapeGrid
              startLine={routine.resultStartLine}
              curve={routine.resultCurve}
              onStartLineChange={(v) => onRoutineChange({ resultStartLine: v })}
              onCurveChange={(v) => onRoutineChange({ resultCurve: v })}
            />
          </div>
        </div>

        {/* FEEL */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Feel (Impact)</p>
        <MiniToggle
          options={FEEL_OPTIONS}
          value={routine.feel}
          onChange={(v) => onRoutineChange({ feel: v })}
        />

        {/* COMMIT */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Commit Level</p>
        <StarRating
          value={routine.commit ? parseInt(routine.commit) : null}
          onChange={(v) => onRoutineChange({ commit: String(v) })}
        />

        {/* LEARN */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Learn / Note</p>
        <MiniToggle
          options={LEARN_TYPES}
          value={routine.learnType}
          onChange={(v) => onRoutineChange({ learnType: v })}
        />
        <textarea
          value={routine.learnNote ?? ''}
          onChange={(e) => onRoutineChange({ learnNote: e.target.value || null })}
          rows={2}
          placeholder="What did you learn?"
          className="mt-2 w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none resize-none"
        />
      </RoutineBlock>
    </div>
  );
}
