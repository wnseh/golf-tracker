'use client';

import type { StgShot, UserClub } from '@/lib/types';
import { emptyStgShot } from '@/lib/constants';
import { ShotCard } from './shot-card';

interface GroundShotSectionProps {
  shots: StgShot[];
  userClubs: UserClub[];
  onShotsChange: (shots: StgShot[]) => void;
}

export function GroundShotSection({ shots, userClubs, onShotsChange }: GroundShotSectionProps) {
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
        <ShotCard
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
