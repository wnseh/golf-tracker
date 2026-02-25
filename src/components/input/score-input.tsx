'use client';

interface ScoreInputProps {
  par: number;
  score: number;
  gir: boolean;
  putts: number;
  onChange: (score: number) => void;
}

function vsParLabel(diff: number): string {
  if (diff <= -2) return 'EAGLE';
  if (diff === -1) return 'BIRDIE';
  if (diff === 0) return 'PAR';
  if (diff === 1) return 'BOGEY';
  if (diff === 2) return 'DOUBLE';
  return `+${diff}`;
}

function vsParColor(diff: number): string {
  if (diff <= -2) return 'text-yellow';
  if (diff === -1) return 'text-accent';
  if (diff === 0) return 'text-text3';
  return 'text-red';
}

export function ScoreInput({ par, score, gir, putts, onChange }: ScoreInputProps) {
  const diff = score - par;

  return (
    <div className="py-2">
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, score - 1))}
          className="w-10 h-10 rounded-full border border-border bg-surface3 text-text2 text-lg font-bold transition hover:border-border2"
        >
          −
        </button>
        <div className="text-center">
          <span className="font-mono text-5xl font-medium">{score}</span>
          <p className={`text-xs font-semibold mt-1 ${vsParColor(diff)}`}>
            {vsParLabel(diff)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(12, score + 1))}
          className="w-10 h-10 rounded-full border border-border bg-surface3 text-text2 text-lg font-bold transition hover:border-border2"
        >
          +
        </button>
      </div>

      {/* GIR + Putts badges */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <span
          className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${
            gir
              ? 'bg-accent-dim text-accent'
              : 'bg-surface3 text-text3'
          }`}
        >
          {gir ? 'GIR' : 'No GIR'}
        </span>
        <span className="rounded-md bg-surface3 px-2.5 py-1 text-[10px] font-semibold text-text2">
          {putts} putt{putts !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
