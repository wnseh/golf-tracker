'use client';

import type { StgShot, StgIntent, UserClub, LeaveDistBucket } from '@/lib/types';
import {
  emptyStgShot, GS_META, CASUAL_DIST_BUCKETS, CASUAL_DIST_MID_VALUES,
  CASUAL_GS_RESULTS, CASUAL_LIE_SIMPLE, LEAVE_DIST_BUCKETS,
  approachResultToLeaveBucket, argResultToLeaveBucket, recoveryResultToLeaveBucket,
} from '@/lib/constants';
import { MiniToggle } from '@/components/ui/mini-toggle';

interface CasualGroundSectionProps {
  shots: StgShot[];
  userClubs: UserClub[];
  onShotsChange: (shots: StgShot[]) => void;
}

const INTENT_OPTIONS: StgIntent[] = ['approach', 'arg', 'layup', 'recovery'];

/** Find which bucket a numeric distance falls into */
function distToBucket(dist: string, intent: string): string | null {
  const n = parseFloat(dist);
  if (isNaN(n)) return null;
  const buckets = CASUAL_DIST_BUCKETS[intent] ?? [];
  // Find the matching bucket by checking mid values
  let closestBucket = '';
  let closestDiff = Infinity;
  for (const b of buckets) {
    const mid = CASUAL_DIST_MID_VALUES[b] ?? 0;
    const diff = Math.abs(n - mid);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestBucket = b;
    }
  }
  return closestBucket || null;
}

/** Auto-suggest leaveDistBucket from result + intent */
function suggestLeaveBucket(intent: StgIntent, result: string | null): LeaveDistBucket | null {
  if (intent === 'approach') return approachResultToLeaveBucket(result);
  if (intent === 'arg') return argResultToLeaveBucket(result);
  if (intent === 'recovery') return recoveryResultToLeaveBucket(result);
  return null;
}

function CasualShotCard({
  index, shot, userClubs, onChange, onRemove,
}: {
  index: number;
  shot: StgShot;
  userClubs: UserClub[];
  onChange: (patch: Partial<StgShot>) => void;
  onRemove: () => void;
}) {
  const meta = GS_META[shot.intent];
  const distBuckets = CASUAL_DIST_BUCKETS[shot.intent] ?? [];
  const results = CASUAL_GS_RESULTS[shot.intent] ?? [];
  const currentBucket = distToBucket(shot.dist, shot.intent);

  // Show leaveDistBucket for approach/arg/recovery (not layup)
  const showLeaveBucket = shot.intent !== 'layup';

  // Simple club list from user clubs
  const clubNames = userClubs.length > 0
    ? userClubs.map((c) => c.clubName)
    : ['LW', 'SW', 'GW', 'AW', 'PW', '9I', '8I', '7I', '6I', '5I'];

  function handleResultChange(v: string) {
    const suggested = suggestLeaveBucket(shot.intent, v);
    // Only auto-set if current leaveDistBucket is null/undefined or was already auto-suggested
    const patch: Partial<StgShot> = { result: v };
    if (suggested !== null) patch.leaveDistBucket = suggested;
    onChange(patch);
  }

  return (
    <div className="rounded-xl border border-border bg-surface2 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold text-${meta.color}`}>{meta.label} {index + 1}</span>
        </div>
        <button type="button" onClick={onRemove} className="text-text3 hover:text-red text-sm">✕</button>
      </div>

      {/* Intent */}
      <MiniToggle
        options={INTENT_OPTIONS}
        labels={{ approach: 'APP', arg: 'ARG', layup: 'LAY', recovery: 'REC' }}
        value={shot.intent}
        onChange={(v) => onChange({ intent: v, leaveDistBucket: null })}
      />

      {/* Distance bucket */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Distance</p>
        <MiniToggle
          options={distBuckets as unknown as string[]}
          value={currentBucket}
          onChange={(v) => {
            const mid = CASUAL_DIST_MID_VALUES[v];
            onChange({ dist: mid ? String(mid) : '' });
          }}
        />
      </div>

      {/* Club (optional) */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Club</p>
        <div className="flex flex-wrap gap-1.5">
          {clubNames.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ club: c })}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                shot.club === c
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border bg-surface3 text-text2 hover:border-border2'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Lie */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Lie</p>
        <MiniToggle
          options={CASUAL_LIE_SIMPLE}
          value={shot.lieQuality}
          onChange={(v) => onChange({ lieQuality: v })}
        />
      </div>

      {/* Result */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Result</p>
        <MiniToggle
          options={results as unknown as string[]}
          value={shot.result}
          onChange={handleResultChange}
        />
      </div>

      {/* Leave Dist Bucket (approach/arg/recovery only) */}
      {showLeaveBucket && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Leave (to pin)</p>
          <MiniToggle
            options={LEAVE_DIST_BUCKETS}
            value={shot.leaveDistBucket ?? null}
            onChange={(v) => onChange({ leaveDistBucket: v })}
          />
        </div>
      )}
    </div>
  );
}

export function CasualGroundSection({ shots, userClubs, onShotsChange }: CasualGroundSectionProps) {
  function addShot() {
    onShotsChange([...shots, emptyStgShot()]);
  }

  function updateShot(i: number, patch: Partial<StgShot>) {
    const next = shots.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onShotsChange(next);
  }

  function removeShot(i: number) {
    onShotsChange(shots.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {shots.map((shot, i) => (
        <CasualShotCard
          key={i}
          index={i}
          shot={shot}
          userClubs={userClubs}
          onChange={(patch) => updateShot(i, patch)}
          onRemove={() => removeShot(i)}
        />
      ))}
      <button
        type="button"
        onClick={addShot}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-text2 hover:border-accent hover:text-accent transition"
      >
        + Add Shot
      </button>
    </div>
  );
}
