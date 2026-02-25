'use client';

import type { PuttCard as PuttCardType } from '@/lib/types';
import { emptyPuttCard } from '@/lib/constants';
import { PuttCard } from './putt-card';

interface PuttingSectionProps {
  putts: PuttCardType[];
  onPuttsChange: (putts: PuttCardType[]) => void;
}

export function PuttingSection({ putts, onPuttsChange }: PuttingSectionProps) {
  function addPutt() {
    onPuttsChange([...putts, emptyPuttCard()]);
  }

  function updatePutt(i: number, patch: Partial<PuttCardType>) {
    const next = putts.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    onPuttsChange(next);
  }

  function removePutt(i: number) {
    onPuttsChange(putts.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {putts.map((putt, i) => (
        <PuttCard
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
