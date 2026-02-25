'use client';

import { useEffect } from 'react';
import { useDragScroll } from '@/hooks/use-drag-scroll';

interface SavedHoleInfo {
  score: number;
  par: number;
}

interface HoleNavProps {
  totalHoles: number;
  activeHole: number;
  savedHoles: Map<number, SavedHoleInfo>;
  onSelect: (hole: number) => void;
}

export function HoleNav({ totalHoles, activeHole, savedHoles, onSelect }: HoleNavProps) {
  const scrollRef = useDragScroll<HTMLDivElement>();

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-hole="${activeHole}"]`);
    el?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, [activeHole, scrollRef]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none"
    >
      {Array.from({ length: totalHoles }, (_, i) => i + 1).map((n) => {
        const isActive = n === activeHole;
        const saved = savedHoles.get(n);
        const diff = saved ? saved.score - saved.par : null;

        let dotColor = '';
        if (saved) {
          if (diff! < 0) dotColor = 'bg-accent';
          else if (diff === 0) dotColor = 'bg-text3';
          else dotColor = 'bg-red';
        }

        return (
          <button
            key={n}
            data-hole={n}
            type="button"
            onClick={() => onSelect(n)}
            className={`relative shrink-0 w-9 h-9 rounded-full border text-xs font-medium transition ${
              isActive
                ? 'border-accent bg-accent-dim text-accent'
                : saved
                  ? 'border-border2 bg-surface2 text-text2'
                  : 'border-border text-text2 hover:border-border2'
            }`}
          >
            {n}
            {saved && (
              <span className={`absolute bottom-0.5 right-0.5 w-[7px] h-[7px] rounded-full ${dotColor}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
