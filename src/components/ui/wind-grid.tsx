'use client';

import type { WindDir } from '@/lib/types';
import { WIND_DIRECTIONS, WIND_DIR_LABELS } from '@/lib/constants';

interface WindGridProps {
  value: WindDir | null;
  onChange: (v: WindDir) => void;
}

export function WindGrid({ value, onChange }: WindGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 w-fit">
      {WIND_DIRECTIONS.map((dir) => {
        const active = value === dir;
        return (
          <button
            key={dir}
            type="button"
            onClick={() => onChange(dir)}
            className={`w-10 h-10 rounded-lg border text-sm font-medium transition ${
              active
                ? 'border-accent bg-accent-dim text-accent'
                : 'border-border bg-surface3 text-text2 hover:border-border2'
            }`}
          >
            {WIND_DIR_LABELS[dir]}
          </button>
        );
      })}
    </div>
  );
}
