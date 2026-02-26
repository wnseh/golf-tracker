'use client';

import type { PuttCard } from '@/lib/types';
import { emptyPuttCard, CASUAL_PUTT_DIST_BUCKETS, CASUAL_PUTT_DIST_MID_VALUES, CASUAL_PUTT_MISS_SIDES, PUTT_POST_SPEEDS } from '@/lib/constants';
import { CASUAL_PUTT_MISS_MAP } from '@/lib/casual-mapping';
import { MiniToggle } from '@/components/ui/mini-toggle';

interface CasualPuttingSectionProps {
  putts: PuttCard[];
  onPuttsChange: (putts: PuttCard[]) => void;
}

/** Find which bucket a numeric distance falls into */
function distToBucket(dist: string | null): string | null {
  const n = parseFloat(dist ?? '');
  if (isNaN(n)) return null;
  let closestBucket = '';
  let closestDiff = Infinity;
  for (const b of CASUAL_PUTT_DIST_BUCKETS) {
    const mid = CASUAL_PUTT_DIST_MID_VALUES[b] ?? 0;
    const diff = Math.abs(n - mid);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestBucket = b;
    }
  }
  return closestBucket || null;
}

/** Reverse map startLine to casual miss side */
const STARTLINE_TO_CASUAL: Record<string, string> = {
  left: 'L', good: 'C', right: 'R',
};

function CasualPuttCard({
  index, putt, onChange, onRemove,
}: {
  index: number;
  putt: PuttCard;
  onChange: (patch: Partial<PuttCard>) => void;
  onRemove: () => void;
}) {
  const currentBucket = distToBucket(putt.dist);
  const casualMiss = putt.startLine ? (STARTLINE_TO_CASUAL[putt.startLine] ?? null) : null;

  return (
    <div className="rounded-xl border border-border bg-surface2 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text2">PUTT {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-text3 hover:text-red text-sm">✕</button>
      </div>

      {/* Distance bucket */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Distance</p>
        <MiniToggle
          options={CASUAL_PUTT_DIST_BUCKETS}
          value={currentBucket}
          onChange={(v) => {
            const mid = CASUAL_PUTT_DIST_MID_VALUES[v];
            onChange({ dist: mid ? String(mid) : null });
          }}
        />
      </div>

      {/* Speed */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Speed</p>
        <MiniToggle
          options={PUTT_POST_SPEEDS}
          value={putt.postSpeed}
          onChange={(v) => onChange({ postSpeed: v })}
        />
      </div>

      {/* Miss Side (optional) */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Miss Side</p>
        <MiniToggle
          options={CASUAL_PUTT_MISS_SIDES}
          value={casualMiss}
          onChange={(v) => {
            const startLine = CASUAL_PUTT_MISS_MAP[v] ?? 'good';
            onChange({ startLine });
          }}
        />
      </div>
    </div>
  );
}

export function CasualPuttingSection({ putts, onPuttsChange }: CasualPuttingSectionProps) {
  function addPutt() {
    onPuttsChange([...putts, emptyPuttCard()]);
  }

  function updatePutt(i: number, patch: Partial<PuttCard>) {
    const next = putts.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    onPuttsChange(next);
  }

  function removePutt(i: number) {
    onPuttsChange(putts.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {putts.map((putt, i) => (
        <CasualPuttCard
          key={i}
          index={i}
          putt={putt}
          onChange={(patch) => updatePutt(i, patch)}
          onRemove={() => removePutt(i)}
        />
      ))}
      <button
        type="button"
        onClick={addPutt}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-text2 hover:border-accent hover:text-accent transition"
      >
        + Add Putt
      </button>
    </div>
  );
}
