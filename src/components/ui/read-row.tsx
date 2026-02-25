'use client';

import type { ReadVal } from '@/lib/types';
import { READ_OPTIONS } from '@/lib/constants';

interface ReadRowProps {
  value: ReadVal | null;
  onChange: (v: ReadVal) => void;
}

function readColor(v: ReadVal, active: boolean): string {
  if (!active) return 'border-border bg-surface3 text-text2 hover:border-border2';
  switch (v) {
    case 'R0':  return 'border-accent bg-accent-dim text-accent';
    case 'R-':
    case 'R+':  return 'border-yellow bg-yellow-dim text-yellow';
    case 'R--':
    case 'R++': return 'border-red bg-red-dim text-red';
  }
}

export function ReadRow({ value, onChange }: ReadRowProps) {
  return (
    <div className="flex gap-1.5">
      {READ_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition ${readColor(opt, value === opt)}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
