'use client';

import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  children: React.ReactNode;
}

export function InfoTooltip({ children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ml-1 w-4 h-4 rounded-full border border-border2 text-[9px] text-text3 hover:text-text2 inline-flex items-center justify-center transition"
      >
        i
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 w-64 rounded-xl border border-border bg-surface2 shadow-xl overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}
