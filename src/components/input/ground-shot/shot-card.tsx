'use client';

import type { StgShot, StgIntent, WindStr, WindDir, TrajVal, StartLineVal, CurveVal, FeelVal, UserClub } from '@/lib/types';
import {
  GS_META, GS_CLUBS, GS_RESULTS, GS_ARG_TYPES,
  WIND_STRENGTHS, TRAJECTORIES, FEEL_OPTIONS, LEARN_TYPES,
  LIE_QUALITY, LIE_BALL, LIE_SLOPE, LIE_STANCE,
} from '@/lib/constants';
import { RoutineBlock } from '@/components/ui/routine-block';
import { MiniToggle } from '@/components/ui/mini-toggle';
import { MultiToggle } from '@/components/ui/multi-toggle';
import { WindGrid } from '@/components/ui/wind-grid';
import { ShapeGrid } from '@/components/ui/shape-grid';
import { StarRating } from '@/components/ui/star-rating';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface ShotCardProps {
  index: number;
  shot: StgShot;
  userClubs: UserClub[];
  onChange: (patch: Partial<StgShot>) => void;
  onRemove: () => void;
}

const intentOrder: StgIntent[] = ['approach', 'arg', 'layup', 'recovery'];

const intentBorderColor: Record<StgIntent, string> = {
  approach: 'border-yellow',
  arg:      'border-red',
  layup:    'border-blue',
  recovery: 'border-purple',
};

const intentActiveClass: Record<StgIntent, string> = {
  approach: 'border-yellow bg-yellow-dim text-yellow',
  arg:      'border-red bg-red-dim text-red',
  layup:    'border-blue bg-blue-dim text-blue',
  recovery: 'border-purple bg-purple-dim text-purple',
};

export function ShotCard({ index, shot, userClubs, onChange, onRemove }: ShotCardProps) {
  const meta = GS_META[shot.intent];
  const showActual = shot.intent === 'approach' || shot.intent === 'arg';

  // Build club list from userClubs or fallback
  let clubList: string[];
  if (userClubs.length > 0) {
    const fallback = GS_CLUBS[shot.intent];
    // Filter user clubs to those relevant for this intent, fallback to all
    const intentSet = new Set(fallback);
    const filtered = userClubs.filter((c) => intentSet.has(c.clubName)).map((c) => c.clubName);
    clubList = filtered.length > 0 ? filtered : userClubs.map((c) => c.clubName);
    // For ARG, always include PT
    if (shot.intent === 'arg' && !clubList.includes('PT')) {
      clubList.push('PT');
    }
  } else {
    clubList = GS_CLUBS[shot.intent];
  }

  function setIntent(intent: StgIntent) {
    onChange({
      intent,
      club: '',
      argType: null,
      result: null,
      resTraj: null,
      resStartLine: null,
      resCurve: null,
    });
  }

  function handleDistChange(val: string) {
    const num = parseFloat(val);
    const patch: Partial<StgShot> = { dist: val };
    if (shot.intent === 'approach' || shot.intent === 'arg') {
      if (!isNaN(num)) {
        const newIntent = num >= 50 ? 'approach' : 'arg';
        if (newIntent !== shot.intent) {
          patch.intent = newIntent;
          patch.club = '';
          patch.argType = null;
          patch.result = null;
          patch.resTraj = null;
          patch.resStartLine = null;
          patch.resCurve = null;
        }
      }
    }
    onChange(patch);
  }

  return (
    <div className={`rounded-xl border-l-2 ${intentBorderColor[shot.intent]} border border-border bg-surface2 p-3 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-text2">SHOT {index + 1}</span>
          <InfoTooltip>
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-text3 font-medium">Shot Types</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-yellow" />
                  <p><span className="font-semibold text-yellow">Approach</span> <span className="text-text2">그린 공략 ≥50m</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-red" />
                  <p><span className="font-semibold text-red">ARG</span> <span className="text-text2">그린 공략 &lt;50m</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-blue" />
                  <p><span className="font-semibold text-blue">Layup</span> <span className="text-text2">전략적 레이업</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-purple" />
                  <p><span className="font-semibold text-purple">Recovery</span> <span className="text-text2">탈출</span></p>
                </div>
              </div>
            </div>
          </InfoTooltip>
        </div>
        <button type="button" onClick={onRemove} className="text-text3 hover:text-red text-sm">✕</button>
      </div>

      {/* Intent buttons */}
      <div className="flex gap-1.5">
        {intentOrder.map((intent) => {
          const m = GS_META[intent];
          const active = shot.intent === intent;
          return (
            <button
              key={intent}
              type="button"
              onClick={() => setIntent(intent)}
              className={`flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition ${
                active
                  ? intentActiveClass[intent]
                  : 'border-border bg-surface3 text-text3 hover:border-border2'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* PRE-SHOT */}
      <RoutineBlock type="pre" title="Plan & Setup" defaultOpen>
        {/* WIND */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Wind</p>
        <div className="space-y-2 mb-4">
          <div>
            <label className="text-xs text-text2 mb-1 block">Strength</label>
            <MiniToggle
              options={WIND_STRENGTHS}
              value={shot.windStr}
              onChange={(v) => onChange({ windStr: v })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Direction</label>
            <WindGrid value={shot.windDir} onChange={(v) => onChange({ windDir: v })} />
          </div>
        </div>

        {/* LIE */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Lie</p>
        <div className="space-y-2 mb-4">
          <div>
            <label className="text-xs text-text2 mb-1 block">Quality</label>
            <MiniToggle options={LIE_QUALITY} value={shot.lieQuality} onChange={(v) => onChange({ lieQuality: v })} />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Ball</label>
            <MiniToggle options={LIE_BALL} value={shot.lieBall} onChange={(v) => onChange({ lieBall: v })} />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Slope</label>
            <MultiToggle
              options={LIE_SLOPE}
              value={shot.lieSlope}
              onChange={(v) => onChange({ lieSlope: v })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Stance</label>
            <MiniToggle options={LIE_STANCE} value={shot.lieStance} onChange={(v) => onChange({ lieStance: v })} />
          </div>
        </div>

        {/* CLUB & DISTANCE */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Club & Distance</p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-text2 mb-1 block">Club</label>
            <select
              value={shot.club}
              onChange={(e) => {
                const club = e.target.value;
                const patch: Partial<StgShot> = { club };
                if (club && !shot.dist) {
                  if (shot.intent === 'arg' || shot.intent === 'recovery') {
                    patch.dist = '50';
                  } else {
                    const uc = userClubs.find((c) => c.clubName === club);
                    if (uc?.totalM) patch.dist = String(uc.totalM);
                  }
                }
                onChange(patch);
              }}
              className="w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="">—</option>
              {clubList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-text2 mb-1 block">{meta.distLabel}</label>
            <input
              type="number"
              value={shot.dist}
              onChange={(e) => handleDistChange(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* ARG TYPE (arg only) */}
        {shot.intent === 'arg' && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Shot Type</p>
            <MiniToggle
              options={GS_ARG_TYPES}
              value={shot.argType as typeof GS_ARG_TYPES[number] | null}
              onChange={(v) => onChange({ argType: v })}
              color="red"
            />
            <div className="mb-4" />
          </>
        )}

        {/* TARGET */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Target Shot</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-text2 mb-1 block">Trajectory</label>
            <MiniToggle options={TRAJECTORIES} value={shot.targetTraj} onChange={(v) => onChange({ targetTraj: v })} />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Shape</label>
            <ShapeGrid
              startLine={shot.targetStartLine}
              curve={shot.targetCurve}
              onStartLineChange={(v) => onChange({ targetStartLine: v })}
              onCurveChange={(v) => onChange({ targetCurve: v })}
            />
          </div>
        </div>
      </RoutineBlock>

      {/* POST-SHOT */}
      <RoutineBlock type="post" title="Result & Learn">
        {/* RESULT */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Result</p>
        <MiniToggle
          options={GS_RESULTS[shot.intent]}
          value={shot.result}
          onChange={(v) => onChange({ result: v })}
        />

        {/* ACTUAL TRAJECTORY/SHAPE (approach/arg only) */}
        {showActual && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Actual Shot</p>
            <div className="space-y-2 mb-4">
              <div>
                <label className="text-xs text-text2 mb-1 block">Trajectory</label>
                <MiniToggle options={TRAJECTORIES} value={shot.resTraj} onChange={(v) => onChange({ resTraj: v })} />
              </div>
              <div>
                <label className="text-xs text-text2 mb-1 block">Shape</label>
                <ShapeGrid
                  startLine={shot.resStartLine}
                  curve={shot.resCurve}
                  onStartLineChange={(v) => onChange({ resStartLine: v })}
                  onCurveChange={(v) => onChange({ resCurve: v })}
                />
              </div>
            </div>
          </>
        )}

        {/* FEEL */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Feel (Impact)</p>
        <MiniToggle options={FEEL_OPTIONS} value={shot.feel} onChange={(v) => onChange({ feel: v })} />

        {/* COMMIT */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Commit Level</p>
        <StarRating
          value={shot.commit ? parseInt(shot.commit) : null}
          onChange={(v) => onChange({ commit: String(v) })}
        />

        {/* LEARN */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Learn / Note</p>
        <MiniToggle
          options={LEARN_TYPES}
          value={shot.learnType as typeof LEARN_TYPES[number] | null}
          onChange={(v) => onChange({ learnType: v })}
        />
        <textarea
          value={shot.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value || null })}
          rows={2}
          placeholder="What did you learn?"
          className="mt-2 w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none resize-none"
        />
      </RoutineBlock>
    </div>
  );
}
