'use client';

import { ScoreInput } from './score-input';
import { NotesSection } from './notes-section';

interface FunModeProps {
  par: number;
  score: number;
  notes: string;
  onScoreChange: (score: number) => void;
  onNotesChange: (notes: string) => void;
}

export function FunMode({ par, score, notes, onScoreChange, onNotesChange }: FunModeProps) {
  return (
    <div className="space-y-4">
      {/* Score — large, simple */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <ScoreInput
          par={par}
          score={score}
          onChange={onScoreChange}
          variant="fun"
        />
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold text-text2 mb-2">Notes</p>
        <NotesSection value={notes} onChange={onNotesChange} />
      </div>
    </div>
  );
}
