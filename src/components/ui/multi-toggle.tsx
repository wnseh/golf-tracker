'use client';

interface MultiToggleProps<T extends string> {
  options: readonly T[];
  value: T[] | null;
  onChange: (v: T[]) => void;
  labels?: Record<string, string>;
  color?: 'accent' | 'red' | 'blue' | 'yellow' | 'purple';
}

const colorMap = {
  accent: 'border-accent bg-accent-dim text-accent',
  red:    'border-red bg-red-dim text-red',
  blue:   'border-blue bg-blue-dim text-blue',
  yellow: 'border-yellow bg-yellow-dim text-yellow',
  purple: 'border-purple bg-purple-dim text-purple',
};

export function MultiToggle<T extends string>({
  options, value, onChange, labels, color = 'accent',
}: MultiToggleProps<T>) {
  const selected = value ?? [];

  function toggle(opt: T) {
    if (selected.includes(opt)) {
      const next = selected.filter((v) => v !== opt);
      onChange(next.length > 0 ? next : []);
    } else {
      onChange([...selected, opt]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? colorMap[color]
                : 'border-border bg-surface3 text-text2 hover:border-border2'
            }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}
