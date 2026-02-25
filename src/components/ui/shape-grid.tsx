'use client';

import type { StartLineVal, CurveVal } from '@/lib/types';
import { START_LINES, CURVES } from '@/lib/constants';

interface ShapeGridProps {
  startLine: StartLineVal | null;
  curve: CurveVal | null;
  onStartLineChange: (v: StartLineVal) => void;
  onCurveChange: (v: CurveVal) => void;
}

const startLineLabels: Record<StartLineVal, string> = {
  pull: 'Pull',
  straight: 'Str',
  push: 'Push',
};

const curveLabels: Record<CurveVal, string> = {
  'duck-hook': 'D-Hook',
  hook: 'Hook',
  draw: 'Draw',
  straight: 'Str',
  fade: 'Fade',
  slice: 'Slice',
  shank: 'Shank',
};

export function ShapeGrid({ startLine, curve, onStartLineChange, onCurveChange }: ShapeGridProps) {
  return (
    <div className="space-y-2">
      {/* Row 1: Start Line */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-text3 font-medium">Start Line</span>
        <div className="flex gap-1.5 mt-1">
          {START_LINES.map((sl) => {
            const active = startLine === sl;
            return (
              <button
                key={sl}
                type="button"
                onClick={() => onStartLineChange(sl)}
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition ${
                  active
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border bg-surface3 text-text2 hover:border-border2'
                }`}
              >
                {startLineLabels[sl]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Curve */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-text3 font-medium">Curve</span>
        <div className="flex gap-1 mt-1 overflow-x-auto pb-1 scrollbar-none">
          {CURVES.map((c) => {
            const active = curve === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCurveChange(c)}
                className={`shrink-0 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${
                  active
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border bg-surface3 text-text2 hover:border-border2'
                }`}
              >
                {curveLabels[c]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
