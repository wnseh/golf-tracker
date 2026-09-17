'use client';

interface ScoreInputProps {
  par: number;
  score: number;
  onChange: (score: number) => void;
}

export function vsParLabel(diff: number): string {
  if (diff <= -3) return 'ALBATROSS';
  if (diff === -2) return 'EAGLE';
  if (diff === -1) return 'BIRDIE';
  if (diff === 0) return 'PAR';
  if (diff === 1) return 'BOGEY';
  if (diff === 2) return 'DOUBLE';
  return `+${diff}`;
}

export function vsParColor(diff: number): string {
  if (diff <= -2) return 'text-yellow';
  if (diff === -1) return 'text-accent';
  if (diff === 0) return 'text-text3';
  return 'text-red';
}

export function ScoreInput({ par, score, onChange }: ScoreInputProps) {
  const diff = score - par;
  return (
    <div className="flex items-center justify-center gap-6 py-2">
      <button
        type="button"
        data-testid="score-minus"
        onClick={() => onChange(Math.max(1, score - 1))}
        className="w-10 h-10 rounded-full border border-border bg-surface3 text-text2 text-lg font-bold transition hover:border-border2"
      >
        −
      </button>
      <div className="text-center">
        <span data-testid="score-stepper-value" className="font-mono text-5xl font-medium">{score}</span>
        <p className={`text-xs font-semibold mt-1 ${vsParColor(diff)}`}>{vsParLabel(diff)}</p>
      </div>
      <button
        type="button"
        data-testid="score-plus"
        onClick={() => onChange(Math.min(15, score + 1))}
        className="w-10 h-10 rounded-full border border-border bg-surface3 text-text2 text-lg font-bold transition hover:border-border2"
      >
        +
      </button>
    </div>
  );
}
