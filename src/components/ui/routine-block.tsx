'use client';

import { useState } from 'react';

interface RoutineBlockProps {
  type: 'pre' | 'post' | 'putt';
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const badgeStyles = {
  pre:  'bg-blue-dim text-blue border-blue',
  post: 'bg-yellow-dim text-yellow border-yellow',
  putt: 'bg-accent-dim text-accent border-accent',
};

export function RoutineBlock({ type, title, defaultOpen = false, children }: RoutineBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-surface3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className={`text-[9px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${badgeStyles[type]}`}>
          {type}
        </span>
        <span className="text-xs text-text2 flex-1">{title}</span>
        <svg
          className={`w-3.5 h-3.5 text-text3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-1.5 border-t border-border pt-3 space-y-3">
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-center py-0.5 text-text3 hover:text-text2 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
