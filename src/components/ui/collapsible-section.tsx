'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  iconColor: 'accent' | 'red' | 'blue' | 'yellow' | 'purple';
  title: string;
  status?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const iconBgMap = {
  accent: 'bg-accent-dim',
  red:    'bg-red-dim',
  blue:   'bg-blue-dim',
  yellow: 'bg-yellow-dim',
  purple: 'bg-purple-dim',
};

export function CollapsibleSection({
  icon, iconColor, title, status, defaultOpen = false, children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-surface2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-md text-sm ${iconBgMap[iconColor]}`}>
          {icon}
        </span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {status && <span className="text-xs text-text2 mr-2">{status}</span>}
        <svg
          className={`w-4 h-4 text-text3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-2 border-t border-border pt-3">
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full flex items-center justify-center py-1 text-text3 hover:text-text2 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
