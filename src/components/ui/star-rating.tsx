'use client';

interface StarRatingProps {
  value: number | null;
  onChange: (v: number) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const current = value ?? 0;
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= current;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-full border text-sm font-bold transition ${
              filled
                ? 'border-accent bg-accent-dim text-accent'
                : 'border-border bg-surface3 text-text3 hover:border-border2'
            }`}
          >
            ●
          </button>
        );
      })}
    </div>
  );
}
