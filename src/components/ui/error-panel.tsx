import type { ReactNode } from 'react';

interface ErrorPanelProps {
  title:        string;
  description?: string;
  digest?:      string;
  actions?:     ReactNode;
  testId:       string;
}

/** 에러/404 페이지 공용 패널. 서버/클라 어디서나 렌더 가능 (상태 없음). */
export function ErrorPanel({ title, description, digest, actions, testId }: ErrorPanelProps) {
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-surface p-6 text-center space-y-3">
      <p className="text-lg font-bold text-text">{title}</p>
      {description && <p className="text-sm text-text2">{description}</p>}
      {digest && <p className="font-mono text-[10px] text-text3">ref {digest}</p>}
      {actions && <div className="flex justify-center gap-2 pt-1">{actions}</div>}
    </div>
  );
}

export const errorButtonPrimary = 'rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90';
export const errorButtonSecondary = 'rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-medium text-text2 transition hover:border-border2';
